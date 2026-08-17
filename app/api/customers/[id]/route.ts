import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  emitCustomerDeleted,
  emitCustomerUpdated,
} from "@/shared/utils/socket";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        lastnames: true,
        phone: true,
        email: true,
        password: true,
      },
    });
    if (!customer) {
      return NextResponse.json(
        { message: "Cliente no encontrado" },
        { status: 404 }
      );
    }
    const { password, ...rest } = customer;
    return NextResponse.json({ ...rest, hasPortalAccess: Boolean(password) });
  } catch {
    return NextResponse.json(
      { message: "Error al obtener el cliente" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const { password: _pw, ...data } = body as Record<string, unknown>;
    const customer = await prisma.customer.update({
      where: { id: Number(id) },
      data,
      select: {
        id: true,
        name: true,
        lastnames: true,
        phone: true,
        email: true,
        password: true,
      },
    });
    const { password, ...rest } = customer;
    emitCustomerUpdated(rest);
    return NextResponse.json({ ...rest, hasPortalAccess: Boolean(password) });
  } catch {
    return NextResponse.json(
      { message: "Error al actualizar el cliente" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const customerId = Number(id);
    await prisma.customer.delete({ where: { id: customerId } });
    emitCustomerDeleted(customerId);
    return NextResponse.json({ message: "Cliente eliminado" });
  } catch {
    return NextResponse.json(
      { message: "Error al eliminar el cliente" },
      { status: 500 }
    );
  }
}
