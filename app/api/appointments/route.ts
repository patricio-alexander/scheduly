import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { parseAppointmentDate, parseAppointmentStatus } from "@/shared/utils/appointment-api";
import {
  deductStockForAppointment,
  parseAppointmentProducts,
  validateProductStock,
} from "@/shared/utils/appointment-business";

export async function GET() {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { appointmentDate: "asc" },
      include: {
        customer: { select: { name: true, lastnames: true } },
        user: { select: { name: true } },
      },
    });

    const events = appointments.map((a) => ({
      id: String(a.id),
      title: `${a.title} - ${a.customer.name} ${a.customer.lastnames}`,
      start: a.appointmentDate.toISOString(),
      extendedProps: {
        description: a.description,
        customer: `${a.customer.name} ${a.customer.lastnames}`,
        user: a.user.name,
        status: a.status,
      },
    }));

    return NextResponse.json(events);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener turnos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      customerId,
      userId,
      appointmentDate,
      status,
      serviceIds,
      productIds,
      products: productsInput,
    } = body;

    const appointment = await prisma.$transaction(async (tx) => {
      const products = parseAppointmentProducts(productsInput, productIds);
      await validateProductStock(tx, products);

      const created = await tx.appointment.create({
        data: {
          title,
          description: description ?? "",
          customerId: Number(customerId),
          userId: Number(userId),
          appointmentDate: parseAppointmentDate(appointmentDate),
          status: parseAppointmentStatus(status),
          reminderSent: "",
        },
      });

      if (serviceIds?.length > 0) {
        await tx.appointmentsServices.createMany({
          data: serviceIds.map((serviceId: number) => ({
            appointmentId: created.id,
            serviceId: Number(serviceId),
          })),
        });
      }

      if (products.length > 0) {
        await tx.appointmentsProducts.createMany({
          data: products.map(({ productId, quantity }) => ({
            appointmentId: created.id,
            productId,
            quantity,
          })),
        });
      }

      const parsedStatus = parseAppointmentStatus(status);
      if (parsedStatus === "completed") {
        await deductStockForAppointment(tx, created.id);
      }

      return created;
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments", error);
    const message =
      error instanceof Error ? error.message : "Error al crear el turno";
    return NextResponse.json({ message }, { status: 500 });
  }
}
