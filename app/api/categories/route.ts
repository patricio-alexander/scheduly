import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

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
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

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
