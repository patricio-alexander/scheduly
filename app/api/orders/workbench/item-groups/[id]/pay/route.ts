import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";
import { isManagementRole } from "@/shared/utils/roles";
import { lineTotal } from "@/shared/utils/collections-pending";

/** Abonar a un grupo de cobro → FinancePayment + Income. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const groupId = Number((await params).id);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return NextResponse.json({ message: "Grupo inválido" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: "Monto inválido" }, { status: 400 });
    }
    const method = String(body.method ?? "efectivo").trim() || "efectivo";
    const note = String(body.note ?? "Abono").trim() || "Abono";
    const dateRaw = body.date ? new Date(String(body.date)) : new Date();
    const date = Number.isNaN(dateRaw.getTime()) ? new Date() : dateRaw;

    const group = await prisma.itemGroup.findUnique({
      where: { id: groupId },
      include: {
        items: {
          include: {
            saleLine: {
              select: {
                id: true,
                quantity: true,
                damagedQty: true,
                giftQty: true,
                price: true,
                paidAt: true,
              },
            },
          },
        },
        payments: { where: { status: "completed" }, select: { amount: true } },
        customer: {
          select: { name: true, firstLastName: true, secondLastName: true },
        },
      },
    });
    if (!group) {
      return NextResponse.json({ message: "Grupo no encontrado" }, { status: 404 });
    }

    const groupTotal = group.items.reduce(
      (s, it) =>
        s +
        lineTotal({
          quantity: it.saleLine.quantity,
          damagedQty: it.saleLine.damagedQty,
          giftQty: it.saleLine.giftQty,
          price: it.saleLine.price,
        }),
      0,
    );
    const alreadyPaid = group.payments.reduce(
      (s, p) => s + toAmount(p.amount),
      0,
    );
    const remaining = Math.max(0, groupTotal - alreadyPaid);
    if (amount > remaining + 0.01) {
      return NextResponse.json(
        { message: `El abono supera el saldo (${remaining.toFixed(2)})` },
        { status: 400 },
      );
    }

    const customerName = [
      group.customer.name,
      group.customer.firstLastName,
      group.customer.secondLastName,
    ]
      .filter(Boolean)
      .join(" ");

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.financePayment.create({
        data: {
          customerId: group.customerId,
          groupId,
          amount,
          method,
          note,
          date,
          status: "completed",
          createdBy: auth.user.id,
        },
      });

      const income = await tx.income.create({
        data: {
          amount,
          date,
          concept: note || `Abono grupo #${groupId}`,
          category: "Venta",
          status: "paid",
          referenceType: "finance_payment",
          referenceId: payment.id,
          counterpartyName: customerName,
          createdBy: auth.user.id,
        },
      });

      const newPaid = alreadyPaid + amount;
      const fullyPaid = newPaid >= groupTotal - 0.01;
      if (fullyPaid) {
        await tx.itemGroup.update({
          where: { id: groupId },
          data: { status: "paid" },
        });
        const lineIds = group.items.map((i) => i.saleLine.id);
        await tx.saleLine.updateMany({
          where: { id: { in: lineIds }, paidAt: null },
          data: { paidAt: date },
        });
      } else if (newPaid > 0 && group.status === "open") {
        await tx.itemGroup.update({
          where: { id: groupId },
          data: { status: "partial" },
        });
      }

      return { paymentId: payment.id, incomeId: income.id, fullyPaid };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders/workbench/item-groups/[id]/pay", error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Error al abonar",
      },
      { status: 400 },
    );
  }
}
