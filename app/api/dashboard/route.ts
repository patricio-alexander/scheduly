import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  getDashboardChartBuckets,
  getDashboardPeriodRange,
  getDashboardPreviousPeriodRange,
  parseDashboardPeriod,
  percentChange,
} from "@/shared/utils/dashboard-period";
import { toAmount } from "@/shared/utils/money";
import { notifyAdminsLowStock } from "@/shared/utils/stock-notify";
import { LOW_STOCK_THRESHOLD } from "@/shared/utils/stock";

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

const revenueInclude = {
  payment: true,
  services: { include: { service: { select: { price: true } } } },
  products: { include: { product: { select: { price: true } } } },
} as const;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const period = parseDashboardPeriod(url.searchParams.get("period"));
    const { start, end } = getDashboardPeriodRange(period);
    const previous = getDashboardPreviousPeriodRange(period);
    const dateFilter = { gte: start, lte: end };
    const prevFilter = { gte: previous.start, lte: previous.end };

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
    ] = await Promise.all([
      userId
        ? prisma.notification.count({
            where: { userId: Number(userId), read: false },
          })
        : Promise.resolve(0),
      prisma.customer.count(),
      prisma.service.count(),
      prisma.product.count(),
      prisma.product.findMany({
        where: { stock: { lte: LOW_STOCK_THRESHOLD } },
        select: { id: true, name: true, stock: true },
        orderBy: [{ stock: "asc" }, { name: "asc" }],
      }),
      prisma.appointment.count({ where: { appointmentDate: dateFilter } }),
      prisma.appointment.count({
        where: { status: "scheduled", appointmentDate: dateFilter },
      }),
      prisma.appointment.count({
        where: { status: "completed", appointmentDate: dateFilter },
      }),
      prisma.appointment.count({
        where: { status: "cancelled", appointmentDate: dateFilter },
      }),
      prisma.appointment.count({
        where: { status: "rescheduled", appointmentDate: dateFilter },
      }),
      prisma.appointment.count({
        where: { status: "pending_payment", appointmentDate: dateFilter },
      }),
      prisma.appointment.count({
        where: { status: "paid_pending", appointmentDate: dateFilter },
      }),
      prisma.appointment.findMany({
        where: { status: "completed", appointmentDate: dateFilter },
        include: revenueInclude,
      }),
      prisma.appointment.findMany({
        where: { status: "pending_payment", appointmentDate: dateFilter },
        include: revenueInclude,
      }),
      prisma.appointment.findMany({
        where: { appointmentDate: dateFilter },
        select: { appointmentDate: true },
      }),
      prisma.appointment.findMany({
        where: { appointmentDate: dateFilter },
        include: {
          customer: { select: { name: true, lastnames: true } },
        },
        orderBy: { appointmentDate: "desc" },
        take: 10,
      }),
      prisma.appointment.count({
        where: { appointmentDate: prevFilter },
      }),
      prisma.appointment.count({
        where: { status: "completed", appointmentDate: prevFilter },
      }),
      prisma.appointment.findMany({
        where: { status: "completed", appointmentDate: prevFilter },
        include: revenueInclude,
      }),
    ]);

    const revenue = completedInPeriod.reduce(
      (sum, apt) => sum + appointmentRevenue(apt),
      0,
    );
    const previousRevenue = prevCompletedApts.reduce(
      (sum, apt) => sum + appointmentRevenue(apt),
      0,
    );
    const pendingPaymentAmount = pendingPaymentApts.reduce(
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

    const buckets = getDashboardChartBuckets(period);
    const appointmentsByDay = buckets.map((bucket) => ({
      date: bucket.label,
      count: appointmentsInPeriod.filter(
        (apt) =>
          apt.appointmentDate >= bucket.start &&
          apt.appointmentDate <= bucket.end,
      ).length,
    }));

    await Promise.all(
      lowStockProducts.map((product) => notifyAdminsLowStock(product)),
    );

    const unread = userId
      ? await prisma.notification.count({
          where: { userId: Number(userId), read: false },
        })
      : unreadNotifications;

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
      recentAppointments: recentInPeriod.map((a) => ({
        id: a.id,
        title: a.title,
        customer: `${a.customer.name} ${a.customer.lastnames}`,
        date: a.appointmentDate.toISOString(),
        status: a.status,
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
    });
  } catch (error) {
    console.error("GET /api/dashboard", error);
    return NextResponse.json(
      { message: "Error al obtener dashboard" },
      { status: 500 },
    );
  }
}
