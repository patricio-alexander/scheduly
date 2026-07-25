import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { loginSchema } from "@/src/features/auth/lib/auth-schema";
import { hashPassword, isBcryptHash, verifyPassword } from "@/shared/utils/password";
import { buildAuthCookie } from "@/shared/utils/check-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos inválidos" },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json(
        { message: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    if (!isBcryptHash(user.password)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(password) },
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    const response = NextResponse.json(userWithoutPassword);
    response.cookies.set(buildAuthCookie(user.id));
    return response;
  } catch {
    return NextResponse.json(
      { message: "Error del servidor" },
      { status: 500 }
    );
  }
}
