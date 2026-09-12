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
import { resolvePaymentMedium } from "@/shared/utils/payment-media";
import {
  getUserPrimaryBranchId,
  parseBranchId,
  resolveDashboardScope,
} from "@/shared/utils/branches";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  isManagementRole,
  isOwnerRole,
  isPureEmployeeRole,
} from "@/shared/utils/roles";
import { invalidateDashboard } from "@/shared/utils/socket";
import { getCashRegisterMode } from "@/shared/utils/business-settings";
import { recordLedgerIncome } from "@/shared/utils/finance-ledger";
import { recordStockMovements } from "@/shared/utils/stock-movement-log";
import { parseSaleCreditInstallments } from "@/shared/utils/sale-credit-installments";

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

  const canSell =
    isManagementRole(auth.user.role) || isPureEmployeeRole(auth.user.role);
  if (!canSell) {
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
    const methodResolved = await resolvePaymentMedium(prisma, {
      method: body.method != null ? String(body.method) : "cash",
      mediumCode:
        body.mediumCode != null
          ? String(body.mediumCode)
          : body.paymentMediumCode != null
            ? String(body.paymentMediumCode)
            : null,
      paymentMediumId:
        body.paymentMediumId != null && body.paymentMediumId !== ""
          ? Number(body.paymentMediumId)
          : null,
    });
    const method = parseMethod(methodResolved.method);
    const notesRaw = String(body.notes ?? "").trim();
    const saleType =
      String(body.saleType ?? "contado") === "credito" ? "credito" : "contado";
    const documentType = String(body.documentType ?? "documento").trim() || "documento";
    const isCredit = saleType === "credito";
    const notesParts = ["[CAJA_POS]", isCredit ? "[CREDITO]" : "[CONTADO]"];
    if (documentType) notesParts.push(`[DOC:${documentType}]`);
    if (methodResolved.medium) {
      notesParts.push(
        `[MEDIO:${methodResolved.medium.code || methodResolved.medium.id}]`,
        methodResolved.medium.name,
      );
    }
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

    const cashMode = await getCashRegisterMode();
    const openShiftWhere =
      cashMode === "employee_own"
        ? { storeId: branchId, status: "open" as const, accountId: auth.user.id }
        : { storeId: branchId, status: "open" as const };

    const openShift = await prisma.cashShift.findFirst({
      where: openShiftWhere,
      orderBy: { id: "desc" },
      select: { id: true, activeCashRegisterId: true },
    });

    if (!openShift) {
      return NextResponse.json(
        {
          message:
            cashMode === "employee_own"
              ? "Debes abrir tu turno de caja antes de vender"
              : "No hay turno de caja abierto en la sucursal",
        },
        { status: 400 },
      );
    }

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

    if (isCredit && (customerId == null || !Number.isInteger(customerId))) {
      return NextResponse.json(
        { message: "En venta a crédito debés elegir un cliente" },
        { status: 400 },
      );
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

      await recordStockMovements(
        tx,
        auth.user.id,
        "salida",
        lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          price: l.unitPrice,
        })),
        {
          description: "Venta POS",
          reason: "venta",
          referenceType: "sale_pending",
          date: body.paidAt ? new Date(String(body.paidAt)) : new Date(),
        },
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

      const paidAtRaw = body.paidAt ? new Date(String(body.paidAt)) : new Date();
      const paidAt = Number.isNaN(paidAtRaw.getTime()) ? new Date() : paidAtRaw;

      const created = await tx.sale.create({
        data: {
          customerId: walkIn,
          sellerAccountId: auth.user.id,
          status: isCredit ? "pendiente" : "pagado",
          paymentMethod: isCredit ? "credito" : method,
          paymentMediumId: isCredit
            ? null
            : methodResolved.medium?.id ?? null,
          documentType,
          notes: notes || null,
          paidAt: isCredit ? null : paidAt,
          date: paidAt,
          shiftId: openShift.id,
          cashRegisterId: openShift.activeCashRegisterId ?? null,
          lines: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              price: line.unitPrice,
              soldQty: line.quantity,
              deliveredStoreId: branchId,
              deliveredAt: paidAt,
              paidAt: isCredit ? null : paidAt,
            })),
          },
          ...(isCredit
            ? {
                installments: {
                  create: parseSaleCreditInstallments(
                    body.installments,
                    calcProductSaleTotal(lines),
                  ).map((i) => ({
                    sequence: i.sequence,
                    dueDate: i.dueDate,
                    amount: i.amount,
                    notes: i.notes,
                  })),
                },
              }
            : {}),
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

      if (!isCredit) {
        const saleAmount = calcProductSaleTotal(lines);
        if (saleAmount > 0) {
          const income = await recordLedgerIncome(tx, {
            amount: saleAmount,
            date: paidAt,
            concept: `Venta POS #${created.id}`,
            category: "Venta POS",
            createdByAccountId: auth.user.id,
            counterpartyName: created.customer?.name ?? null,
            referenceType: "sale",
            referenceId: created.id,
          });
          if (income) {
            await tx.sale.update({
              where: { id: created.id },
              data: { financeIncomeId: income.id },
            });
          }
        }
      }

      return created;
    });

    invalidateDashboard("product-sale:created");

    try {
      const sri = await prisma.sriBillingSettings.findUnique({
        where: { id: 1 },
      });
      if (
        sri?.enabled &&
        sri.certificateRelativePath &&
        sri.certificatePasswordEnc
      ) {
        const { createInvoiceFromProductSale } = await import(
          "@/src/features/electronic-docs/services/invoice-service"
        );
        await createInvoiceFromProductSale(prisma, sale.id);
      }
    } catch (invoiceError) {
      console.error("Auto facturación SRI (POS)", invoiceError);
    }

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
