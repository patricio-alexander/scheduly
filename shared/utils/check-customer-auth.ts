import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { tierFromPoints } from "@/shared/utils/loyalty";

export const CUSTOMER_AUTH_COOKIE = "scheduly_customer_session";

export type CustomerSessionUser = {
  id: number;
  name: string;
  lastnames: string;
  email: string;
  phone: string;
  points: number;
  tier: string;
};

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

export function signCustomerSessionToken(customerId: number) {
  const payload = `c${customerId}`;
  const sig = createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifyCustomerSessionToken(token: string): number | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !payload.startsWith("c")) return null;

  let expected: string;
  try {
    expected = createHmac("sha256", getAuthSecret())
      .update(payload)
      .digest("hex");
  } catch {
    return null;
  }

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const customerId = Number(payload.slice(1));
  return Number.isFinite(customerId) && customerId > 0 ? customerId : null;
}

export function buildCustomerAuthCookie(customerId: number) {
  return {
    name: CUSTOMER_AUTH_COOKIE,
    value: signCustomerSessionToken(customerId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: cookiePath(),
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function clearCustomerAuthCookie() {
  return {
    name: CUSTOMER_AUTH_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: cookiePath(),
    maxAge: 0,
  };
}

async function serializeCustomerSession(
  customerId: number,
): Promise<CustomerSessionUser | null> {
  const [customer, loyalty, settings] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        lastnames: true,
        email: true,
        phone: true,
        password: true,
      },
    }),
    prisma.customerLoyalty.findUnique({ where: { customerId } }),
    prisma.loyaltySettings.findUnique({ where: { id: 1 } }),
  ]);

  if (!customer?.password) return null;

  const points = loyalty?.points ?? 0;
  const tier =
    loyalty?.tier ??
    tierFromPoints(
      points,
      settings?.silverThreshold ?? 100,
      settings?.goldThreshold ?? 300,
    );

  return {
    id: customer.id,
    name: customer.name,
    lastnames: customer.lastnames,
    email: customer.email,
    phone: customer.phone,
    points,
    tier,
  };
}

export async function checkCustomerAuth(): Promise<
  | { ok: true; customer: CustomerSessionUser }
  | { ok: false; response: NextResponse }
> {
  const unauthorized = () =>
    NextResponse.json({ message: "No autorizado" }, { status: 401 });

  try {
    const jar = await cookies();
    const token = jar.get(CUSTOMER_AUTH_COOKIE)?.value;
    if (!token) {
      return { ok: false, response: unauthorized() };
    }

    const customerId = verifyCustomerSessionToken(token);
    if (!customerId) {
      return { ok: false, response: unauthorized() };
    }

    const customer = await serializeCustomerSession(customerId);
    if (!customer) {
      return { ok: false, response: unauthorized() };
    }

    return { ok: true, customer };
  } catch {
    return { ok: false, response: unauthorized() };
  }
}

export { serializeCustomerSession };
