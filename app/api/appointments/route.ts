import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { parseAppointmentDate, parseAppointmentStatus } from "@/shared/utils/appointment-api";
import {
  deductStockForAppointment,
  parseAppointmentProducts,
  validateProductStock,
} from "@/shared/utils/appointment-business";
import { getAppointmentCalendarEvent } from "@/shared/utils/appointment-calendar";
import { emitAppointmentCreated } from "@/shared/utils/socket";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  branchFilterWhere,
  getBranchScopeMeta,
  parseBranchId,
  resolveAgendaBranchFilter,
  resolveAgendaStaffUserId,
  resolveAppointmentBranchId,
} from "@/shared/utils/branches";

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const requestedBranchId = parseBranchId(
      new URL(request.url).searchParams.get("branchId"),
    );
    const personalView =
      new URL(request.url).searchParams.get("view") === "mine";
    const requestedStaffId = (() => {
      const raw = new URL(request.url).searchParams.get("userId");
      if (!raw) return null;
      const id = Number(raw);
      return Number.isInteger(id) && id > 0 ? id : null;
    })();

    const { branchId, locked, viewMode } = await resolveAgendaBranchFilter(
      prisma,
      auth.user,
      requestedBranchId,
      personalView,
    );

    const staffUserId = await resolveAgendaStaffUserId(
      prisma,
      auth.user,
      branchId,
      requestedStaffId,
    );

    const where =
      viewMode === "all"
        ? staffUserId
          ? { userId: staffUserId }
          : branchFilterWhere(branchId)
        : viewMode === "branch"
          ? staffUserId
            ? { branchId, userId: staffUserId }
            : branchFilterWhere(branchId)
          : { userId: auth.user.id };

    const appointments = await prisma.appointment.findMany({
      where,
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
        branchId: a.branchId,
        userId: a.userId,
      },
    }));

    const branchScope =
      viewMode === "mine"
        ? { id: null, name: null, locked: true }
        : await getBranchScopeMeta(prisma, branchId, locked);

    return NextResponse.json({
      events,
      branchScope,
      agendaScope:
        viewMode === "mine"
          ? { filter: "mine" as const, userId: auth.user.id }
          : staffUserId
            ? { filter: "employee" as const, userId: staffUserId }
            : viewMode === "branch"
              ? { filter: "branch" as const, userId: null }
              : { filter: "all" as const, userId: null },
    });
  } catch {
    return NextResponse.json(
      { message: "Error al obtener turnos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

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

    let branchId =
      branchIdRaw == null || branchIdRaw === ""
        ? null
        : Number(branchIdRaw);

    branchId = await resolveAppointmentBranchId(prisma, auth.user, branchId);

    const appointment = await prisma.$transaction(async (tx) => {
      const products = parseAppointmentProducts(productsInput, productIds);
      await validateProductStock(tx, products, undefined, branchId);

      const created = await tx.appointment.create({
        data: {
          title,
          description: description ?? "",
          customerId: Number(customerId),
          userId: Number(userId),
          branchId: branchId && branchId > 0 ? branchId : null,
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

    const calendarEvent = await getAppointmentCalendarEvent(appointment.id);
    if (calendarEvent) emitAppointmentCreated(calendarEvent);

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments", error);
    const message =
      error instanceof Error ? error.message : "Error al crear el turno";
    return NextResponse.json({ message }, { status: 500 });
  }
}
