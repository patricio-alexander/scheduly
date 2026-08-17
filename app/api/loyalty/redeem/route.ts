import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkCustomerAuth, serializeCustomerSession } from "@/shared/utils/check-customer-auth";
import { redeemRewardForCustomer } from "@/shared/utils/loyalty-redeem";

export async function POST(request: Request) {
  const auth = await checkCustomerAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const rewardId = Number(body.rewardId);

    if (!Number.isInteger(rewardId) || rewardId <= 0) {
      return NextResponse.json({ message: "Premio inválido" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) =>
      redeemRewardForCustomer(tx, {
        customerId: auth.customer.id,
        rewardId,
      }),
    );

    const customer = await serializeCustomerSession(auth.customer.id);

    return NextResponse.json({
      ...result,
      customer,
      message: `Canjeaste "${result.reward.name}" por ${result.reward.pointsCost} puntos`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al canjear el premio";
    return NextResponse.json({ message }, { status: 400 });
  }
}
