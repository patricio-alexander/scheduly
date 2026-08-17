import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export const AUTH_COOKIE = "scheduly_session";

export type AuthSessionUser = {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
};

export type AuthResult =
  | { ok: true; user: AuthSessionUser }
  | { ok: false; response: NextResponse };

function getAuthSecret() {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.GESTOR_SYNC_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET o GESTOR_SYNC_SECRET no está configurada");
  }
  return secret;
}

function cookiePath() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
  return base || "/";
}

export function signSessionToken(userId: number) {
  const payload = String(userId);
  const sig = createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): number | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  let expected: string;
  try {
    expected = createHmac("sha256", getAuthSecret()).update(body).digest("hex");
  } catch {
    return null;
  }

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const userId = Number(body);
  return Number.isFinite(userId) && userId > 0 ? userId : null;
}

export function buildAuthCookie(userId: number) {
  return {
    name: AUTH_COOKIE,
    value: signSessionToken(userId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: cookiePath(),
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function clearAuthCookie() {
  return {
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: cookiePath(),
    maxAge: 0,
  };
}

export async function checkAuth(): Promise<AuthResult> {
  const unauthorized = () =>
    NextResponse.json({ message: "No autorizado" }, { status: 401 });

  try {
    const jar = await cookies();
    const token = jar.get(AUTH_COOKIE)?.value;
    if (!token) {
      return { ok: false, response: unauthorized() };
    }

    const userId = verifySessionToken(token);
    if (!userId) {
      return { ok: false, response: unauthorized() };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return { ok: false, response: unauthorized() };
    }

    return { ok: true, user };
  } catch {
    return { ok: false, response: unauthorized() };
  }
}
