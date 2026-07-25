import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { fetchSubscriptionModules } from "@/shared/utils/subscription-sync";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const modules = await fetchSubscriptionModules();
    return NextResponse.json(modules);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al obtener los módulos";
    return NextResponse.json({ message }, { status: 400 });
  }
}
