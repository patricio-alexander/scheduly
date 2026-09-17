import { createHmac, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE = "scheduly_session";

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET no está configurada");
  }
  return secret;
}

export function signSessionToken(accountId: number) {
  const payload = String(accountId);
  const signature = createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): number | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  let expected: string;
  try {
    expected = createHmac("sha256", getAuthSecret())
      .update(body)
      .digest("hex");
  } catch {
    return null;
  }

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  const accountId = Number(body);
  return Number.isFinite(accountId) && accountId > 0 ? accountId : null;
}
