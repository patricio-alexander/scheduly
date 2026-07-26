import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  buildDaySlots,
  DEFAULT_SERVICE_DURATION_MINUTES,
  endOfLocalDay,
  startOfLocalDay,
} from "@/shared/utils/booking";

/** Horarios libres para un servicio en un día (sin auth) */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date")?.trim() ?? "";
    const serviceId = Number(searchParams.get("serviceId"));

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { message: "date debe ser YYYY-MM-DD" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(serviceId)) {
      return NextResponse.json(
        { message: "serviceId inválido" },
        { status: 400 },
      );
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, durationMinutes: true },
    });
    if (!service) {
      return NextResponse.json(
        { message: "Servicio no encontrado" },
        { status: 404 },
      );
    }

    const duration =
      service.durationMinutes > 0
        ? service.durationMinutes
        : DEFAULT_SERVICE_DURATION_MINUTES;

    const dayStart = startOfLocalDay(date);
    const dayEnd = endOfLocalDay(date);

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: dayStart, lte: dayEnd },
        status: { not: "cancelled" },
      },
      include: {
        services: {
          include: {
            service: { select: { durationMinutes: true } },
          },
        },
      },
    });

    const busy = appointments.map((apt) => {
      const mins =
        apt.services.reduce(
          (sum, row) =>
            sum +
            (row.service.durationMinutes > 0
              ? row.service.durationMinutes
              : DEFAULT_SERVICE_DURATION_MINUTES),
          0,
        ) || DEFAULT_SERVICE_DURATION_MINUTES;
      const start = apt.appointmentDate.getTime();
      return { start, end: start + mins * 60_000 };
    });

    const slots = buildDaySlots(date, duration, busy);
    return NextResponse.json({ date, serviceId, durationMinutes: duration, slots });
  } catch (error) {
    console.error("GET /api/booking/slots", error);
    return NextResponse.json(
      { message: "Error al obtener horarios" },
      { status: 500 },
    );
  }
}
