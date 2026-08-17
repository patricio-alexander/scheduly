import { NextResponse } from "next/server";
import {
  checkCustomerAuth,
  clearCustomerAuthCookie,
} from "@/shared/utils/check-customer-auth";

export async function POST() {
  const auth = await checkCustomerAuth();
  if (!auth.ok) {
    const response = NextResponse.json({ message: "Sesión cerrada" });
    response.cookies.set(clearCustomerAuthCookie());
    return response;
  }

  const response = NextResponse.json({ message: "Sesión cerrada" });
  response.cookies.set(clearCustomerAuthCookie());
  return response;
}
