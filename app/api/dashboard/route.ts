import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  getDashboardChartBuckets,
  getDashboardActivityChartBuckets,
  getDashboardPeriodRange,
  getDashboardPreviousPeriodRange,
  parseDashboardPeriod,
  percentChange,
  dashboardPeriodLabel,
} from "@/shared/utils/dashboard-period";
import { toAmount } from "@/shared/utils/money";
import { notifyAdminsLowStock } from "@/shared/utils/stock-notify";
import { LOW_STOCK_THRESHOLD } from "@/shared/utils/stock";
import { parseBranchId, resolveDashboardScope } from "@/shared/utils/branches";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  canViewRevenue,
  isOwnerRole,
  isPureEmployeeRole,
} from "@/shared/utils/roles";
import { fetchOwnerInsights } from "@/shared/utils/dashboard-owner-insights";
import {
  appointmentRevenue,
  buildPaymentBreakdown,
  buildTopEmployees,
} from "@/shared/utils/dashboard-widgets";
import {
  buildAppointmentStatusOverview,
  buildFinanceHero,
  buildStockAlertBuckets,
} from "@/shared/utils/dashboard-finance-hero";

const revenueInclude = {
  payment: true,
  staff: {
    select: {
      id: true,
      firstName: true,
      secondName: true,
      firstLastName: true,
      secondLastName: true,
    },
  },
  services: {
    include: {
      service: { select: { id: true, name: true, price: true } },
    },
  },
  products: { include: { product: { select: { price: true } } } },
} as const;

