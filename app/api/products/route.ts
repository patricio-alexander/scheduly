import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";

function parseCategoryId(value: unknown): number | null {
  if (value == null || value === "" || value === "none") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const products = await prisma.product.findMany({
      orderBy: { id: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, abbreviation: true } },
      },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products", error);
    return NextResponse.json(
      { message: "Error al obtener productos" },
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
    if (!name) {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }

    let unitId = Number(body.unitId);
    if (!Number.isInteger(unitId) || unitId <= 0) {
      const unit =
        (await prisma.unit.findFirst({ orderBy: { id: "asc" } })) ??
        (await prisma.unit.create({
          data: { name: "Unidad", abbreviation: "u" },
        }));
      unitId = unit.id;
    }

    const product = await prisma.product.create({
      data: {
        name,
        price: Number(body.price ?? 0),
        commissionPct: Number(body.commissionPct ?? 0),
        stock: Number(body.stock ?? 0),
        minStock: Number(body.minStock ?? 0),
        unitId,
        categoryId: parseCategoryId(body.categoryId),
        sku:
          body.sku != null && String(body.sku).trim()
            ? String(body.sku).trim()
            : undefined,
      },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, abbreviation: true } },
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("POST /api/products", error);
    const message =
      error instanceof Error ? error.message : "Error al crear el producto";
    return NextResponse.json({ message }, { status: 500 });
  }
}
