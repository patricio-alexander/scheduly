import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { hashPassword } from "@/shared/utils/password";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, email: true, role: true, photo: true },
      orderBy: { id: "desc" },
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, name, email, password, role } = body;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { message: "El nombre de usuario ya existe" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        username,
        name,
        email,
        password: await hashPassword(password),
        role: role ?? "user",
      },
      select: { id: true, username: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Error al crear el usuario" },
      { status: 500 }
    );
  }
}
