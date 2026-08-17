import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isAdminRole } from "@/shared/utils/roles";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  try {
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      return NextResponse.json(
        { message: "Proveedor no encontrado" },
        { status: 404 },
      );
    }
    return NextResponse.json(supplier);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener el proveedor" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isAdminRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
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

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        phone: String(body.phone ?? "").trim(),
        email: String(body.email ?? "").trim(),
        taxId: body.taxId ? String(body.taxId).trim() : null,
        address: String(body.address ?? "").trim(),
      },
    });

    return NextResponse.json(supplier);
  } catch {
    return NextResponse.json(
      { message: "Error al actualizar el proveedor" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isAdminRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  try {
    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "Error al eliminar el proveedor" },
      { status: 500 },
    );
  }
}
