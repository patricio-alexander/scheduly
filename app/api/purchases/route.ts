import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  getDashboardPeriodRange,
  parseDashboardPeriod,
} from "@/shared/utils/dashboard-period";
import {
  calcPurchaseTotal,
  incrementStockForPurchase,
  parsePurchaseLines,
} from "@/shared/utils/inventory-business";
import { toAmount } from "@/shared/utils/money";
import {
  paymentMethodOptions,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";
import { notifyAdminsLowStock } from "@/shared/utils/stock-notify";
import { getUserPrimaryBranchId, resolveDashboardScope, parseBranchId } from "@/shared/utils/branches";
import { checkAuth } from "@/shared/utils/check-auth";
import { invalidateDashboard } from "@/shared/utils/socket";
import {
  isBranchAdminRole,
  isManagementRole,
  isOwnerRole,
} from "@/shared/utils/roles";
import { recordLedgerExpense } from "@/shared/utils/finance-ledger";
import { recordStockMovements } from "@/shared/utils/stock-movement-log";

function parseMethod(value: unknown): PaymentMethodValue {
  const method = String(value ?? "cash");
  return (paymentMethodOptions as readonly string[]).includes(method)
    ? (method as PaymentMethodValue)
    : "cash";
}

async function resolvePurchaseBranchId(
  user: { id: number; role: string },
  requestedBranchId: number | null,
): Promise<number | null> {
  if (isOwnerRole(user.role)) {
    return requestedBranchId && requestedBranchId > 0 ? requestedBranchId : null;
  }

  if (isBranchAdminRole(user.role)) {
    const branchId = await getUserPrimaryBranchId(prisma, user.id);
    if (!branchId) {
      throw new Error("No tienes una sucursal asignada");
    }
    if (requestedBranchId && requestedBranchId !== branchId) {
      throw new Error("No puedes registrar compras en otra sucursal");
    }
    return branchId;
  }

  throw new Error("No autorizado");
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

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

    const purchases = await prisma.purchaseOrder.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(scope.branchId ? { receivedStoreId: scope.branchId } : {}),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        receivedBranch: { select: { id: true, name: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, price: true } },
          },
        },
      },
      orderBy: { date: "desc" },
      take: 200,
    });

    const records = purchases
      .map((purchase) => {
        const products = purchase.lines.map((line) => ({
          id: line.product.id,
          name: line.product.name,
          quantity: line.quantity,
          unitCost: toAmount(line.unitPrice),
        }));
        const amount = products.reduce(
          (sum, p) => sum + toAmount(p.quantity) * p.unitCost,
          0,
        );
        const itemsSummary = products
          .map((p) => (p.quantity > 1 ? `${p.name} ×${p.quantity}` : p.name))
          .join(", ");

        return {
          id: purchase.id,
          amount,
          method: purchase.paymentMethod || "cash",
          purchasedAt: purchase.date.toISOString(),
          notes: purchase.notes ?? "",
          supplier: purchase.supplier
            ? { id: purchase.supplier.id, name: purchase.supplier.name }
            : null,
          staff: { id: 0, name: "—" },
          branch: purchase.receivedBranch
            ? {
                id: purchase.receivedBranch.id,
                name: purchase.receivedBranch.name,
              }
            : null,
          products,
          itemsSummary,
        };
      })
      .filter((record) => {
        if (!q) return true;
        return (
          (record.supplier?.name.toLowerCase().includes(q) ?? false) ||
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
      purchases: records,
    });
  } catch (error) {
    console.error("GET /api/purchases", error);
    return NextResponse.json(
      { message: "Error al obtener compras" },
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
    const lines = parsePurchaseLines(body.lines);
    const totalAmount = calcPurchaseTotal(lines);
    const method = parseMethod(body.method);
    const notes = String(body.notes ?? "").trim();
    const invoiceNumber = String(body.invoiceNumber ?? "")
      .trim()
      .slice(0, 80);
    const supplierIdRaw = body.supplierId;
    const supplierId =
      supplierIdRaw == null || supplierIdRaw === ""
        ? null
        : Number(supplierIdRaw);

    if (supplierId != null && (!Number.isInteger(supplierId) || supplierId <= 0)) {
      return NextResponse.json(
        { message: "Proveedor inválido" },
        { status: 400 },
      );
    }

    if (supplierId == null) {
      return NextResponse.json(
        { message: "Proveedor requerido" },
        { status: 400 },
      );
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) {
      return NextResponse.json(
        { message: "Proveedor no encontrado" },
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

    const purchasedAtRaw = body.purchasedAt;
    const purchasedAt =
      typeof purchasedAtRaw === "string" && purchasedAtRaw.trim()
        ? new Date(purchasedAtRaw)
        : new Date();

    if (Number.isNaN(purchasedAt.getTime())) {
      return NextResponse.json({ message: "Fecha inválida" }, { status: 400 });
    }

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

    const branchId = await resolvePurchaseBranchId(auth.user, requestedBranchId);
    const receiveNow = body.receiveNow === true;
    const payNow = body.payNow === true;

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          supplierId,
          date: purchasedAt,
          notes: notes || null,
          invoiceNumber: invoiceNumber || null,
          status: receiveNow ? "recibido" : "pendiente",
          receivedAt: receiveNow ? new Date() : null,
          receivedStoreId: receiveNow ? branchId : null,
          paidAt: payNow ? purchasedAt : null,
          paymentMethod: payNow ? method : null,
          lines: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitCost,
            })),
          },
        },
        include: {
          supplier: { select: { id: true, name: true, tradeName: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, price: true } },
            },
          },
        },
      });

      if (receiveNow) {
        await incrementStockForPurchase(tx, lines, branchId);
        await recordStockMovements(
          tx,
          auth.user.id,
          "entrada",
          lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            price: l.unitCost,
          })),
          {
            description: `Compra proveedor · PO (recibido)`,
            reason: "compra",
            referenceType: "purchase_order",
            referenceId: created.id,
            date: purchasedAt,
          },
        );
      }

      // Si se paga al comprar → gasto en módulo Finanzas
      if (payNow && totalAmount > 0) {
        const supplierName =
          created.supplier.tradeName?.trim() || created.supplier.name;
        const payment = await tx.supplierOrderPayment.create({
          data: {
            supplierOrderId: created.id,
            supplierId,
            amount: totalAmount,
            method,
            note: notes || `Pago compra PO #${created.id}`,
            date: purchasedAt,
            status: "completed",
            createdBy: auth.user.id,
          },
        });
        const expense = await recordLedgerExpense(tx, {
          amount: totalAmount,
          date: purchasedAt,
          concept: notes || `Compra insumos PO #${created.id}`,
          category: "Compra de insumos",
          createdByAccountId: auth.user.id,
          counterpartyName: supplierName,
          referenceType: "supplier_payment",
          referenceId: payment.id,
        });
        if (expense) {
          await tx.supplierOrderPayment.update({
            where: { id: payment.id },
            data: { expenseId: expense.id },
          });
          await tx.purchaseOrder.update({
            where: { id: created.id },
            data: { financeExpenseId: expense.id },
          });
        }
      }

      return created;
    });

    for (const line of purchase.lines) {
      const updated = await prisma.product.findUnique({
        where: { id: line.productId },
        select: { id: true, name: true, stock: true },
      });
      if (updated) {
        await notifyAdminsLowStock(updated);
      }
    }

    invalidateDashboard("purchase:created");

    return NextResponse.json(
      {
        id: purchase.id,
        amount: totalAmount,
        method: purchase.paymentMethod || method,
        purchasedAt: purchase.date.toISOString(),
        notes: purchase.notes ?? "",
        supplier: purchase.supplier,
        products: purchase.lines.map((line) => ({
          id: line.product.id,
          name: line.product.name,
          quantity: line.quantity,
          unitCost: toAmount(line.unitPrice),
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/purchases", error);
    const message =
      error instanceof Error ? error.message : "Error al registrar la compra";
    return NextResponse.json({ message }, { status: 400 });
  }
}
