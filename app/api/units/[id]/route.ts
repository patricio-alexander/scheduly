import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { products: true } } },
    });
    if (!unit) {
      return NextResponse.json(
        { message: "Unidad no encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      id: unit.id,
      name: unit.name,
      abbreviation: unit.abbreviation,
      description: unit.description,
      factor: unit.factor,
      productsCount: unit._count.products,
    });
  } catch {
    return NextResponse.json(
      { message: "Error al obtener la unidad" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
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

    const unit = await prisma.unit.update({
      where: { id: Number(id) },
      data: {
        name,
        abbreviation,
        description,
        factor: Number.isFinite(factor) && factor >= 0 ? factor : 1,
      },
    });
    return NextResponse.json(unit);
  } catch (error) {
    console.error("PUT /api/units/[id]", error);
    const message =
      error instanceof Error && error.message.includes("Unique")
        ? "Ya existe una unidad con ese nombre"
        : "Error al actualizar la unidad";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const productsCount = await prisma.product.count({
      where: { unitId: Number(id) },
    });
    if (productsCount > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar: hay ${productsCount} producto(s) asociados`,
        },
        { status: 400 },
      );
    }

    await prisma.unit.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Unidad eliminada" });
  } catch {
    return NextResponse.json(
      { message: "Error al eliminar la unidad" },
      { status: 500 },
    );
  }
}
