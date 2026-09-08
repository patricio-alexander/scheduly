import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { getAppointmentCalendarEvent } from "@/shared/utils/appointment-calendar";
import { notifyStaffNewBooking } from "@/shared/utils/booking-notify";
import { emitAppointmentCreated } from "@/shared/utils/socket";
import { checkCustomerAuth } from "@/shared/utils/check-customer-auth";
import {
  buildDaySlots,
  DEFAULT_SERVICE_DURATION_MINUTES,
  endOfLocalDay,
  startOfLocalDay,
} from "@/shared/utils/booking";

/** Crear reserva pública (cliente autenticado) */
export async function POST(request: Request) {
  const auth = await checkCustomerAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const serviceId = Number(body.serviceId);
    const branchIdRaw = body.branchId;
    const branchId =
      branchIdRaw == null || branchIdRaw === ""
        ? null
        : Number(branchIdRaw);
    const staffIdRaw = body.userId ?? body.staffId;
    const staffId =
      staffIdRaw == null || staffIdRaw === ""
        ? null
        : Number(staffIdRaw);
    const appointmentDateRaw = String(body.appointmentDate ?? "").trim();

    if (!Number.isFinite(serviceId)) {
      return NextResponse.json(
        { message: "serviceId inválido" },
        { status: 400 },
      );
    }
    if (branchId != null && (!Number.isInteger(branchId) || branchId <= 0)) {
      return NextResponse.json({ message: "Sucursal inválida" }, { status: 400 });
    }
    if (!appointmentDateRaw) {
      return NextResponse.json(
        { message: "Selecciona fecha y hora" },
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
        ...(branchId && branchId > 0 ? { branchId } : {}),
        ...(staffId && staffId > 0 ? { userId: staffId } : {}),
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

    let staff =
      staffId && staffId > 0
        ? await prisma.user.findFirst({
            where: {
              id: staffId,
              branches: branchId ? { some: { branchId } } : undefined,
            },
          })
        : null;

    if (!staff) {
      staff =
        (await prisma.user.findFirst({
          where: {
            role: "admin",
            ...(branchId ? { branches: { some: { branchId } } } : {}),
          },
          orderBy: { id: "asc" },
        })) ??
        (await prisma.user.findFirst({
          where: branchId ? { branches: { some: { branchId } } } : {},
          orderBy: { id: "asc" },
        }));
    }

    if (!staff) {
      return NextResponse.json(
        { message: "No hay personal disponible para asignar la cita" },
        { status: 503 },
      );
    }

    const appointment = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: auth.customer.id },
      });
      if (!customer) {
        throw new Error("Cliente no encontrado");
      }

      const created = await tx.appointment.create({
        data: {
          title: service.name,
          description: "Reserva online",
          customerId: customer.id,
          userId: staff.id,
          branchId: branchId && branchId > 0 ? branchId : null,
          appointmentDate,
          status: "scheduled",
          reminderSent: "",
        },
      });

      await tx.appointmentService.create({
        data: {
          appointmentId: created.id,
          serviceId: service.id,
        },
      });

      return { created, customer };
    });

    const calendarEvent = await getAppointmentCalendarEvent(appointment.created.id);
    if (calendarEvent) emitAppointmentCreated(calendarEvent);

    try {
      await notifyStaffNewBooking({
        appointmentId: appointment.created.id,
        serviceName: service.name,
        customerName: `${appointment.customer.name} ${appointment.customer.lastnames}`.trim(),
        appointmentDate: appointment.created.appointmentDate,
      });
    } catch (notifyError) {
      console.error("POST /api/booking notify", notifyError);
    }

    return NextResponse.json(
      {
        id: appointment.created.id,
        appointmentDate: appointment.created.appointmentDate.toISOString(),
        service: {
          id: service.id,
          name: service.name,
          price: service.price,
          durationMinutes: duration,
        },
        customer: {
          name: appointment.customer.name,
          lastnames: appointment.customer.lastnames,
          phone: appointment.customer.phone,
          email: appointment.customer.email,
        },
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
