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
import {
  customerAppointmentSelect,
  customerFullName,
  personFullName,
  staffAppointmentSelect,
} from "@/shared/utils/person-name";
import { assertAppointmentWithinAgendaHours } from "@/shared/utils/agenda-hours";
import { getAgendaHours } from "@/shared/utils/business-settings";
import { isOwnerRole } from "@/shared/utils/roles";

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
            ? { branchId: branchId ?? undefined, userId: staffUserId }
            : branchFilterWhere(branchId)
          : {
              // Appointment.userId = Person.id (no Account.id)
              userId: auth.user.personId ?? -1,
            };

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { appointmentDate: "asc" },
      include: {
        customer: { select: customerAppointmentSelect },
        staff: { select: staffAppointmentSelect },
      },
    });

    const events = appointments.map((a) => {
      const customerName = customerFullName(a.customer);
      const staffName = personFullName(a.staff);
      return {
        id: String(a.id),
        title: `${a.title} - ${customerName}`,
        start: a.appointmentDate.toISOString(),
        extendedProps: {
          description: a.description,
          customer: customerName,
          user: staffName,
          status: a.status,
          branchId: a.branchId,
          userId: a.userId,
        },
      };
    });

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
  } catch (error) {
    console.error("GET /api/appointments", error);
    return NextResponse.json(
      { message: "Error al obtener turnos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (isOwnerRole(auth.user.role)) {
    return NextResponse.json(
      { message: "La dueña solo consulta la agenda; no agenda turnos" },
      { status: 403 },
    );
  }

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

    const when = parseAppointmentDate(appointmentDate);
    const hours = await getAgendaHours();
    assertAppointmentWithinAgendaHours(when, hours);

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
          appointmentDate: when,
          status: parseAppointmentStatus(status),
          reminderSent: "",
        },
      });

      if (serviceIds?.length > 0) {
        await tx.appointmentService.createMany({
          data: serviceIds.map((serviceId: number) => ({
            appointmentId: created.id,
            serviceId: Number(serviceId),
          })),
        });
      }

      if (products.length > 0) {
        await tx.appointmentProduct.createMany({
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
    const status =
      message.includes("Fuera del horario") ||
      message.includes("Producto") ||
      message.includes("stock") ||
      message.includes("sucursal")
        ? 400
        : 500;
    return NextResponse.json({ message }, { status });
  }
}
