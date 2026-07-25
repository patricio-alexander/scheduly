import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { hashPassword } from "@/shared/utils/password";
import { checkAuth } from "@/shared/utils/check-auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const body = await request.json();
    const { username, name, email, role } = body;
    const password =
      typeof body.password === "string" ? body.password.trim() : "";

    if (!username || !name || !email || !role) {
      return NextResponse.json(
        { message: "Datos incompletos" },
        { status: 400 },
      );
    }

    if (password && password.length < 4) {
      return NextResponse.json(
        { message: "La contraseña debe tener al menos 4 caracteres" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findFirst({
      where: { username, NOT: { id: Number(id) } },
    });
    if (existing) {
      return NextResponse.json(
        { message: "El nombre de usuario ya existe" },
        { status: 409 }
      );
    }

    const data: {
      username: string;
      name: string;
      email: string;
      role: string;
      password?: string;
    } = { username, name, email, role };

    if (password) {
      data.password = await hashPassword(password);
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data,
      select: { id: true, username: true, name: true, email: true, role: true },
    });

    return NextResponse.json({
      ...user,
      passwordUpdated: Boolean(password),
    });
  } catch (error) {
    console.error("PUT /api/users/[id]", error);
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
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

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
