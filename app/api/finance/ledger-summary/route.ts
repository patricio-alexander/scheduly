import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";
import { isManagementRole } from "@/shared/utils/roles";
import { buildPendingCollectionsBreakdown } from "@/shared/utils/collections-pending";
import {
  listFinanceExpenses,
  listFinanceIncomes,
  sumLedgerAmounts,
} from "@/shared/utils/finance-ledger-list";
import { splitExpenseBuckets } from "@/shared/utils/finance-period-totals";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-EC", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Resumen financiero (ledger + ventas/citas/compras operativas).
 * GET /api/finance/ledger-summary
 */
export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const [
      incomeRows,
      expenseRows,
      sales,
      groups,
      payments,
      customers,
      obligations,
    ] = await Promise.all([
      listFinanceIncomes(5000),
      listFinanceExpenses(5000),
      prisma.sale.findMany({
        where: { status: { in: ["pendiente", "entregado", "pagado"] } },
        select: {
          id: true,
          customerId: true,
          date: true,
          lines: {
            select: {
              id: true,
              quantity: true,
              price: true,
              damagedQty: true,
              giftQty: true,
              paidAt: true,
              itemGroupItems: { select: { groupId: true } },
            },
          },
        },
      }),
      prisma.itemGroup.findMany({
        select: {
          id: true,
          customerId: true,
          concept: true,
          status: true,
        },
      }),
      prisma.financePayment.findMany({
        select: { groupId: true, amount: true, status: true },
      }),
      prisma.customer.findMany({
        select: {
          id: true,
          name: true,
          firstLastName: true,
          secondLastName: true,
        },
      }),
      prisma.financialObligation.findMany({
        where: {
          OR: [{ status: null }, { status: { not: "closed" } }],
        },
        select: {
          direction: true,
          originalAmount: true,
          status: true,
          payments: { select: { amount: true, status: true } },
        },
      }),
    ]);

    const totalIncome = sumLedgerAmounts(incomeRows);
    const totalExpense = sumLedgerAmounts(expenseRows);
    const expenseBuckets = splitExpenseBuckets(expenseRows);
    const balance = Number((totalIncome - totalExpense).toFixed(2));

    const customerRows = customers.map((c) => ({
      id: c.id,
      name: [c.name, c.firstLastName, c.secondLastName]
        .filter(Boolean)
        .join(" "),
    }));

    const orders = sales.map((sale) => ({
      id: sale.id,
      customerId: sale.customerId,
      date: sale.date.toISOString(),
      items: sale.lines.map((l) => ({
        id: l.id,
        quantity: l.quantity,
        price: toAmount(l.price),
        damagedQty: l.damagedQty,
        giftQty: l.giftQty,
        paidAt: l.paidAt?.toISOString() ?? null,
        groupId: l.itemGroupItems[0]?.groupId ?? null,
      })),
    }));

    const pending = buildPendingCollectionsBreakdown({
      customers: customerRows,
      orders,
      groups,
      payments: payments.map((p) => ({
        groupId: p.groupId,
        amount: toAmount(p.amount),
        status: p.status,
      })),
    });

    const futureIncome = pending.futureIncome;

    let loansReceivable = 0;
    let debtsPayable = 0;
    for (const o of obligations) {
      if (o.status === "closed" || o.status === "cancelled") continue;
      const paid = o.payments
        .filter((p) => !p.status || p.status === "completed")
        .reduce((s, p) => s + toAmount(p.amount), 0);
      const rem = Math.max(0, toAmount(o.originalAmount) - paid);
      const dir = String(o.direction || "").toLowerCase();
      if (dir.includes("receiv") || dir.includes("cobrar") || dir === "in") {
        loansReceivable += rem;
      } else {
        debtsPayable += rem;
      }
    }

    const projectedBalance = Number(
      (balance + futureIncome + loansReceivable - debtsPayable).toFixed(2),
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const monthIncome = incomeRows
      .filter((i) => {
        const d = new Date(i.date);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((s, i) => s + toAmount(i.amount), 0);
    const monthExpense = expenseRows
      .filter((e) => {
        const d = new Date(e.date);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((s, e) => s + toAmount(e.amount), 0);
    const monthBalance = Number((monthIncome - monthExpense).toFixed(2));
    const monthMarginPct =
      monthIncome > 0
        ? Number(((monthBalance / monthIncome) * 100).toFixed(1))
        : 0;
    const monthBalanceWithPending = Number(
      (monthBalance + futureIncome).toFixed(2),
    );
    const monthMarginWithPendingPct =
      monthIncome + futureIncome > 0
        ? Number(
            (
              (monthBalanceWithPending / (monthIncome + futureIncome)) *
              100
            ).toFixed(1),
          )
        : 0;

    const byMonth = new Map<string, { income: number; expense: number }>();
    for (const i of incomeRows) {
      const k = monthKey(new Date(i.date));
      const row = byMonth.get(k) ?? { income: 0, expense: 0 };
      row.income += toAmount(i.amount);
      byMonth.set(k, row);
    }
    for (const e of expenseRows) {
      const k = monthKey(new Date(e.date));
      const row = byMonth.get(k) ?? { income: 0, expense: 0 };
      row.expense += toAmount(e.amount);
      byMonth.set(k, row);
    }
    let bestMonthBalance = 0;
    let bestMonthKey = "";
    for (const [k, v] of byMonth) {
      const bal = v.income - v.expense;
      if (bal > bestMonthBalance) {
        bestMonthBalance = bal;
        bestMonthKey = k;
      }
    }
    const currentKey = monthKey(now);
    const vsRecordPct =
      bestMonthBalance > 0
        ? Number(((monthBalance / bestMonthBalance) * 100).toFixed(1))
        : 0;

    return NextResponse.json({
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      purchases: expenseBuckets.purchases,
      commissions: expenseBuckets.commissions,
      operatingExpenses: expenseBuckets.operating,
      balance,
      futureIncome,
      projectedBalance,
      loansReceivable: Number(loansReceivable.toFixed(2)),
      debtsPayable: Number(debtsPayable.toFixed(2)),
      monthIncome: Number(monthIncome.toFixed(2)),
      monthExpense: Number(monthExpense.toFixed(2)),
      monthBalance,
      monthMarginPct,
      monthBalanceWithPending,
      monthMarginWithPendingPct,
      bestMonthBalance: Number(bestMonthBalance.toFixed(2)),
      bestMonthLabel: bestMonthKey ? monthLabel(bestMonthKey) : "—",
      vsRecordPct,
      isRecordMonth: currentKey === bestMonthKey && monthBalance > 0,
      monthLabel: monthLabel(currentKey),
      pendingByCustomer: pending.byCustomer,
      incomeCount: incomeRows.length,
      expenseCount: expenseRows.length,
    });
  } catch (error) {
    console.error("GET /api/finance/ledger-summary", error);
    return NextResponse.json(
      { message: "Error al obtener resumen financiero" },
      { status: 500 },
    );
  }
}
