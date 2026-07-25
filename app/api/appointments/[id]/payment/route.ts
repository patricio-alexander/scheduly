import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  calcAppointmentTotal,
  deductStockForAppointment,
  parsePaymentMethod,
} from "@/shared/utils/appointment-business";
import { getAppointmentCalendarEvent } from "@/shared/utils/appointment-calendar";
import { emitAppointmentUpdated } from "@/shared/utils/socket";
import { checkAuth } from "@/shared/utils/check-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const appointmentId = Number(id);

  try {
    const body = await request.json();
    const method = parsePaymentMethod(body.method);
    const notes = String(body.notes ?? "");

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          payment: true,
          services: { include: { service: { select: { price: true } } } },
          products: { include: { product: { select: { price: true } } } },
        },
      });

      if (!appointment) {
        throw new Error("Turno no encontrado");
      }

      if (appointment.payment) {
        throw new Error("Este turno ya tiene un pago registrado");
      }

      const total = calcAppointmentTotal(appointment.services, appointment.products);
      const amount =
        body.amount != null && body.amount !== ""
          ? Number(body.amount)
          : total;

      if (Number.isNaN(amount) || amount < 0) {
        throw new Error("Monto inválido");
      }

      const payment = await tx.payment.create({
        data: {
          appointmentId,
          amount,
          method,
          notes,
        },
      });

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: "completed" },
      });

      await deductStockForAppointment(tx, appointmentId);

      return payment;
    });

    const calendarEvent = await getAppointmentCalendarEvent(appointmentId);
    if (calendarEvent) emitAppointmentUpdated(calendarEvent);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments/[id]/payment", error);
    const message =
      error instanceof Error ? error.message : "Error al registrar el pago";
    const status = message.includes("no encontrado") ? 404 : 400;
    return NextResponse.json({ message }, { status });
  }
}
