import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
    });
    if (!product) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(product);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener el producto" },
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
    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: body,
    });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json(
      { message: "Error al actualizar el producto" },
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
    await prisma.product.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Producto eliminado" });
  } catch {
    return NextResponse.json(
      { message: "Error al eliminar el producto" },
      { status: 500 }
    );
  }
}
