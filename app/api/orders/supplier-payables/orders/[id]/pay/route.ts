import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";
import { isManagementRole } from "@/shared/utils/roles";

/** Abonar pedido proveedor → SupplierOrderPayment + Expense. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const orderId = Number((await params).id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ message: "Pedido inválido" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: "Monto inválido" }, { status: 400 });
    }
    const method = String(body.method ?? "efectivo").trim() || "efectivo";
    const note = String(body.note ?? "Abono proveedor").trim();
    const dateRaw = body.date ? new Date(String(body.date)) : new Date();
    const date = Number.isNaN(dateRaw.getTime()) ? new Date() : dateRaw;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        supplier: { select: { id: true, name: true, tradeName: true } },
        lines: { select: { quantity: true, unitPrice: true } },
        payments: { where: { status: "completed" }, select: { amount: true } },
      },
    });
    if (!po) {
      return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });
    }

    const total = po.lines.reduce(
      (s, l) => s + toAmount(l.quantity) * toAmount(l.unitPrice),
      0,
    );
    const paid = po.payments.reduce((s, p) => s + toAmount(p.amount), 0);
    const remaining = Math.max(0, total - paid);
    if (amount > remaining + 0.01) {
      return NextResponse.json(
        { message: `El abono supera el saldo (${remaining.toFixed(2)})` },
        { status: 400 },
      );
    }

    const supplierName = po.supplier.tradeName?.trim() || po.supplier.name;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.supplierOrderPayment.create({
        data: {
          supplierOrderId: orderId,
          supplierId: po.supplierId,
          amount,
          method,
          note,
          date,
          status: "completed",
          createdBy: auth.user.id,
        },
      });

      const expense = await tx.expense.create({
        data: {
          amount,
          date,
          concept: note || `Pago proveedor PO #${orderId}`,
          category: "Compra de insumos",
          status: "paid",
          referenceType: "supplier_payment",
          referenceId: payment.id,
          counterpartyName: supplierName,
          createdBy: auth.user.id,
        },
      });

      await tx.supplierOrderPayment.update({
        where: { id: payment.id },
        data: { expenseId: expense.id },
      });

      const newPaid = paid + amount;
      if (newPaid >= total - 0.01) {
        await tx.purchaseOrder.update({
          where: { id: orderId },
          data: {
            paidAt: date,
            paymentMethod: method,
            financeExpenseId: expense.id,
          },
        });
      }

      return { paymentId: payment.id, expenseId: expense.id };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST supplier-payables pay", error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Error al abonar",
      },
      { status: 400 },
    );
  }
}
