import { prisma } from "@/shared/utils/prisma";
import { toAmount } from "@/shared/utils/money";
import { percentChange } from "@/shared/utils/dashboard-period";
import {
  paymentMethodLabel,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";

function appointmentRevenue(apt: {
  payment: { amount: number } | null;
  services: Array<{ service: { price: number } }>;
  products: Array<{ quantity: number; product: { price: number } }>;
}) {
  if (apt.payment) return toAmount(apt.payment.amount);
  const servicesTotal = apt.services.reduce(
    (s, as) => s + toAmount(as.service.price),
    0,
  );
  const productsTotal = apt.products.reduce(
    (p, ap) => p + toAmount(ap.product.price) * ap.quantity,
    0,
  );
  return servicesTotal + productsTotal;
}

const completedInclude = {
  payment: true,
  user: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  services: {
    include: { service: { select: { id: true, name: true, price: true } } },
  },
  products: {
    include: {
      product: { select: { id: true, name: true, price: true } },
    },
  },
} as const;

export async function fetchOwnerInsights(options: {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  branchId: number | null;
  revenue: number;
  previousRevenue: number;
  completed: number;
  prevCompleted: number;
  totalAppointments: number;
  cancelled: number;
}) {
  const {
    start,
    end,
    prevStart,
    prevEnd,
    branchId,
    revenue,
    previousRevenue,
    completed,
    prevCompleted,
    totalAppointments,
    cancelled,
  } = options;

  const branchWhere = branchId ? { branchId } : {};
  const dateFilter = { gte: start, lte: end };
  const prevFilter = { gte: prevStart, lte: prevEnd };

  const [
    completedApts,
    prevCompletedApts,
    expenses,
    prevExpenses,
    purchases,
    prevPurchases,
    commissions,
    prevCommissions,
    branches,
    activeCustomerRows,
    lowStockRows,
    branchAppointmentCounts,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { status: "completed", appointmentDate: dateFilter, ...branchWhere },
      include: completedInclude,
    }),
    prisma.appointment.findMany({
      where: {
        status: "completed",
        appointmentDate: prevFilter,
        ...branchWhere,
      },
      include: completedInclude,
    }),
    prisma.expense.findMany({
      where: {
        expenseDate: dateFilter,
        ...(branchId ? { branchId } : {}),
      },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.expense.findMany({
      where: {
        expenseDate: prevFilter,
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.purchase.findMany({
      where: {
        purchasedAt: dateFilter,
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.purchase.findMany({
      where: {
        purchasedAt: prevFilter,
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.commissionRecord.findMany({
      where: {
        createdAt: dateFilter,
        ...(branchId ? { appointment: { branchId } } : {}),
      },
    }),
    prisma.commissionRecord.findMany({
      where: {
        createdAt: prevFilter,
        ...(branchId ? { appointment: { branchId } } : {}),
      },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.appointment.findMany({
      where: { appointmentDate: dateFilter, ...branchWhere },
      select: { customerId: true },
      distinct: ["customerId"],
    }),
    prisma.branchStock.findMany({
      where: branchId ? { branchId } : {},
      include: {
        product: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ stock: "asc" }],
    }),
    branchId
      ? Promise.resolve([])
      : prisma.appointment.groupBy({
          by: ["branchId", "status"],
          where: { appointmentDate: dateFilter },
          _count: { _all: true },
        }),
  ]);

  const expenseTotal = expenses.reduce((sum, e) => sum + toAmount(e.amount), 0);
  const purchaseTotal = purchases.reduce(
    (sum, p) => sum + toAmount(p.totalAmount),
    0,
  );
  const commissionTotal = commissions.reduce(
    (sum, c) => sum + toAmount(c.amount),
    0,
  );
  const netIncome = revenue - expenseTotal - purchaseTotal - commissionTotal;

  const prevExpenseTotal = prevExpenses.reduce(
    (sum, e) => sum + toAmount(e.amount),
    0,
  );
  const prevPurchaseTotal = prevPurchases.reduce(
    (sum, p) => sum + toAmount(p.totalAmount),
    0,
  );
  const prevCommissionTotal = prevCommissions.reduce(
    (sum, c) => sum + toAmount(c.amount),
    0,
  );
  const previousNetIncome =
    previousRevenue - prevExpenseTotal - prevPurchaseTotal - prevCommissionTotal;

  const averageTicket = completed > 0 ? Math.round(revenue / completed) : 0;
  const prevAverageTicket =
    prevCompleted > 0 ? Math.round(previousRevenue / prevCompleted) : 0;
  const cancellationRate =
    totalAppointments > 0
      ? Math.round((cancelled / totalAppointments) * 100)
      : 0;

  const paymentMethods = completedApts.reduce(
    (acc, apt) => {
      const method = apt.payment?.method ?? "cash";
      const key = method as PaymentMethodValue;
      acc[key] = (acc[key] ?? 0) + appointmentRevenue(apt);
      return acc;
    },
    {} as Record<string, number>,
  );

  const paymentBreakdown = Object.entries(paymentMethods)
    .map(([method, amount]) => ({
      method,
      label:
        paymentMethodLabel[method as PaymentMethodValue] ?? method,
      amount,
      sharePct:
        revenue > 0 ? Math.round((amount / revenue) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const employeeMap = new Map<
    number,
    { id: number; name: string; revenue: number; appointments: number }
  >();
  for (const apt of completedApts) {
    const current = employeeMap.get(apt.userId) ?? {
      id: apt.userId,
      name: apt.user.name,
      revenue: 0,
      appointments: 0,
    };
    current.revenue += appointmentRevenue(apt);
    current.appointments += 1;
    employeeMap.set(apt.userId, current);
  }
  const topEmployees = [...employeeMap.values()]
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.appointments - a.appointments;
    })
    .slice(0, 6);

  const productMap = new Map<
    number,
    { id: number; name: string; revenue: number; units: number }
  >();
  for (const apt of completedApts) {
    for (const row of apt.products) {
      const product = row.product;
      const current = productMap.get(product.id) ?? {
        id: product.id,
        name: product.name,
        revenue: 0,
        units: 0,
      };
      current.revenue += toAmount(product.price) * row.quantity;
      current.units += row.quantity;
      productMap.set(product.id, current);
    }
  }
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const categoryMap = new Map<
    number,
    { categoryId: number; name: string; amount: number; count: number }
  >();
  for (const expense of expenses) {
    const catId = expense.categoryId;
    const current = categoryMap.get(catId) ?? {
      categoryId: catId,
      name: expense.category.name,
      amount: 0,
      count: 0,
    };
    current.amount += toAmount(expense.amount);
    current.count += 1;
    categoryMap.set(catId, current);
  }
  const topExpenseCategories = [...categoryMap.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const branchStatsMap = new Map<
    number,
    {
      branchId: number;
      branchName: string;
      revenue: number;
      expenses: number;
      appointments: number;
      completed: number;
      cancelled: number;
    }
  >();

  for (const branch of branches) {
    if (branchId && branch.id !== branchId) continue;
    branchStatsMap.set(branch.id, {
      branchId: branch.id,
      branchName: branch.name,
      revenue: 0,
      expenses: 0,
      appointments: 0,
      completed: 0,
      cancelled: 0,
    });
  }

  for (const apt of completedApts) {
    const bid = apt.branchId;
    if (!bid || !branchStatsMap.has(bid)) continue;
    branchStatsMap.get(bid)!.revenue += appointmentRevenue(apt);
  }

  for (const expense of expenses) {
    const bid = expense.branchId;
    if (!bid || !branchStatsMap.has(bid)) continue;
    branchStatsMap.get(bid)!.expenses += toAmount(expense.amount);
  }

  if (!branchId && branchAppointmentCounts.length > 0) {
    for (const row of branchAppointmentCounts) {
      const bid = row.branchId;
      if (!bid || !branchStatsMap.has(bid)) continue;
      const stats = branchStatsMap.get(bid)!;
      stats.appointments += row._count._all;
      if (row.status === "completed") stats.completed += row._count._all;
      if (row.status === "cancelled") stats.cancelled += row._count._all;
    }
  } else if (branchId) {
    const stats = branchStatsMap.get(branchId);
    if (stats) {
      stats.appointments = totalAppointments;
      stats.completed = completed;
      stats.cancelled = cancelled;
    }
  }

  const byBranch = [...branchStatsMap.values()]
    .map((row) => ({
      ...row,
      net: row.revenue - row.expenses,
      completionRate:
        row.appointments > 0
          ? Math.round((row.completed / row.appointments) * 100)
          : 0,
      cancellationRate:
        row.appointments > 0
          ? Math.round((row.cancelled / row.appointments) * 100)
          : 0,
      sharePct:
        revenue > 0 ? Math.round((row.revenue / revenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const servicesRevenue = completedApts.reduce(
    (sum, apt) =>
      sum +
      apt.services.reduce((s, row) => s + toAmount(row.service.price), 0),
    0,
  );
  const productsRevenue = completedApts.reduce(
    (sum, apt) =>
      sum +
      apt.products.reduce(
        (p, row) => p + toAmount(row.product.price) * row.quantity,
        0,
      ),
    0,
  );

  return {
    financial: {
      revenue,
      expenses: expenseTotal,
      purchases: purchaseTotal,
      commissions: commissionTotal,
      netIncome,
      servicesRevenue,
      productsRevenue,
      averageTicket,
      cancellationRate,
      activeCustomers: activeCustomerRows.length,
      comparison: {
        revenue: {
          previous: previousRevenue,
          changePct: percentChange(revenue, previousRevenue),
        },
        netIncome: {
          previous: previousNetIncome,
          changePct: percentChange(netIncome, previousNetIncome),
        },
        averageTicket: {
          previous: prevAverageTicket,
          changePct: percentChange(averageTicket, prevAverageTicket),
        },
        expenses: {
          previous: prevExpenseTotal,
          changePct: percentChange(expenseTotal, prevExpenseTotal),
        },
      },
    },
    byBranch,
    topEmployees,
    topProducts,
    paymentBreakdown,
    topExpenseCategories,
    lowStockAlerts: lowStockRows
      .filter((row) => row.stock <= row.minStock)
      .slice(0, 12)
      .map((row) => ({
        branchId: row.branchId,
        branchName: row.branch.name,
        productId: row.productId,
        productName: row.product.name,
        stock: row.stock,
        minStock: row.minStock,
      })),
  };
}

export type OwnerInsights = Awaited<ReturnType<typeof fetchOwnerInsights>>;
