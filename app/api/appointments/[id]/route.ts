import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: Number(id) },
      include: {
        customer: { select: { id: true, name: true, lastnames: true } },
        user: { select: { id: true, name: true } },
        services: {
          include: { service: { select: { id: true, name: true, price: true } } },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { message: "Turno no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...appointment,
      serviceIds: appointment.services.map((s) => s.service.id),
    });
  } catch {
    return NextResponse.json(
      { message: "Error al obtener el turno" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    } = body;

    const appointment = await prisma.appointment.update({
      where: { id: Number(id) },
      data: {
        title,
        description: description ?? "",
        customerId: Number(customerId),
        userId: Number(userId),
        appointmentDate: new Date(appointmentDate),
        status: status ?? "scheduled",
      },
    });

    // Replace all service relations
    await prisma.appointmentsServices.deleteMany({
      where: { appointmentId: Number(id) },
    });

    if (serviceIds?.length > 0) {
      await prisma.appointmentsServices.createMany({
        data: serviceIds.map((serviceId: number) => ({
          appointmentId: appointment.id,
          serviceId: Number(serviceId),
        })),
      });
    }

    return NextResponse.json(appointment);
  } catch {
    return NextResponse.json(
      { message: "Error al actualizar el turno" },
      { status: 500 }
    );
  }
}
