import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { products: true } } },
    });
    if (!category) {
      return NextResponse.json(
        { message: "Categoría no encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      id: category.id,
      name: category.name,
      description: category.description,
      productsCount: category._count.products,
    });
  } catch {
    return NextResponse.json(
      { message: "Error al obtener la categoría" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { message: "El nombre es requerido" },
        { status: 400 },
      );
    }

    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: { name, description },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error("PUT /api/categories/[id]", error);
    const message =
      error instanceof Error && error.message.includes("Unique")
        ? "Ya existe una categoría con ese nombre"
        : "Error al actualizar la categoría";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const productsCount = await prisma.product.count({
      where: { categoryId: Number(id) },
    });
    if (productsCount > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar: hay ${productsCount} producto(s) asociados`,
        },
        { status: 400 },
      );
    }

    await prisma.category.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Categoría eliminada" });
  } catch {
    return NextResponse.json(
      { message: "Error al eliminar la categoría" },
      { status: 500 },
    );
  }
}
