import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  getDashboardPeriodRange,
  parseDashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { parseBranchId, resolveDashboardScope } from "@/shared/utils/branches";
import {
  appointmentPaidAmount,
  sharePct,
  splitAppointmentPaidRevenue,
} from "@/shared/utils/finance-revenue";
import { toAmount } from "@/shared/utils/money";
import {
  paymentMethodLabel,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";

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

    const branchWhere = branchId ? { branchId } : {};
    const expenseWhere = {
      expenseDate: { gte: start, lte: end },
      ...(branchId ? { branchId } : {}),
    };

    const [completedApts, directProductSales, expenses, purchases, branches, commissions] =
      await Promise.all([
        prisma.appointment.findMany({
          where: {
            status: "completed",
            appointmentDate: { gte: start, lte: end },
            ...branchWhere,
          },
          include: {
            payment: true,
            services: {
              include: { service: { select: { price: true } } },
            },
            products: {
              include: { product: { select: { price: true } } },
            },
          },
        }),
        prisma.productSale.findMany({
          where: {
            paidAt: { gte: start, lte: end },
            ...branchWhere,
          },
          select: {
            amount: true,
            method: true,
            branchId: true,
          },
        }),
        prisma.expense.findMany({ where: expenseWhere }),
        prisma.purchase.findMany({
          where: {
            purchasedAt: { gte: start, lte: end },
            ...(branchId ? { branchId } : {}),
          },
        }),
        prisma.branch.findMany({
          where: {
            isActive: true,
            ...(branchId ? { id: branchId } : {}),
          },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, code: true },
        }),
        prisma.commissionRecord.findMany({
          where: {
            createdAt: { gte: start, lte: end },
            ...(branchId ? { appointment: { branchId } } : {}),
          },
          select: {
            amount: true,
            userId: true,
            appointment: { select: { branchId: true } },
          },
        }),
      ]);

    let appointmentPaymentsTotal = 0;
    let servicesRevenue = 0;
    let productsOnAppointmentsRevenue = 0;
    let paidAppointmentsCount = 0;

    const revenueByMethod = new Map<string, number>();

    for (const apt of completedApts) {
      const paid = appointmentPaidAmount(apt);
      if (paid <= 0) continue;

      paidAppointmentsCount += 1;
      appointmentPaymentsTotal += paid;

      const split = splitAppointmentPaidRevenue(apt);
      servicesRevenue += split.services;
      productsOnAppointmentsRevenue += split.products;

      const method = apt.payment?.method ?? "cash";
      revenueByMethod.set(method, (revenueByMethod.get(method) ?? 0) + paid);
    }

    let directProductSalesTotal = 0;
    for (const sale of directProductSales) {
      const amount = toAmount(sale.amount);
      directProductSalesTotal += amount;
      revenueByMethod.set(
        sale.method,
        (revenueByMethod.get(sale.method) ?? 0) + amount,
      );
    }

    const revenue = appointmentPaymentsTotal + directProductSalesTotal;
    const expenseTotal = expenses.reduce((sum, e) => sum + toAmount(e.amount), 0);
    const purchaseTotal = purchases.reduce((sum, p) => sum + toAmount(p.totalAmount), 0);
    const commissionTotal = commissions.reduce((sum, c) => sum + toAmount(c.amount), 0);
    const netIncome = revenue - expenseTotal - purchaseTotal - commissionTotal;

    const revenueByMethodList = [...revenueByMethod.entries()]
      .map(([method, amount]) => ({
        method,
        label: paymentMethodLabel[method as PaymentMethodValue] ?? method,
        amount,
        sharePct: sharePct(amount, revenue),
      }))
      .sort((a, b) => b.amount - a.amount);

    const byBranch = await Promise.all(
      branches.map(async (branch) => {
        const branchAppointmentRevenue = completedApts
          .filter((a) => a.branchId === branch.id)
          .reduce((sum, apt) => sum + appointmentPaidAmount(apt), 0);
        const branchDirectSales = directProductSales
          .filter((sale) => sale.branchId === branch.id)
          .reduce((sum, sale) => sum + toAmount(sale.amount), 0);
        const branchRevenue = branchAppointmentRevenue + branchDirectSales;
        const branchExpenses = expenses
          .filter((e) => e.branchId === branch.id)
          .reduce((sum, e) => sum + toAmount(e.amount), 0);
        const branchCommissions = commissions
          .filter((c) => c.appointment.branchId === branch.id)
          .reduce((sum, c) => sum + toAmount(c.amount), 0);
        const branchPurchases = purchases
          .filter((p) => p.branchId === branch.id)
          .reduce((sum, p) => sum + toAmount(p.totalAmount), 0);
        const branchAppointments = await prisma.appointment.count({
          where: {
            branchId: branch.id,
            appointmentDate: { gte: start, lte: end },
          },
        });
        return {
          branchId: branch.id,
          branchName: branch.name,
          revenue: branchRevenue,
          appointmentRevenue: branchAppointmentRevenue,
          directProductSales: branchDirectSales,
          expenses: branchExpenses,
          commissions: branchCommissions,
          purchases: branchPurchases,
          net: branchRevenue - branchExpenses - branchCommissions - branchPurchases,
          appointments: branchAppointments,
        };
      }),
    );

    const expensesByCategory = Object.values(
      expenses.reduce(
        (acc, expense) => {
          const key = expense.categoryId;
          if (!acc[key]) {
            acc[key] = { categoryId: key, amount: 0, count: 0 };
          }
          acc[key].amount += toAmount(expense.amount);
          acc[key].count += 1;
          return acc;
        },
        {} as Record<number, { categoryId: number; amount: number; count: number }>,
      ),
    );

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
          amount: appointmentPaymentsTotal,
          count: paidAppointmentsCount,
          servicesAmount: servicesRevenue,
          productsAmount: productsOnAppointmentsRevenue,
          sharePct: sharePct(appointmentPaymentsTotal, revenue),
        },
        directProductSales: {
          amount: directProductSalesTotal,
          count: directProductSales.length,
          sharePct: sharePct(directProductSalesTotal, revenue),
        },
        servicesOnAppointments: {
          amount: servicesRevenue,
          sharePct: sharePct(servicesRevenue, revenue),
        },
        productsOnAppointments: {
          amount: productsOnAppointmentsRevenue,
          sharePct: sharePct(productsOnAppointmentsRevenue, revenue),
        },
      },
      revenueByMethod: revenueByMethodList,
      byBranch,
      expensesByCategory,
    });
  } catch (error) {
    console.error("GET /api/finance/summary", error);
    return NextResponse.json({ message: "Error al obtener finanzas" }, { status: 500 });
  }
}
