import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { deductBranchStock } from "@/shared/utils/branch-stock";
import {
  getDashboardPeriodRange,
  parseDashboardPeriod,
} from "@/shared/utils/dashboard-period";
import {
  calcProductSaleTotal,
  parseProductSaleLines,
} from "@/shared/utils/product-sale-business";
import { toAmount } from "@/shared/utils/money";
import {
  paymentMethodOptions,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";
import {
  getUserPrimaryBranchId,
  parseBranchId,
  resolveDashboardScope,
} from "@/shared/utils/branches";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole, isOwnerRole } from "@/shared/utils/roles";
import { invalidateDashboard } from "@/shared/utils/socket";

function parseMethod(value: unknown): PaymentMethodValue {
  const method = String(value ?? "cash");
  return (paymentMethodOptions as readonly string[]).includes(method)
    ? (method as PaymentMethodValue)
    : "cash";
}

async function resolveSaleBranchId(
  user: { id: number; role: string },
  requestedBranchId: number | null,
): Promise<number> {
  if (isOwnerRole(user.role)) {
    if (!requestedBranchId) {
      throw new Error("Selecciona la sucursal de la venta");
    }
    const branch = await prisma.branch.findFirst({
      where: { id: requestedBranchId, isActive: true },
      select: { id: true },
    });
    if (!branch) throw new Error("Sucursal inválida");
    return branch.id;
  }

  const branchId = await getUserPrimaryBranchId(prisma, user.id);
  if (!branchId) {
    throw new Error("No tienes una sucursal asignada");
  }
  if (requestedBranchId && requestedBranchId !== branchId) {
    throw new Error("No puedes registrar ventas en otra sucursal");
  }
  return branchId;
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const period = parseDashboardPeriod(url.searchParams.get("period"));
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const requestedBranchId = parseBranchId(url.searchParams.get("branchId"));
    const { start, end } = getDashboardPeriodRange(period);

    const scope = await resolveDashboardScope(
      prisma,
      auth.user,
      requestedBranchId,
    );

    const sales = await prisma.sale.findMany({
      where: {
        OR: [
          { paidAt: { gte: start, lte: end } },
          { paidAt: null, date: { gte: start, lte: end }, status: "pagado" },
        ],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            firstLastName: true,
            secondLastName: true,
          },
        },
        seller: { select: { id: true, username: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, price: true } },
          },
        },
      },
      orderBy: [{ paidAt: "desc" }, { date: "desc" }],
      take: 200,
    });

    const records = sales
      .map((sale) => {
        const products = sale.lines.map((line) => ({
          id: line.product.id,
          name: line.product.name,
          quantity: line.quantity,
          unitPrice: toAmount(line.price),
        }));
        const amount = products.reduce(
          (sum, p) => sum + toAmount(p.quantity) * p.unitPrice,
          0,
        );
        const itemsSummary = products
          .map((p) => (p.quantity > 1 ? `${p.name} ×${p.quantity}` : p.name))
          .join(", ");
        const customerName = [
          sale.customer.name,
          sale.customer.firstLastName,
          sale.customer.secondLastName,
        ]
          .filter(Boolean)
          .join(" ");
        const at = sale.paidAt ?? sale.date;

        return {
          id: sale.id,
          amount,
          method: sale.paymentMethod || "cash",
          paidAt: at.toISOString(),
          notes: sale.notes ?? "",
          customer: {
            id: sale.customer.id,
            name: customerName,
          },
          staff: {
            id: sale.seller?.id ?? 0,
            name: sale.seller?.username ?? "—",
          },
          branch: null as { id: number; name: string } | null,
          products,
          itemsSummary,
        };
      })
      .filter((record) => {
        if (!q) return true;
        return (
          record.customer.name.toLowerCase().includes(q) ||
          record.staff.name.toLowerCase().includes(q) ||
          record.itemsSummary.toLowerCase().includes(q) ||
          record.notes.toLowerCase().includes(q)
        );
      });

    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
    const byMethod = paymentMethodOptions.map((m) => ({
      method: m,
      count: records.filter((r) => r.method === m).length,
      amount: records
        .filter((r) => r.method === m)
        .reduce((sum, r) => sum + r.amount, 0),
    }));

    return NextResponse.json({
      period,
      totalCount: records.length,
      totalAmount,
      byMethod,
      sales: records,
    });
  } catch (error) {
    console.error("GET /api/product-sales", error);
    return NextResponse.json(
      { message: "Error al obtener ventas de productos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const lines = parseProductSaleLines(body.lines);
    const amount = calcProductSaleTotal(lines);
    if (amount <= 0) {
      return NextResponse.json(
        { message: "Agrega al menos un producto con cantidad y precio" },
        { status: 400 },
      );
    }
    const method = parseMethod(body.method);
    const notesRaw = String(body.notes ?? "").trim();
    const saleType =
      String(body.saleType ?? "contado") === "credito" ? "credito" : "contado";
    const documentType = String(body.documentType ?? "documento").trim() || "documento";
    const isCredit = saleType === "credito";
    const notesParts = ["[CAJA_POS]", isCredit ? "[CREDITO]" : "[CONTADO]"];
    if (documentType) notesParts.push(`[DOC:${documentType}]`);
    if (notesRaw) notesParts.push(notesRaw);
    const notes = notesParts.join(" ");

    const branchIdRaw = body.branchId;
    const requestedBranchId =
      branchIdRaw == null || branchIdRaw === ""
        ? null
        : Number(branchIdRaw);

    if (
      requestedBranchId != null &&
      (!Number.isInteger(requestedBranchId) || requestedBranchId <= 0)
    ) {
      return NextResponse.json({ message: "Sucursal inválida" }, { status: 400 });
    }

    const branchId = await resolveSaleBranchId(auth.user, requestedBranchId);

    const customerIdRaw = body.customerId;
    const customerId =
      customerIdRaw == null || customerIdRaw === "" || customerIdRaw === "none"
        ? null
        : Number(customerIdRaw);

    if (customerId != null && (!Number.isInteger(customerId) || customerId <= 0)) {
      return NextResponse.json({ message: "Cliente inválido" }, { status: 400 });
    }

    if (customerId != null) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer) {
        return NextResponse.json(
          { message: "Cliente no encontrado" },
          { status: 400 },
        );
      }
    }

    for (const line of lines) {
      const product = await prisma.product.findUnique({
        where: { id: line.productId },
        select: { id: true },
      });
      if (!product) {
        return NextResponse.json(
          { message: "Producto no encontrado" },
          { status: 400 },
        );
      }
    }

    const sale = await prisma.$transaction(async (tx) => {
      await deductBranchStock(
        tx,
        branchId,
        lines.map(({ productId, quantity }) => ({ productId, quantity })),
      );

      const walkIn =
        customerId ??
        (
          await tx.customer.findFirst({
            where: { name: { contains: "Consumidor Final" } },
            select: { id: true },
          })
        )?.id ??
        (await tx.customer.findFirst({ select: { id: true } }))?.id;

      if (!walkIn) {
        throw new Error("No hay clientes en la BD; crea uno antes de vender");
      }

      const openShift = await tx.cashShift.findFirst({
        where: { storeId: branchId, status: "open" },
        orderBy: { id: "desc" },
        select: { id: true, activeCashRegisterId: true },
      });

      return tx.sale.create({
        data: {
          customerId: walkIn,
          sellerAccountId: auth.user.id,
          status: isCredit ? "pendiente" : "pagado",
          paymentMethod: isCredit ? "credito" : method,
          documentType,
          notes: notes || null,
          paidAt: isCredit ? null : new Date(),
          date: new Date(),
          shiftId: openShift?.id ?? null,
          cashRegisterId: openShift?.activeCashRegisterId ?? null,
          lines: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              price: line.unitPrice,
              soldQty: line.quantity,
              deliveredStoreId: branchId,
              deliveredAt: new Date(),
              paidAt: isCredit ? null : new Date(),
            })),
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              firstLastName: true,
              secondLastName: true,
            },
          },
          seller: { select: { id: true, username: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, price: true } },
            },
          },
        },
      });
    });

    invalidateDashboard("product-sale:created");

    const amountPaid = sale.lines.reduce(
      (sum, line) => sum + toAmount(line.quantity) * toAmount(line.price),
      0,
    );

    return NextResponse.json(
      {
        id: sale.id,
        amount: amountPaid,
        method: sale.paymentMethod || method,
        paidAt: (sale.paidAt ?? sale.date).toISOString(),
        notes: sale.notes ?? "",
        customer: {
          id: sale.customer.id,
          name: [sale.customer.name, sale.customer.firstLastName]
            .filter(Boolean)
            .join(" "),
        },
        staff: {
          id: sale.seller?.id ?? auth.user.id,
          name: sale.seller?.username ?? auth.user.username,
        },
        branch: { id: branchId, name: "" },
        products: sale.lines.map((line) => ({
          id: line.product.id,
          name: line.product.name,
          quantity: line.quantity,
          unitPrice: toAmount(line.price),
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/product-sales", error);
    const message =
      error instanceof Error ? error.message : "Error al registrar la venta";
    return NextResponse.json({ message }, { status: 400 });
  }
}
