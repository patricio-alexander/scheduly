import { NextResponse } from "next/server";
import { fetchSubscriptionPlans } from "@/shared/utils/subscription-sync";

export async function GET() {
  try {
    const plans = await fetchSubscriptionPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error("GET /api/plans", error);
    const message =
      error instanceof Error ? error.message : "Error al obtener los planes";
    return NextResponse.json({ message }, { status: 400 });
  }
}
