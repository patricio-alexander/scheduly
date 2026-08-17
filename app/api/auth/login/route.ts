import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { loginSchema } from "@/src/features/auth/lib/auth-schema";
import { hashPassword, isBcryptHash, verifyPassword } from "@/shared/utils/password";
import { buildAuthCookie } from "@/shared/utils/check-auth";
import { serializeAuthUser } from "@/shared/utils/auth-user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Datos inválidos" }, { status: 400 });
    }

    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 });
    }

    if (!isBcryptHash(user.password)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(password) },
      });
    }

    const authUser = await serializeAuthUser(prisma, user.id);
    if (!authUser) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    const response = NextResponse.json(authUser);
    response.cookies.set(buildAuthCookie(user.id));
    return response;
  } catch (error) {
    console.error("POST /api/auth/login", error);
    return NextResponse.json({ message: "Error del servidor" }, { status: 500 });
  }
}
