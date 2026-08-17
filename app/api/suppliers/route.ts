import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isAdminRole } from "@/shared/utils/roles";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(suppliers);
  } catch {
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
        phone: String(body.phone ?? "").trim(),
        email: String(body.email ?? "").trim(),
        taxId: body.taxId ? String(body.taxId).trim() : null,
        address: String(body.address ?? "").trim(),
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Error al crear el proveedor" },
      { status: 500 },
    );
  }
}
