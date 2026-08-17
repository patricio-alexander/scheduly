import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

/** Sucursales activas para reserva pública */
export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, address: true, code: true },
    });
    return NextResponse.json(branches);
  } catch (error) {
    console.error("GET /api/booking/branches", error);
    return NextResponse.json({ message: "Error al obtener sucursales" }, { status: 500 });
  }
}
