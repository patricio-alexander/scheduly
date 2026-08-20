import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isAdminRole } from "@/shared/utils/roles";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        tradeName: true,
        phone: true,
        email: true,
        address: true,
        identNumber: true,
      },
    });
    return NextResponse.json(
      suppliers.map((s) => ({
        ...s,
        taxId: s.identNumber,
      })),
    );
  } catch (error) {
    console.error("GET /api/suppliers", error);
    return NextResponse.json(
      { message: "Error al obtener proveedores" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isAdminRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { message: "El nombre es requerido" },
        { status: 400 },
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        phone: String(body.phone ?? "").trim() || null,
        email: String(body.email ?? "").trim() || null,
        identNumber:
          String(body.taxId ?? body.identNumber ?? "").trim() || null,
        address: String(body.address ?? "").trim() || null,
      },
    });

    return NextResponse.json(
      { ...supplier, taxId: supplier.identNumber },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/suppliers", error);
    return NextResponse.json(
      { message: "Error al crear el proveedor" },
      { status: 500 },
    );
  }
}
