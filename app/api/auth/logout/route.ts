import { NextResponse } from "next/server";
import { applyClearAuthCookies } from "@/shared/utils/check-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true, cleared: true });
  applyClearAuthCookies(response);
  // Evita caches intermedias que reutilicen Set-Cookie
  response.headers.set("Cache-Control", "no-store");
  return response;
}
