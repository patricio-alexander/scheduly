import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function GET() {
  try {
    const services = await prisma.service.findMany({ orderBy: { id: "desc" } });
    return NextResponse.json(services);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener servicios" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const service = await prisma.service.create({ data: body });
    return NextResponse.json(service, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Error al crear el servicio" },
      { status: 500 }
    );
  }
}
