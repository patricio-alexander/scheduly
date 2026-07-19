import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  getDashboardChartBuckets,
  getDashboardPeriodRange,
  parseDashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { toAmount } from "@/shared/utils/money";
import { notifyAdminsLowStock } from "@/shared/utils/stock-notify";
import { LOW_STOCK_THRESHOLD } from "@/shared/utils/stock";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const period = parseDashboardPeriod(url.searchParams.get("period"));
    const { start, end } = getDashboardPeriodRange(period);
    const dateFilter = { gte: start, lte: end };

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
      appointmentsInPeriod,
      recentInPeriod,
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
        take: 8,
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
        include: {
          payment: true,
          services: { include: { service: { select: { price: true } } } },
          products: { include: { product: { select: { price: true } } } },
        },
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
        take: 5,
      }),
    ]);

    const revenue = completedInPeriod.reduce((sum, apt) => {
      if (apt.payment) return sum + toAmount(apt.payment.amount);
      const servicesTotal = apt.services.reduce(
        (s, as) => s + toAmount(as.service.price),
        0,
      );
      const productsTotal = apt.products.reduce(
        (p, ap) => p + toAmount(ap.product.price) * ap.quantity,
        0,
      );
      return sum + servicesTotal + productsTotal;
    }, 0);

    const buckets = getDashboardChartBuckets(period);
    const appointmentsByDay = buckets.map((bucket) => ({
      date: bucket.label,
      count: appointmentsInPeriod.filter(
        (apt) =>
          apt.appointmentDate >= bucket.start &&
          apt.appointmentDate <= bucket.end,
      ).length,
    }));

    // Asegura notificaciones de warning para productos ya en mínimo
    await Promise.all(lowStockProducts.map((product) => notifyAdminsLowStock(product)));

    const unread =
      userId
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
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      lowStockProducts,
      lowStockCount: lowStockProducts.length,
      totalAppointments,
      scheduled,
      completed,
      cancelled,
      rescheduled,
      pending_payment,
      paid_pending,
      revenue,
      appointmentsByDay,
      recentAppointments: recentInPeriod.map((a) => ({
        id: a.id,
        title: a.title,
        customer: `${a.customer.name} ${a.customer.lastnames}`,
        date: a.appointmentDate.toISOString(),
        status: a.status,
      })),
    });
  } catch (error) {
    console.error("GET /api/dashboard", error);
    return NextResponse.json(
      { message: "Error al obtener dashboard" },
      { status: 500 },
    );
  }
}
