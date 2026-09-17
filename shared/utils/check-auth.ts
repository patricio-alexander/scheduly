import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { mapExternalRoleName } from "@/shared/utils/roles";
import {
  AUTH_COOKIE,
  signSessionToken,
  verifySessionToken,
} from "@/shared/utils/session-token";

export { AUTH_COOKIE, signSessionToken, verifySessionToken };

export type AuthSessionUser = {
  /** Account.id */
  id: number;
  personId: number | null;
  username: string;
  name: string;
  email: string;
  role: string;
};

export type AuthResult =
  | { ok: true; user: AuthSessionUser }
  | { ok: false; response: NextResponse };

function cookiePath() {
  // Con basePath (/scheduly) Path="/" es el que el navegador y Next
  // envían/leen de forma fiable en todas las rutas de la app.
  return "/";
}

export function buildAuthCookie(accountId: number) {
  return {
    name: AUTH_COOKIE,
    value: signSessionToken(accountId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: cookiePath(),
    maxAge: 60 * 60 * 24 * 7,
  };
}

/** Variantes de path/secure por si quedó una cookie vieja que no coincide. */
function clearCookieVariants() {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "/scheduly").replace(
    /\/$/,
    "",
  );
  const paths = Array.from(new Set(["/", base].filter(Boolean)));
  const secureFlags =
    process.env.NODE_ENV === "production" ? [true, false] : [false, true];
  const out: Array<{
    name: string;
    value: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
    expires: Date;
  }> = [];
  for (const path of paths) {
    for (const secure of secureFlags) {
      out.push({
        name: AUTH_COOKIE,
        value: "",
        httpOnly: true,
        secure,
        sameSite: "lax",
        path,
        maxAge: 0,
        expires: new Date(0),
      });
    }
  }
  return out;
}

/** Limpia cookie en "/" (y basePath legacy). */
export function clearAuthCookie() {
  return {
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: cookiePath(),
    maxAge: 0,
    expires: new Date(0),
  };
}

export function clearAuthCookieLegacyBasePath() {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "/scheduly").replace(
    /\/$/,
    "",
  );
  if (!base || base === "/") return null;
  return {
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: base,
    maxAge: 0,
    expires: new Date(0),
  };
}

/** Aplica todos los clears posibles a la respuesta de logout/login. */
export function applyClearAuthCookies(response: NextResponse) {
  for (const spec of clearCookieVariants()) {
    response.cookies.set(spec);
  }
  try {
    response.cookies.delete(AUTH_COOKIE);
  } catch {
    /* ignore */
  }
  return response;
}

function personName(person: {
  firstName: string | null;
  firstLastName: string | null;
} | null) {
  if (!person) return "Usuario";
  return [person.firstName, person.firstLastName].filter(Boolean).join(" ") || "Usuario";
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

    const accountId = verifySessionToken(token);
    if (!accountId) {
      return { ok: false, response: unauthorized() };
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        person: true,
        roles: { include: { role: true }, orderBy: { id: "asc" } },
      },
    });

    if (!account || !account.isActive) {
      return { ok: false, response: unauthorized() };
    }

    const personData = account.userId
      ? await prisma.personData.findUnique({ where: { idUser: account.userId } })
      : null;

    const rawRole = account.roles[0]?.role.name ?? "Empleado";
    const role = mapExternalRoleName(rawRole);

    return {
      ok: true,
      user: {
        id: account.id,
        personId: account.userId ?? null,
        username: account.username ?? "",
        name: personName(account.person),
        email: personData?.personalEmail ?? "",
        role,
      },
    };
  } catch (error) {
    console.error("checkAuth", error);
    return { ok: false, response: unauthorized() };
  }
}
