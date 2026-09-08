import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { parseAppointmentDate, parseAppointmentStatus } from "@/shared/utils/appointment-api";
import { deductStockForAppointment, parseAppointmentProducts, validateProductStock, deleteAppointmentRecord } from "@/shared/utils/appointment-business";
import { findClaimableRewardsForAppointment } from "@/shared/utils/reward-discount";
import { toAmount, toQuantity } from "@/shared/utils/money";
import { getAppointmentCalendarEvent } from "@/shared/utils/appointment-calendar";
import { emitAppointmentDeleted, emitAppointmentUpdated } from "@/shared/utils/socket";
import { checkAuth } from "@/shared/utils/check-auth";
import { getUserPrimaryBranchId, resolveAppointmentBranchId } from "@/shared/utils/branches";
import { canDeleteRecords, isBranchAdminRole } from "@/shared/utils/roles";
import {
  customerAppointmentSelect,
  serializeCustomerForAgenda,
  serializeStaffAsUser,
  staffAppointmentSelect,
} from "@/shared/utils/person-name";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: Number(id) },
      include: {
        customer: { select: customerAppointmentSelect },
        staff: { select: staffAppointmentSelect },
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

    const serviceIds = appointment.services.map((s) => s.service.id);
    const productIds = appointment.products.map((p) => p.product.id);
    const loyalty = await findClaimableRewardsForAppointment(
      prisma,
      appointment.customerId,
      serviceIds,
      productIds,
    );

    return NextResponse.json({
      id: appointment.id,
      title: appointment.title,
      description: appointment.description,
      appointmentDate: appointment.appointmentDate.toISOString(),
      status: appointment.status,
      stockDeducted: appointment.stockDeducted,
      customer: serializeCustomerForAgenda(appointment.customer),
      user: serializeStaffAsUser(appointment.staff),
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
      customerPoints: loyalty.points,
      claimableRewards: loyalty.rewards,
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
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const body = await request.json();
    const {
      title,
      description,
      customerId,
      userId,
      branchId: branchIdRaw,
      appointmentDate,
      status,
      serviceIds,
      productIds,
      products: productsInput,
    } = body;

    const branchId =
      branchIdRaw == null || branchIdRaw === ""
        ? null
        : Number(branchIdRaw);

    const appointment = await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findUnique({
        where: { id: Number(id) },
        select: { branchId: true },
      });
      const resolvedBranchId = await resolveAppointmentBranchId(
        tx,
        auth.user,
        branchId,
        existing?.branchId,
      );
      const stockBranchId = resolvedBranchId;
      const products = parseAppointmentProducts(productsInput, productIds);
      await validateProductStock(tx, products, Number(id), stockBranchId);

      const updated = await tx.appointment.update({
        where: { id: Number(id) },
        data: {
          title,
          description: description ?? "",
          customerId: Number(customerId),
          userId: Number(userId),
          branchId: resolvedBranchId,
          appointmentDate: parseAppointmentDate(appointmentDate),
          status: parseAppointmentStatus(status),
        },
      });

      await tx.appointmentService.deleteMany({
        where: { appointmentId: Number(id) },
      });

      await tx.appointmentProduct.deleteMany({
        where: { appointmentId: Number(id) },
      });

      if (serviceIds?.length > 0) {
        await tx.appointmentService.createMany({
          data: serviceIds.map((serviceId: number) => ({
            appointmentId: updated.id,
            serviceId: Number(serviceId),
          })),
        });
      }

      if (products.length > 0) {
        await tx.appointmentProduct.createMany({
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

    const calendarEvent = await getAppointmentCalendarEvent(appointment.id);
    if (calendarEvent) emitAppointmentUpdated(calendarEvent);

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("PUT /api/appointments/[id]", error);
    const message =
      error instanceof Error ? error.message : "Error al actualizar el turno";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/** Reprogramar turno (drag & drop del calendario) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const appointmentId = Number(id);
    if (!Number.isFinite(appointmentId)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    if (typeof body.appointmentDate !== "string" || !body.appointmentDate) {
      return NextResponse.json(
        { message: "appointmentDate es requerido" },
        { status: 400 },
      );
    }

    const existing = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Turno no encontrado" },
        { status: 404 },
      );
    }

    const appointmentDate = parseAppointmentDate(body.appointmentDate);
    const nextStatus =
      existing.status === "scheduled" || existing.status === "rescheduled"
        ? "rescheduled"
        : existing.status;

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        appointmentDate,
        status: nextStatus,
      },
    });

    const calendarEvent = await getAppointmentCalendarEvent(appointmentId);
    if (calendarEvent) emitAppointmentUpdated(calendarEvent);

    return NextResponse.json(calendarEvent ?? { id: appointmentId });
  } catch (error) {
    console.error("PATCH /api/appointments/[id]", error);
    const message =
      error instanceof Error ? error.message : "Error al reprogramar el turno";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!canDeleteRecords(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const appointmentId = Number(id);
  if (!Number.isFinite(appointmentId)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  try {
    const existing = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, branchId: true },
    });

    if (!existing) {
      return NextResponse.json({ message: "Turno no encontrado" }, { status: 404 });
    }

    if (isBranchAdminRole(auth.user.role)) {
      const branchId = await getUserPrimaryBranchId(prisma, auth.user.id);
      if (existing.branchId !== branchId) {
        return NextResponse.json(
          { message: "No puedes eliminar turnos de otra sucursal" },
          { status: 403 },
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await deleteAppointmentRecord(tx, appointmentId);
    });

    emitAppointmentDeleted(appointmentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/appointments/[id]", error);
    const message =
      error instanceof Error ? error.message : "Error al eliminar el turno";
    return NextResponse.json({ message }, { status: 500 });
  }
}
