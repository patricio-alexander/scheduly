import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { parseAppointmentDate, parseAppointmentStatus } from "@/shared/utils/appointment-api";
import { deductStockForAppointment, parseAppointmentProducts, validateProductStock } from "@/shared/utils/appointment-business";
import { toAmount, toQuantity } from "@/shared/utils/money";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: Number(id) },
      include: {
        customer: { select: { id: true, name: true, lastnames: true, phone: true, email: true } },
        user: { select: { id: true, name: true } },
        services: {
          include: { service: { select: { id: true, name: true, price: true } } },
        },
        products: {
          include: { product: { select: { id: true, name: true, price: true, stock: true } } },
        },
        payment: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { message: "Turno no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: appointment.id,
      title: appointment.title,
      description: appointment.description,
      appointmentDate: appointment.appointmentDate.toISOString(),
      status: appointment.status,
      stockDeducted: appointment.stockDeducted,
      customer: appointment.customer,
      user: appointment.user,
      payment: appointment.payment
        ? {
            ...appointment.payment,
            amount: toAmount(appointment.payment.amount),
          }
        : null,
      serviceIds: appointment.services.map((s) => s.service.id),
      services: appointment.services.map((s) => ({
        service: {
          id: s.service.id,
          name: s.service.name,
          price: toAmount(s.service.price),
        },
      })),
      products: appointment.products.map((p) => ({
        productId: p.product.id,
        quantity: toQuantity(p.quantity),
        product: {
          id: p.product.id,
          name: p.product.name,
          price: toAmount(p.product.price),
          stock: toAmount(p.product.stock),
        },
      })),
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
      productIds,
      products: productsInput,
    } = body;

    const appointment = await prisma.$transaction(async (tx) => {
      const products = parseAppointmentProducts(productsInput, productIds);
      await validateProductStock(tx, products, Number(id));

      const updated = await tx.appointment.update({
        where: { id: Number(id) },
        data: {
          title,
          description: description ?? "",
          customerId: Number(customerId),
          userId: Number(userId),
          appointmentDate: parseAppointmentDate(appointmentDate),
          status: parseAppointmentStatus(status),
        },
      });

      await tx.appointmentsServices.deleteMany({
        where: { appointmentId: Number(id) },
      });

      await tx.appointmentsProducts.deleteMany({
        where: { appointmentId: Number(id) },
      });

      if (serviceIds?.length > 0) {
        await tx.appointmentsServices.createMany({
          data: serviceIds.map((serviceId: number) => ({
            appointmentId: updated.id,
            serviceId: Number(serviceId),
          })),
        });
      }

      if (products.length > 0) {
        await tx.appointmentsProducts.createMany({
          data: products.map(({ productId, quantity }) => ({
            appointmentId: updated.id,
            productId,
            quantity,
          })),
        });
      }

      const parsedStatus = parseAppointmentStatus(status);
      if (parsedStatus === "completed") {
        await deductStockForAppointment(tx, updated.id);
      }

      return updated;
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("PUT /api/appointments/[id]", error);
    const message =
      error instanceof Error ? error.message : "Error al actualizar el turno";
    return NextResponse.json({ message }, { status: 500 });
  }
}
