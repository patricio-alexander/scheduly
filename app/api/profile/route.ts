import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ message: "userId requerido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        bio: true,
        photo: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener perfil" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const body = await request.json();

    if (!userId) {
      return NextResponse.json({ message: "userId requerido" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        bio: body.bio,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        bio: true,
        photo: true,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { message: "Error al actualizar perfil" },
      { status: 500 }
    );
  }
}
