import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(id) },
    });
    if (!customer) {
      return NextResponse.json(
        { message: "Cliente no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(customer);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener el cliente" },
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
    const customer = await prisma.customer.update({
      where: { id: Number(id) },
      data: body,
    });
    return NextResponse.json(customer);
  } catch {
    return NextResponse.json(
      { message: "Error al actualizar el cliente" },
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
    await prisma.customer.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Cliente eliminado" });
  } catch {
    return NextResponse.json(
      { message: "Error al eliminar el cliente" },
      { status: 500 }
    );
  }
}
