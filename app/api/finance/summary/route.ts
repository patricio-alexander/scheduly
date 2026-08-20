import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  getDashboardPeriodRange,
  parseDashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { parseBranchId, resolveDashboardScope } from "@/shared/utils/branches";
import { sharePct } from "@/shared/utils/finance-revenue";
import { toAmount } from "@/shared/utils/money";
import {
  paymentMethodLabel,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import {
  fetchExpensesInRange,
  fetchIncomesInRange,
  fetchPurchaseOrdersInRange,
  purchaseLinesTotal,
  saleLinesTotal,
} from "@/shared/utils/finance-eddeli";

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const period = parseDashboardPeriod(url.searchParams.get("period"));
    const requestedBranchId = parseBranchId(url.searchParams.get("branchId"));
    const { start, end } = getDashboardPeriodRange(period);

    const scope = await resolveDashboardScope(
      prisma,
      auth.user,
      requestedBranchId,
    );
    const branchId = scope.branchId;

    const [incomes, expenses, purchases, sales, branches] = await Promise.all([
      fetchIncomesInRange(start, end),
      fetchExpensesInRange(start, end),
      fetchPurchaseOrdersInRange(start, end),
      prisma.sale.findMany({
        where: {
          OR: [
            { paidAt: { gte: start, lte: end } },
            { paidAt: null, date: { gte: start, lte: end }, status: "pagado" },
          ],
        },
        select: {
          id: true,
          paymentMethod: true,
          paidAt: true,
          date: true,
          lines: { select: { quantity: true, price: true } },
        },
      }),
      prisma.branch.findMany({
        where: {
          isActive: true,
          ...(branchId ? { id: branchId } : {}),
        },
        orderBy: { position: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    const incomeTotal = incomes.reduce((s, r) => s + toAmount(r.amount), 0);
    const expenseTotal = expenses.reduce((s, r) => s + toAmount(r.amount), 0);
    const purchaseTotal = purchases.reduce(
      (s, p) => s + purchaseLinesTotal(p.lines),
      0,
    );

    // Ventas POS (complemento / desglose); el ingreso principal viene de Income EdDeli
    let directProductSalesTotal = 0;
    const revenueByMethod = new Map<string, number>();
    for (const sale of sales) {
      const amount = saleLinesTotal(sale.lines);
      directProductSalesTotal += amount;
      const method = sale.paymentMethod || "cash";
      revenueByMethod.set(method, (revenueByMethod.get(method) ?? 0) + amount);
    }

    // Preferir Income (EdDeli) como revenue total si hay filas; si no, ventas
    const revenue =
      incomes.length > 0 ? incomeTotal : directProductSalesTotal;
    const commissionTotal = 0;
    const netIncome = revenue - expenseTotal - purchaseTotal - commissionTotal;

    // Si Income cubre ventas, no sumar de nuevo las sales en breakdown
    const salesFromIncome = incomes.filter(
      (i) =>
        (i.referenceType ?? "").toLowerCase() === "order" ||
        (i.category ?? "").toLowerCase() === "sales",
    );
    const appointmentIncome = incomes.filter(
      (i) =>
        (i.referenceType ?? "").toLowerCase() !== "order" &&
        (i.category ?? "").toLowerCase() !== "sales",
    );
    const salesIncomeAmount = salesFromIncome.reduce(
      (s, r) => s + toAmount(r.amount),
      0,
    );
    const otherIncomeAmount = appointmentIncome.reduce(
      (s, r) => s + toAmount(r.amount),
      0,
    );

    for (const row of incomes) {
      const method = "cash";
      revenueByMethod.set(
        method,
        (revenueByMethod.get(method) ?? 0) + toAmount(row.amount),
      );
    }

    const revenueByMethodList = [...revenueByMethod.entries()]
      .map(([method, amount]) => ({
        method,
        label: paymentMethodLabel[method as PaymentMethodValue] ?? method,
        amount,
        sharePct: sharePct(amount, revenue),
      }))
      .sort((a, b) => b.amount - a.amount);

    const byBranch = branches.map((branch) => ({
      branchId: branch.id,
      branchName: branch.name,
      revenue: 0,
      appointmentRevenue: 0,
      directProductSales: 0,
      expenses: 0,
      commissions: 0,
      purchases: purchases
        .filter((p) => p.receivedStoreId === branch.id)
        .reduce((s, p) => s + purchaseLinesTotal(p.lines), 0),
      net: 0,
      appointments: 0,
    }));

    const expensesByCategory = Object.values(
      expenses.reduce(
        (acc, expense) => {
          const key = expense.category?.trim() || "Sin categoría";
          if (!acc[key]) {
            acc[key] = { categoryId: 0, name: key, amount: 0, count: 0 };
          }
          acc[key].amount += toAmount(expense.amount);
          acc[key].count += 1;
          return acc;
        },
        {} as Record<
          string,
          { categoryId: number; name: string; amount: number; count: number }
        >,
      ),
    ).map((row, idx) => ({ ...row, categoryId: idx + 1 }));

    return NextResponse.json({
      period,
      branchId,
      revenue,
      expenses: expenseTotal,
      purchases: purchaseTotal,
      commissions: commissionTotal,
      netIncome,
      revenueBreakdown: {
        appointmentPayments: {
          amount: otherIncomeAmount,
          count: appointmentIncome.length,
          servicesAmount: otherIncomeAmount,
          productsAmount: 0,
          sharePct: sharePct(otherIncomeAmount, revenue),
        },
        directProductSales: {
          amount: salesIncomeAmount || directProductSalesTotal,
          count: salesFromIncome.length || sales.length,
          sharePct: sharePct(
            salesIncomeAmount || directProductSalesTotal,
            revenue,
          ),
        },
        servicesOnAppointments: {
          amount: otherIncomeAmount,
          sharePct: sharePct(otherIncomeAmount, revenue),
        },
        productsOnAppointments: {
          amount: 0,
          sharePct: 0,
        },
      },
      revenueByMethod: revenueByMethodList,
      byBranch,
      expensesByCategory,
      meta: {
        incomeRows: incomes.length,
        expenseRows: expenses.length,
        saleRows: sales.length,
        purchaseRows: purchases.length,
      },
    });
  } catch (error) {
    console.error("GET /api/finance/summary", error);
    return NextResponse.json(
      { message: "Error al obtener finanzas" },
      { status: 500 },
    );
  }
}
