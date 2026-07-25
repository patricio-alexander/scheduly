import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/shared/utils/check-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearAuthCookie());
  return response;
}
