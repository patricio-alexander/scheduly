import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

/** Profesionales disponibles por sucursal (reserva pública) */
export async function GET(request: Request) {
  try {
    const branchId = Number(new URL(request.url).searchParams.get("branchId"));
    if (!Number.isInteger(branchId) || branchId <= 0) {
      return NextResponse.json({ message: "branchId inválido" }, { status: 400 });
    }

    const staff = await prisma.user.findMany({
      where: {
        branches: { some: { branchId } },
        role: { in: ["employee", "user"] },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error("GET /api/booking/staff", error);
    return NextResponse.json({ message: "Error al obtener profesionales" }, { status: 500 });
  }
}
