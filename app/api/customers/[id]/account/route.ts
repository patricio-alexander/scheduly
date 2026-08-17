import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import { hashPassword } from "@/shared/utils/password";

export async function POST(
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
    const body = (await request.json()) as Record<string, unknown>;
    const password = String(body.password ?? "").trim();

    if (password.length < 6) {
      return NextResponse.json(
        { message: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.update({
      where: { id: Number(id) },
      data: { password: await hashPassword(password) },
      select: {
        id: true,
        name: true,
        lastnames: true,
        email: true,
        phone: true,
      },
    });

    return NextResponse.json({
      ...customer,
      hasPortalAccess: true,
      message: "Cuenta de cliente activada",
    });
  } catch {
    return NextResponse.json(
      { message: "Error al activar la cuenta" },
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
    await prisma.customer.update({
      where: { id: Number(id) },
      data: { password: null },
    });
    return NextResponse.json({ message: "Acceso al portal desactivado" });
  } catch {
    return NextResponse.json(
      { message: "Error al desactivar la cuenta" },
      { status: 500 },
    );
  }
}
