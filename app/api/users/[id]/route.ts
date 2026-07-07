import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { hashPassword } from "@/shared/utils/password";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { username, name, email, password, role } = body;

    const existing = await prisma.user.findFirst({
      where: { username, NOT: { id: Number(id) } },
    });
    if (existing) {
      return NextResponse.json(
        { message: "El nombre de usuario ya existe" },
        { status: 409 }
      );
    }

    const data: Record<string, string> = { username, name, email, role };
    if (password) data.password = await hashPassword(password);

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data,
      select: { id: true, username: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { message: "Error al actualizar el usuario" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.user.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Usuario eliminado" });
  } catch {
    return NextResponse.json(
      { message: "Error al eliminar el usuario" },
      { status: 500 }
    );
  }
}
