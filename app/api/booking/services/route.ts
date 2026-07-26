import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

/** Catálogo público de servicios para reserva (sin auth) */
export async function GET() {
  try {
    const services = await prisma.service.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        durationMinutes: true,
      },
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("GET /api/booking/services", error);
    return NextResponse.json(
      { message: "Error al obtener servicios" },
      { status: 500 },
    );
  }
}
