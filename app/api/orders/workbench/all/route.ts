import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";
import {
  buildPendingCollectionsBreakdown,
  getBillableQty,
  lineTotal,
} from "@/shared/utils/collections-pending";

/** GET /api/orders/workbench/all — mesa de cobranzas clientes (EdDeli). */
export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const [customers, sales, groups, payments, installments] =
      await Promise.all([
        prisma.customer.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            firstLastName: true,
            secondLastName: true,
            phone: true,
            cedula: true,
          },
          orderBy: { name: "asc" },
        }),
        prisma.sale.findMany({
          where: { status: { in: ["pendiente", "entregado", "pagado"] } },
          include: {
            lines: {
              include: {
                product: { select: { id: true, name: true } },
                itemGroupItems: { select: { groupId: true } },
              },
            },
          },
          orderBy: { date: "desc" },
          take: 2000,
        }),
        prisma.itemGroup.findMany({
          include: {
            items: { select: { orderItemId: true } },
            payments: {
              select: {
                id: true,
                amount: true,
                date: true,
                method: true,
                note: true,
                status: true,
              },
            },
          },
          orderBy: { id: "desc" },
        }),
        prisma.financePayment.findMany({
          orderBy: { date: "desc" },
          take: 2000,
        }),
        prisma.salePaymentInstallment.findMany({
          include: {
            sale: {
              select: {
                id: true,
                customerId: true,
                customer: {
                  select: {
                    id: true,
                    name: true,
                    firstLastName: true,
                    secondLastName: true,
                  },
                },
                paidAt: true,
                status: true,
              },
            },
          },
          orderBy: { dueDate: "asc" },
          take: 500,
        }),
      ]);

    const customerRows = customers.map((c) => ({
      id: c.id,
      name: [c.name, c.firstLastName, c.secondLastName]
        .filter(Boolean)
        .join(" "),
      phone: c.phone,
      cedula: c.cedula,
    }));

    const orders = sales.map((sale) => ({
      id: sale.id,
      customerId: sale.customerId,
      date: sale.date.toISOString(),
      status: sale.status,
      notes: sale.notes,
      items: sale.lines.map((l) => {
        const groupId = l.itemGroupItems[0]?.groupId ?? null;
        const billable = getBillableQty(l);
        return {
          id: l.id,
          orderId: sale.id,
          productId: l.productId,
          product: l.product.name,
          name: l.product.name,
          quantity: l.quantity,
          qty: l.quantity,
          soldQty: l.soldQty,
          damagedQty: l.damagedQty,
          giftQty: l.giftQty,
          replacedQty: l.replacedQty,
          price: toAmount(l.price),
          billableQty: billable,
          lineTotal: lineTotal(l),
          paidAt: l.paidAt?.toISOString() ?? null,
          deliveredAt: l.deliveredAt?.toISOString() ?? null,
          groupId,
          inGroup: groupId != null,
        };
      }),
    }));

    const groupsPayload = groups.map((g) => {
      const itemIds = g.items.map((i) => i.orderItemId);
      let total = 0;
      for (const o of orders) {
        for (const it of o.items) {
          if (itemIds.includes(it.id)) total += it.lineTotal;
        }
      }
      const paid = g.payments
        .filter((p) => p.status === "completed")
        .reduce((s, p) => s + toAmount(p.amount), 0);
      return {
        id: g.id,
        customerId: g.customerId,
        concept: g.concept,
        status: g.status,
        totalAmount: Number(total.toFixed(2)),
        paidAmount: Number(paid.toFixed(2)),
        remainingAmount: Number(Math.max(0, total - paid).toFixed(2)),
        itemIds,
        payments: g.payments.map((p) => ({
          id: p.id,
          amount: toAmount(p.amount),
          date: p.date.toISOString(),
          method: p.method,
          note: p.note,
          status: p.status,
          groupId: g.id,
        })),
      };
    });

    const paymentsPayload = payments.map((p) => ({
      id: p.id,
      customerId: p.customerId,
      groupId: p.groupId,
      amount: toAmount(p.amount),
      date: p.date.toISOString(),
      method: p.method,
      note: p.note,
      status: p.status,
    }));

    const pending = buildPendingCollectionsBreakdown({
      customers: customerRows,
      orders,
      groups: groupsPayload,
      payments: paymentsPayload,
    });

    const credits = installments
      .filter((i) => i.sale && !i.sale.paidAt && i.sale.status !== "pagado")
      .map((i) => {
        const name = [
          i.sale.customer.name,
          i.sale.customer.firstLastName,
          i.sale.customer.secondLastName,
        ]
          .filter(Boolean)
          .join(" ");
        return {
          id: i.id,
          orderId: i.sale.id,
          customerId: i.sale.customerId,
          customerName: name,
          dueDate: i.dueDate.toISOString().slice(0, 10),
          amount: toAmount(i.amount),
          sequence: i.sequence,
        };
      });

    return NextResponse.json({
      customers: customerRows,
      orders,
      groups: groupsPayload,
      payments: paymentsPayload,
      credits,
      pendingByCustomer: pending.byCustomer,
      futureIncome: pending.futureIncome,
    });
  } catch (error) {
    console.error("GET /api/orders/workbench/all", error);
    return NextResponse.json(
      { message: "Error al cargar cobranzas" },
      { status: 500 },
    );
  }
}
