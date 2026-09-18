import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { customerLastnames } from "@/shared/utils/person-name";
import { redeemRewardForCustomer } from "@/shared/utils/loyalty-redeem";
import { assertLoyaltyCustomerAccess } from "@/shared/utils/loyalty-customer-access";
import { isManagementRole } from "@/shared/utils/roles";

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const customerId = Number(body.customerId);
    const rewardId = Number(body.rewardId);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json({ message: "Cliente inválido" }, { status: 400 });
    }
    if (!Number.isInteger(rewardId) || rewardId <= 0) {
      return NextResponse.json({ message: "Premio inválido" }, { status: 400 });
    }

    const access = await assertLoyaltyCustomerAccess({
      customerId,
      role: auth.user.role,
      userId: auth.user.id,
    });
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }

    const result = await prisma.$transaction(async (tx) =>
      redeemRewardForCustomer(tx, { customerId, rewardId, source: "admin" }),
    );

    return NextResponse.json({
      ...result,
      customer: {
        id: access.customer.id,
        name: access.customer.name,
        lastnames: customerLastnames(access.customer),
        points: result.pointsAfter,
        tier: result.tier,
      },
      message: `Canje registrado: "${result.reward.name}" (${result.reward.pointsCost} pts)`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al canjear el premio";
    return NextResponse.json({ message }, { status: 400 });
  }
}
