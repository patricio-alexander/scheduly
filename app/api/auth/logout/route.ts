import { NextResponse } from "next/server";
import {
  clearAuthCookie,
  clearAuthCookieLegacyBasePath,
} from "@/shared/utils/check-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearAuthCookie());
  const legacy = clearAuthCookieLegacyBasePath();
  if (legacy) response.cookies.set(legacy);
  return response;
}
