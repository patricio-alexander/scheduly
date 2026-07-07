import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function GET() {
  try {
    const [customers, services, appointments] = await Promise.all([
      prisma.customer.count(),
      prisma.service.count(),
      prisma.appointment.findMany({
        include: {
          customer: { select: { name: true, lastnames: true } },
          services: {
            include: { service: { select: { price: true } } },
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
    ]);

    const completed = await prisma.appointment.findMany({
      where: { status: "completed" },
      include: {
        services: {
          include: { service: { select: { price: true } } },
        },
      },
    });

    const revenue = completed.reduce((sum, apt) => {
      const aptTotal = apt.services.reduce(
        (s, as) => s + Number(as.service.price),
        0
      );
      return sum + aptTotal;
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
        (a) => a.appointmentDate.toISOString().slice(0, 10) === dateStr
      ).length;
      const dayName = d.toLocaleDateString("es-CL", { weekday: "short" });
      appointmentsByDay.push({ date: dayName, count });
    }

    return NextResponse.json({
      totalCustomers: customers,
      totalServices: services,
      totalAppointments: appointments.length,
      scheduled: statusCounts[0],
      completed: statusCounts[1],
      cancelled: statusCounts[2],
      rescheduled: statusCounts[3],
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
  } catch {
    return NextResponse.json(
      { message: "Error al obtener dashboard" },
      { status: 500 }
    );
  }
}
