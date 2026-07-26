import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { getAppointmentCalendarEvent } from "@/shared/utils/appointment-calendar";
import { notifyStaffNewBooking } from "@/shared/utils/booking-notify";
import { emitAppointmentCreated } from "@/shared/utils/socket";
import {
  buildDaySlots,
  DEFAULT_SERVICE_DURATION_MINUTES,
  endOfLocalDay,
  startOfLocalDay,
} from "@/shared/utils/booking";

/** Crear reserva pública (sin cuenta de cliente) */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const serviceId = Number(body.serviceId);
    const appointmentDateRaw = String(body.appointmentDate ?? "").trim();
    const name = String(body.name ?? "").trim();
    const lastnames = String(body.lastnames ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!Number.isFinite(serviceId)) {
      return NextResponse.json(
        { message: "serviceId inválido" },
        { status: 400 },
      );
    }
    if (!appointmentDateRaw) {
      return NextResponse.json(
        { message: "Selecciona fecha y hora" },
        { status: 400 },
      );
    }
    if (!name || !lastnames || !phone || !email) {
      return NextResponse.json(
        { message: "Completa nombre, apellido, teléfono y correo" },
        { status: 400 },
      );
    }

    const appointmentDate = new Date(appointmentDateRaw);
    if (Number.isNaN(appointmentDate.getTime())) {
      return NextResponse.json(
        { message: "Fecha/hora inválida" },
        { status: 400 },
      );
    }
    if (appointmentDate.getTime() < Date.now()) {
      return NextResponse.json(
        { message: "No puedes reservar en el pasado" },
        { status: 400 },
      );
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
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

    // Validar que el slot siga libre
    const y = appointmentDate.getFullYear();
    const m = String(appointmentDate.getMonth() + 1).padStart(2, "0");
    const d = String(appointmentDate.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const dayStart = startOfLocalDay(dateStr);
    const dayEnd = endOfLocalDay(dateStr);
    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: dayStart, lte: dayEnd },
        status: { not: "cancelled" },
      },
      include: {
        services: {
          include: { service: { select: { durationMinutes: true } } },
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

    const slots = buildDaySlots(dateStr, duration, busy);
    const wanted = appointmentDate.toISOString();
    if (!slots.some((s) => s === wanted)) {
      return NextResponse.json(
        { message: "Ese horario ya no está disponible" },
        { status: 409 },
      );
    }

    const staff =
      (await prisma.user.findFirst({
        where: { role: "admin" },
        orderBy: { id: "asc" },
      })) ??
      (await prisma.user.findFirst({ orderBy: { id: "asc" } }));

    if (!staff) {
      return NextResponse.json(
        { message: "No hay personal disponible para asignar la cita" },
        { status: 503 },
      );
    }

    const appointment = await prisma.$transaction(async (tx) => {
      let customer = await tx.customer.findUnique({ where: { email } });
      if (customer) {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: { name, lastnames, phone },
        });
      } else {
        customer = await tx.customer.create({
          data: { name, lastnames, phone, email },
        });
      }

      const created = await tx.appointment.create({
        data: {
          title: service.name,
          description: "Reserva online",
          customerId: customer.id,
          userId: staff.id,
          appointmentDate,
          status: "scheduled",
          reminderSent: "",
        },
      });

      await tx.appointmentsServices.create({
        data: {
          appointmentId: created.id,
          serviceId: service.id,
        },
      });

      return created;
    });

    const calendarEvent = await getAppointmentCalendarEvent(appointment.id);
    if (calendarEvent) emitAppointmentCreated(calendarEvent);

    try {
      await notifyStaffNewBooking({
        appointmentId: appointment.id,
        serviceName: service.name,
        customerName: `${name} ${lastnames}`.trim(),
        appointmentDate: appointment.appointmentDate,
      });
    } catch (notifyError) {
      console.error("POST /api/booking notify", notifyError);
    }

    return NextResponse.json(
      {
        id: appointment.id,
        appointmentDate: appointment.appointmentDate.toISOString(),
        service: {
          id: service.id,
          name: service.name,
          price: service.price,
          durationMinutes: duration,
        },
        customer: { name, lastnames, phone, email },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/booking", error);
    return NextResponse.json(
      { message: "Error al crear la reserva" },
      { status: 500 },
    );
  }
}
