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

    const sales = await prisma.productSale.findMany({
      where: {
        paidAt: { gte: start, lte: end },
        ...(scope.branchId ? { branchId: scope.branchId } : {}),
      },
      include: {
        customer: {
          select: { id: true, name: true, lastnames: true },
        },
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, price: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
      take: 200,
    });

    const records = sales
      .map((sale) => {
        const products = sale.lines.map((line) => ({
          id: line.product.id,
          name: line.product.name,
          quantity: line.quantity,
          unitPrice: toAmount(line.unitPrice),
        }));
        const itemsSummary = products
          .map((p) => (p.quantity > 1 ? `${p.name} ×${p.quantity}` : p.name))
          .join(", ");

        return {
          id: sale.id,
          amount: toAmount(sale.amount),
          method: sale.method,
          paidAt: sale.paidAt.toISOString(),
          notes: sale.notes,
          customer: sale.customer
            ? {
                id: sale.customer.id,
                name: `${sale.customer.name} ${sale.customer.lastnames}`.trim(),
              }
            : null,
          staff: { id: sale.user.id, name: sale.user.name },
          branch: sale.branch
            ? { id: sale.branch.id, name: sale.branch.name }
            : null,
          products,
          itemsSummary,
        };
      })
      .filter((record) => {
        if (!q) return true;
        return (
          (record.customer?.name.toLowerCase().includes(q) ?? false) ||
          record.staff.name.toLowerCase().includes(q) ||
          record.itemsSummary.toLowerCase().includes(q) ||
          record.notes.toLowerCase().includes(q) ||
          (record.branch?.name.toLowerCase().includes(q) ?? false)
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
    const method = parseMethod(body.method);
    const notes = String(body.notes ?? "").trim();

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

      return tx.productSale.create({
        data: {
          customerId,
          userId: auth.user.id,
          branchId,
          amount,
          method,
          notes,
          lines: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            })),
          },
        },
        include: {
          customer: {
            select: { id: true, name: true, lastnames: true },
          },
          user: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, price: true } },
            },
          },
        },
      });
    });

    invalidateDashboard("product-sale:created");

    return NextResponse.json(
      {
        id: sale.id,
        amount: toAmount(sale.amount),
        method: sale.method,
        paidAt: sale.paidAt.toISOString(),
        notes: sale.notes,
        customer: sale.customer
          ? {
              id: sale.customer.id,
              name: `${sale.customer.name} ${sale.customer.lastnames}`.trim(),
            }
          : null,
        staff: sale.user,
        branch: sale.branch,
        products: sale.lines.map((line) => ({
          id: line.product.id,
          name: line.product.name,
          quantity: line.quantity,
          unitPrice: toAmount(line.unitPrice),
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
