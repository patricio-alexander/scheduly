import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { verifyPassword } from "@/shared/utils/password";

/**
 * Canal público: consultar turnos con cédula o correo + clave del portal.
 * No usa login de staff.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const rawId = String(
      body.identifier ?? body.email ?? body.cedula ?? "",
    ).trim();
    const password = String(body.password ?? "");

    if (!rawId || !password) {
      return NextResponse.json(
        { message: "Indica cédula o correo, y la clave que te dio el local" },
        { status: 400 },
      );
    }

    const emailKey = rawId.toLowerCase();
    const found = await prisma.customer.findFirst({
      where: {
        isActive: true,
        OR: [{ email: emailKey }, { email: rawId }, { cedula: rawId }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        cedula: true,
        password: true,
      },
    });

    if (!found?.password || !(await verifyPassword(password, found.password))) {
      return NextResponse.json(
        { message: "No encontramos ese turno o la clave no coincide" },
        { status: 401 },
      );
    }

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        customerId: found.id,
        status: { notIn: ["cancelled"] },
        appointmentDate: { gte: from },
      },
      orderBy: { appointmentDate: "asc" },
      take: 12,
      include: {
        services: {
          include: {
            service: {
              select: { id: true, name: true, durationMinutes: true },
            },
          },
        },
        staff: {
          select: {
            id: true,
            firstName: true,
            secondName: true,
            firstLastName: true,
            secondLastName: true,
          },
        },
        branch: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      customer: {
        id: found.id,
        name: found.name,
        email: found.email,
        cedula: found.cedula,
      },
      appointments: appointments.map((a) => {
        const staffName = [
          a.staff?.firstName,
          a.staff?.secondName,
          a.staff?.firstLastName,
          a.staff?.secondLastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        return {
          id: a.id,
          title: a.title,
          status: a.status,
          appointmentDate: a.appointmentDate.toISOString(),
          branchName: a.branch?.name ?? null,
          staffName: staffName || null,
          services: a.services.map((s) => ({
            id: s.service.id,
            name: s.service.name,
            durationMinutes: s.service.durationMinutes,
          })),
        };
      }),
    });
  } catch (error) {
    console.error("POST /api/public/mi-turno", error);
    return NextResponse.json(
      { message: "Error al consultar tu turno" },
      { status: 500 },
    );
  }
}
