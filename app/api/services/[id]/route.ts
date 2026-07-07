import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const service = await prisma.service.findUnique({
      where: { id: Number(id) },
    });
    if (!service) {
      return NextResponse.json(
        { message: "Servicio no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(service);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener el servicio" },
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
    const service = await prisma.service.update({
      where: { id: Number(id) },
      data: body,
    });
    return NextResponse.json(service);
  } catch {
    return NextResponse.json(
      { message: "Error al actualizar el servicio" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.service.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Servicio eliminado" });
  } catch {
    return NextResponse.json(
      { message: "Error al eliminar el servicio" },
      { status: 500 }
    );
  }
}
