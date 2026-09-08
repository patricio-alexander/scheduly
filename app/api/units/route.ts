import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const units = await prisma.unit.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(
      units.map((u) => ({
        id: u.id,
        name: u.name,
        abbreviation: u.abbreviation,
        description: u.description,
        factor: u.factor,
        productsCount: u._count.products,
      })),
    );
  } catch (error) {
    console.error("GET /api/units", error);
    return NextResponse.json(
      { message: "Error al obtener unidades" },
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
    const abbreviation = String(body.abbreviation ?? "").trim();
    const description = String(body.description ?? "").trim() || null;
    const factor = Number(body.factor ?? 1);

    if (!name) {
      return NextResponse.json(
        { message: "El nombre es requerido" },
        { status: 400 },
      );
    }
    if (!abbreviation) {
      return NextResponse.json(
        { message: "La abreviatura es requerida" },
        { status: 400 },
      );
    }

    const unit = await prisma.unit.create({
      data: {
        name,
        abbreviation,
        description,
        factor: Number.isFinite(factor) && factor >= 0 ? factor : 1,
      },
    });
    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    console.error("POST /api/units", error);
    const message =
      error instanceof Error && error.message.includes("Unique")
        ? "Ya existe una unidad con ese nombre"
        : "Error al crear la unidad";
    return NextResponse.json({ message }, { status: 400 });
  }
}
