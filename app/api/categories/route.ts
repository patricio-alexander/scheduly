import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        productsCount: c._count.products,
      })),
    );
  } catch (error) {
    console.error("GET /api/categories", error);
    return NextResponse.json(
      { message: "Error al obtener categorías" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

    const category = await prisma.category.create({
      data: { name, description },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories", error);
    const message =
      error instanceof Error && error.message.includes("Unique")
        ? "Ya existe una categoría con ese nombre"
        : "Error al crear la categoría";
    return NextResponse.json({ message }, { status: 400 });
  }
}
