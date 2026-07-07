import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    const [unreadNotifications, customers, services, products, totalAppointments, appointments] =
      await Promise.all([
        userId
          ? prisma.notification.count({
              where: { userId: Number(userId), read: false },
            })
          : Promise.resolve(0),
        prisma.customer.count(),
        prisma.service.count(),
        prisma.product.count(),
        prisma.appointment.count(),
        prisma.appointment.findMany({
          include: {
            customer: { select: { name: true, lastnames: true } },
            services: {
              include: { service: { select: { price: true } } },
            },
            products: {
              include: { product: { select: { price: true } } },
            },
          },
          orderBy: { appointmentDate: "desc" },
          take: 5,
        }),
      ]);

    const statusCounts = await Promise.all([
      prisma.appointment.count({ where: { status: "scheduled" } }),
      prisma.appointment.count({ where: { status: "completed" } }),
      prisma.appointment.count({ where: { status: "cancelled" } }),
      prisma.appointment.count({ where: { status: "rescheduled" } }),
      prisma.appointment.count({ where: { status: "pending_payment" } }),
      prisma.appointment.count({ where: { status: "paid_pending" } }),
    ]);

    const completed = await prisma.appointment.findMany({
      where: { status: "completed" },
      include: {
        services: {
          include: { service: { select: { price: true } } },
        },
        products: {
          include: { product: { select: { price: true } } },
        },
      },
    });

    const revenue = completed.reduce((sum, apt) => {
      const servicesTotal = apt.services.reduce(
        (s, as) => s + Number(as.service.price),
        0,
      );
      const productsTotal = apt.products.reduce(
        (p, ap) => p + Number(ap.product.price) * ap.quantity,
        0,
      );
      return sum + servicesTotal + productsTotal;
    }, 0);

    // Appointments by day for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentAppointments = await prisma.appointment.findMany({
      where: { appointmentDate: { gte: sevenDaysAgo } },
      select: { appointmentDate: true },
    });

    const appointmentsByDay: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = recentAppointments.filter(
        (a) => a.appointmentDate.toISOString().slice(0, 10) === dateStr,
      ).length;
      const dayName = d.toLocaleDateString("es-CL", { weekday: "short" });
      appointmentsByDay.push({ date: dayName, count });
    }

    return NextResponse.json({
      unreadNotifications,
      totalCustomers: customers,
      totalServices: services,
      totalProducts: products,
      totalAppointments,
      scheduled: statusCounts[0],
      completed: statusCounts[1],
      cancelled: statusCounts[2],
      rescheduled: statusCounts[3],
      pending_payment: statusCounts[4],
      paid_pending: statusCounts[5],
      revenue,
      appointmentsByDay,
      recentAppointments: appointments.map((a) => ({
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
