import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { notifyAdminsLowStock } from "@/shared/utils/stock-notify";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";

function parseCategoryId(value: unknown): number | null {
  if (value == null || value === "" || value === "none") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, abbreviation: true } },
      },
    });
    if (!product) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 },
      );
    }
    return NextResponse.json(product);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener el producto" },
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
    const unitIdRaw = Number(body.unitId);
    const unitId =
      Number.isInteger(unitIdRaw) && unitIdRaw > 0 ? unitIdRaw : undefined;

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        name: String(body.name ?? ""),
        price: Number(body.price ?? 0),
        commissionPct: Number(body.commissionPct ?? 0),
        stock: Number(body.stock ?? 0),
        categoryId: parseCategoryId(body.categoryId),
        ...(unitId != null ? { unitId } : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, abbreviation: true } },
      },
    });
    await notifyAdminsLowStock(product);
    return NextResponse.json(product);
  } catch {
    return NextResponse.json(
      { message: "Error al actualizar el producto" },
      { status: 500 },
    );
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
    await prisma.product.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Producto eliminado" });
  } catch {
    return NextResponse.json(
      { message: "Error al eliminar el producto" },
      { status: 500 },
    );
  }
}
