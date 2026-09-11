import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  isManagementRole,
  isPureEmployeeRole,
} from "@/shared/utils/roles";
import { hashPassword } from "@/shared/utils/password";
import { getBusinessSettings } from "@/shared/utils/business-settings";

async function canActivatePortal(role: string | null | undefined) {
  if (isManagementRole(role)) return true;
  if (!isPureEmployeeRole(role)) return false;
  const settings = await getBusinessSettings();
  return settings.operationFlags?.portalPasswordAllowEmployee !== false;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!(await canActivatePortal(auth.user.role))) {
    return NextResponse.json(
      {
        message:
          "No autorizado · la dueña no permite que empleados activen el portal",
      },
      { status: 403 },
    );
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
        firstLastName: true,
        email: true,
        phone: true,
        cedula: true,
        identType: true,
      },
    });

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      lastnames: customer.firstLastName ?? "",
      email: customer.email,
      phone: customer.phone,
      identification: customer.cedula,
      identificationType: customer.identType,
      hasPortalAccess: true,
      activatedBy: isPureEmployeeRole(auth.user.role) ? "employee" : "management",
      message: "Cuenta de cliente activada",
    });
  } catch (error) {
    console.error("POST /api/customers/[id]/account", error);
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
  if (!(await canActivatePortal(auth.user.role))) {
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