function personName(person: {
  firstName: string | null;
  secondName: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
} | null | undefined) {
  if (!person) return "—";
  return (
    [person.firstName, person.secondName, person.firstLastName, person.secondLastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "—"
  );
}

function withStaffAsUser<
  T extends {
    userId: number;
    staff?: {
      id: number;
      firstName: string | null;
      secondName: string | null;
      firstLastName: string | null;
      secondLastName: string | null;
    } | null;
  },
>(apt: T) {
  return {
    ...apt,
    user: {
      id: apt.userId,
      name: personName(apt.staff),
    },
  };
}

function buildTopMarginServices(
  completedApts: Array<{
    services: Array<{
      service: { id: number; name: string; price: number };
    }>;
  }>,
) {
  const byService = new Map<
    number,
    { id: number; name: string; revenue: number; count: number }
  >();

  for (const apt of completedApts) {
    for (const row of apt.services) {
      const svc = row.service;
      const current = byService.get(svc.id) ?? {
        id: svc.id,
        name: svc.name,
        revenue: 0,
        count: 0,
      };
      current.revenue += toAmount(svc.price);
      current.count += 1;
      byService.set(svc.id, current);
    }
  }

  const ranked = [...byService.values()].sort((a, b) => {
    if (b.revenue !== a.revenue) return b.revenue - a.revenue;
    return b.count - a.count;
  });

  const servicesRevenue = ranked.reduce((sum, s) => sum + s.revenue, 0);
  return ranked.slice(0, 5).map((s) => ({
    ...s,
    sharePct:
      servicesRevenue > 0
        ? Math.round((s.revenue / servicesRevenue) * 100)
        : 0,
  }));
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const period = parseDashboardPeriod(url.searchParams.get("period"));
    const requestedBranchId = parseBranchId(url.searchParams.get("branchId"));
    const scope = await resolveDashboardScope(
      prisma,
      auth.user,
      requestedBranchId,
    );
    const branchId = scope.branchId;
    const branchWhere = scope.appointmentWhere;
    const { start, end } = getDashboardPeriodRange(period);
    const previous = getDashboardPreviousPeriodRange(period);
    const dateFilter = { gte: start, lte: end };
    const prevFilter = { gte: previous.start, lte: previous.end };
    const isGlobalCatalog = isOwnerRole(auth.user.role) && branchId == null;

    const [
      unreadNotifications,
      customers,
      services,
      products,
      lowStockProducts,
      totalAppointments,
      scheduled,
      completed,
      cancelled,
      rescheduled,
      pending_payment,
      paid_pending,
      completedInPeriod,
      pendingPaymentApts,
      appointmentsInPeriod,
      recentInPeriod,
      prevTotalAppointments,
      prevCompleted,
      prevCompletedApts,
      periodExpenses,
      prevPeriodExpenses,
      periodPurchases,
      prevPeriodPurchases,
      periodCommissions,
      prevPeriodCommissions,
      stockRows,
    ] = await Promise.all([
      userId
        ? prisma.notification.count({
            where: { userId: Number(userId), seen: false },
          })
        : Promise.resolve(0),
      isGlobalCatalog
        ? prisma.customer.count()
        : prisma.appointment
            .groupBy({
              by: ["customerId"],
              where: { appointmentDate: dateFilter, ...branchWhere },
            })
            .then((rows) => rows.length),
      isGlobalCatalog
        ? prisma.service.count()
        : isPureEmployeeRole(auth.user.role)
          ? prisma.appointmentService
              .groupBy({
                by: ["serviceId"],
                where: {
                  appointment: { appointmentDate: dateFilter, ...branchWhere },
                },
              })
              .then((rows) => rows.length)
          : branchId != null
            ? prisma.serviceBranch.count({
                where: { branchId, isActive: true },
              })
            : prisma.service.count(),
      isGlobalCatalog
        ? prisma.product.count()
        : branchId != null
          ? prisma.branchStock.count({
              where: { storeId: branchId, quantity: { gt: 0 } },
            })
          : prisma.product.count(),
      branchId != null
        ? prisma.branchStock
            .findMany({
              where: {
                storeId: branchId,
                quantity: { lte: LOW_STOCK_THRESHOLD },
              },
              include: { product: { select: { id: true, name: true } } },
              orderBy: [{ quantity: "asc" }, { product: { name: "asc" } }],
            })
            .then((rows) =>
              rows.map((row) => ({
                id: row.product.id,
                name: row.product.name,
                stock: row.quantity,
              })),
            )
        : prisma.product.findMany({
            where: { stock: { lte: LOW_STOCK_THRESHOLD } },
            select: { id: true, name: true, stock: true },
            orderBy: [{ stock: "asc" }, { name: "asc" }],
          }),
      prisma.appointment.count({
        where: { appointmentDate: dateFilter, ...branchWhere },
      }),
      prisma.appointment.count({
        where: {
          status: "scheduled",
          appointmentDate: dateFilter,
          ...branchWhere,
        },
      }),
      prisma.appointment.count({
        where: {
          status: "completed",
          appointmentDate: dateFilter,
          ...branchWhere,
        },
      }),
      prisma.appointment.count({
        where: {
          status: "cancelled",
          appointmentDate: dateFilter,
          ...branchWhere,
        },
      }),
      prisma.appointment.count({
        where: {
          status: "rescheduled",
          appointmentDate: dateFilter,
          ...branchWhere,
        },
      }),
      prisma.appointment.count({
        where: {
          status: "pending_payment",
          appointmentDate: dateFilter,
          ...branchWhere,
        },
      }),
      prisma.appointment.count({
        where: {
          status: "paid_pending",
          appointmentDate: dateFilter,
          ...branchWhere,
        },
      }),
      prisma.appointment.findMany({
        where: {
          status: "completed",
          appointmentDate: dateFilter,
          ...branchWhere,
        },
        include: revenueInclude,
      }),
      prisma.appointment.findMany({
        where: {
          status: "pending_payment",
          appointmentDate: dateFilter,
          ...branchWhere,
        },
        include: revenueInclude,
      }),
      prisma.appointment.findMany({
        where: { appointmentDate: dateFilter, ...branchWhere },
        select: { appointmentDate: true },
      }),
      prisma.appointment.findMany({
        where: { appointmentDate: dateFilter, ...branchWhere },
        include: {
          customer: { select: { name: true, firstLastName: true, secondLastName: true } },
          staff: {
            select: {
              firstName: true,
              secondName: true,
              firstLastName: true,
              secondLastName: true,
            },
          },
        },
        orderBy: { appointmentDate: "desc" },
        take: 10,
      }),
      prisma.appointment.count({
        where: { appointmentDate: prevFilter, ...branchWhere },
      }),
      prisma.appointment.count({
        where: {
          status: "completed",
          appointmentDate: prevFilter,
          ...branchWhere,
        },
      }),
      prisma.appointment.findMany({
        where: {
          status: "completed",
          appointmentDate: prevFilter,
          ...branchWhere,
        },
        include: revenueInclude,
      }),
      prisma.expense.findMany({
        where: { date: dateFilter },
        select: { amount: true },
      }),
      prisma.expense.findMany({
        where: { date: prevFilter },
        select: { amount: true },
      }),
      prisma.purchaseOrder.findMany({
        where: { date: dateFilter },
        include: { lines: { select: { quantity: true, unitPrice: true } } },
      }),
      prisma.purchaseOrder.findMany({
        where: { date: prevFilter },
        include: { lines: { select: { quantity: true, unitPrice: true } } },
      }),
      prisma.commissionRecord.findMany({
        where: {
          createdAt: dateFilter,
          ...(branchId ? { appointment: { branchId } } : {}),
        },
        select: { amount: true },
      }),
      prisma.commissionRecord.findMany({
        where: {
          createdAt: prevFilter,
          ...(branchId ? { appointment: { branchId } } : {}),
        },
        select: { amount: true },
      }),
      branchId != null
        ? prisma.branchStock
            .findMany({
              where: { storeId: branchId },
              include: {
                product: { select: { id: true, name: true, minStock: true } },
                branch: { select: { name: true } },
              },
            })
            .then((rows) =>
              rows.map((row) => ({
                productId: row.product.id,
                name: row.product.name,
                stock: row.quantity,
                minStock: row.product.minStock,
                branchName: row.branch.name,
              })),
            )
        : prisma.branchStock
            .findMany({
              include: {
                product: { select: { id: true, name: true, minStock: true } },
                branch: { select: { name: true } },
              },
            })
            .then((rows) =>
              rows.map((row) => ({
                productId: row.product.id,
                name: row.product.name,
                stock: row.quantity,
                minStock: row.product.minStock,
                branchName: row.branch.name,
              })),
            ),
    ]);

    const completedRevenueApts = completedInPeriod.map(withStaffAsUser);
    const pendingRevenueApts = pendingPaymentApts.map(withStaffAsUser);
    const prevRevenueApts = prevCompletedApts.map(withStaffAsUser);

    const purchaseTotalFromOrders = (
      orders: Array<{
        lines: Array<{ quantity: number; unitPrice: number }>;
      }>,
    ) =>
      orders.reduce(
        (sum, order) =>
          sum +
          order.lines.reduce(
            (lineSum, line) =>
              lineSum + toAmount(line.quantity) * toAmount(line.unitPrice),
            0,
          ),
        0,
      );

    const revenue = completedRevenueApts.reduce(
      (sum, apt) => sum + appointmentRevenue(apt),
      0,
    );
    const previousRevenue = prevRevenueApts.reduce(
      (sum, apt) => sum + appointmentRevenue(apt),
      0,
    );
    const pendingPaymentAmount = pendingRevenueApts.reduce(
      (sum, apt) => sum + appointmentRevenue(apt),
      0,
    );

    const completionRate =
      totalAppointments > 0
        ? Math.round((completed / totalAppointments) * 100)
        : 0;
    const previousCompletionRate =
      prevTotalAppointments > 0
        ? Math.round((prevCompleted / prevTotalAppointments) * 100)
        : 0;

    const revenueBuckets = getDashboardChartBuckets(period);
    const activityBuckets = getDashboardActivityChartBuckets(period);

    const appointmentsByDay = activityBuckets.map((bucket) => ({
      date: bucket.label,
      count: appointmentsInPeriod.filter(
        (apt) =>
          apt.appointmentDate >= bucket.start &&
          apt.appointmentDate <= bucket.end,
      ).length,
    }));

    const revenueByDay = revenueBuckets.map((bucket) => ({
      date: bucket.label,
      amount: completedRevenueApts
        .filter(
          (apt) =>
            apt.appointmentDate >= bucket.start &&
            apt.appointmentDate <= bucket.end,
        )
        .reduce((sum, apt) => sum + appointmentRevenue(apt), 0),
    }));

    const topMarginServices = buildTopMarginServices(completedInPeriod);
    const showOpsWidgets = canViewRevenue(auth.user.role);
    const topEmployees = showOpsWidgets
      ? buildTopEmployees(completedRevenueApts)
      : [];
    const paymentBreakdown = showOpsWidgets
      ? buildPaymentBreakdown(completedRevenueApts, revenue)
      : [];

    const expenseTotal = periodExpenses.reduce(
      (sum, e) => sum + toAmount(e.amount),
      0,
    );
    const purchaseTotal = purchaseTotalFromOrders(periodPurchases);
    const commissionTotal = periodCommissions.reduce(
      (sum, c) => sum + toAmount(c.amount),
      0,
    );
    const prevExpenseTotal = prevPeriodExpenses.reduce(
      (sum, e) => sum + toAmount(e.amount),
      0,
    );
    const prevPurchaseTotal = purchaseTotalFromOrders(prevPeriodPurchases);
    const prevCommissionTotal = prevPeriodCommissions.reduce(
      (sum, c) => sum + toAmount(c.amount),
      0,
    );
    const previousNet =
      previousRevenue - prevExpenseTotal - prevPurchaseTotal - prevCommissionTotal;

    const financeHero = showOpsWidgets
      ? buildFinanceHero({
          revenue,
          expenses: expenseTotal,
          purchases: purchaseTotal,
          commissions: commissionTotal,
          pendingReceivable: pendingPaymentAmount,
          previousRevenue,
          previousNet,
          periodLabel: dashboardPeriodLabel[period],
        })
      : null;

    const stockAlerts = showOpsWidgets
      ? buildStockAlertBuckets(stockRows)
      : null;

    const appointmentStatusOverview = buildAppointmentStatusOverview({
      scheduled,
      paid_pending,
      pending_payment,
      completed,
      cancelled,
      rescheduled,
    });

    await Promise.all(
      lowStockProducts.map((product) => notifyAdminsLowStock(product)),
    );

    const unread = userId
      ? await prisma.notification.count({
          where: { userId: Number(userId), read: false },
        })
      : unreadNotifications;

    const ownerInsights =
      isOwnerRole(auth.user.role)
        ? await fetchOwnerInsights({
            start,
            end,
            prevStart: previous.start,
            prevEnd: previous.end,
            branchId,
            revenue,
            previousRevenue,
            completed,
            prevCompleted,
            totalAppointments,
            cancelled,
          })
        : null;

    return NextResponse.json({
      period,
      unreadNotifications: unread,
      totalCustomers: customers,
      totalServices: services,
      totalProducts: products,
      totalAppointments,
      scheduled,
      completed,
      cancelled,
      rescheduled,
      pending_payment,
      paid_pending,
      pendingPaymentAmount,
      revenue,
      completionRate,
      appointmentsByDay,
      revenueByDay,
      topMarginServices,
      topMarginService: topMarginServices[0] ?? null,
      topEmployees,
      paymentBreakdown,
      financeHero,
      stockAlerts,
      appointmentStatusOverview,
      recentAppointments: recentInPeriod.map((a) => ({
        id: a.id,
        title: a.title,
        customer: [a.customer.name, a.customer.firstLastName, a.customer.secondLastName]
          .filter(Boolean)
          .join(" "),
        date: a.appointmentDate.toISOString(),
        status: a.status,
        employee: personName(a.staff),
      })),
      comparison: {
        revenue: {
          previous: previousRevenue,
          changePct: percentChange(revenue, previousRevenue),
        },
        appointments: {
          previous: prevTotalAppointments,
          changePct: percentChange(totalAppointments, prevTotalAppointments),
        },
        completionRate: {
          previous: previousCompletionRate,
          changePct: percentChange(completionRate, previousCompletionRate),
        },
      },
      ownerInsights,
    });
  } catch (error) {
    console.error("GET /api/dashboard", error);
    return NextResponse.json(
      { message: "Error al obtener dashboard" },
      { status: 500 },
    );
  }
}
