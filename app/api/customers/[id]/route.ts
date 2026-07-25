import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  emitCustomerDeleted,
  emitCustomerUpdated,
} from "@/shared/utils/socket";
import { checkAuth } from "@/shared/utils/check-auth";

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
    });
    if (!customer) {
      return NextResponse.json(
        { message: "Cliente no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(customer);
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

  const { id } = await params;
  try {
    const body = await request.json();
    const customer = await prisma.customer.update({
      where: { id: Number(id) },
      data: body,
    });
    emitCustomerUpdated(customer);
    return NextResponse.json(customer);
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
