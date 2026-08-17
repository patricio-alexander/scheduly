import type { PrismaClient } from "@/generated/prisma/client";
import { tierFromPoints } from "@/shared/utils/loyalty";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export async function redeemRewardForCustomer(
  tx: Tx,
  params: { customerId: number; rewardId: number; appointmentId?: number },
) {
  const [reward, loyalty, settings] = await Promise.all([
    tx.reward.findUnique({ where: { id: params.rewardId } }),
    tx.customerLoyalty.findUnique({
      where: { customerId: params.customerId },
    }),
    tx.loyaltySettings.findUnique({ where: { id: 1 } }),
  ]);

  if (!reward || !reward.isActive) {
    throw new Error("Premio no disponible");
  }

  const currentPoints = loyalty?.points ?? 0;
  if (currentPoints < reward.pointsCost) {
    throw new Error(
      `Puntos insuficientes. Tienes ${currentPoints} y el premio cuesta ${reward.pointsCost}`,
    );
  }

  const nextPoints = currentPoints - reward.pointsCost;
  const tier = tierFromPoints(
    nextPoints,
    settings?.silverThreshold ?? 100,
    settings?.goldThreshold ?? 300,
  );

  await tx.customerLoyalty.upsert({
    where: { customerId: params.customerId },
    create: {
      customerId: params.customerId,
      points: nextPoints,
      tier,
    },
    update: { points: nextPoints, tier },
  });

  await tx.pointTransaction.create({
    data: {
      customerId: params.customerId,
      points: -reward.pointsCost,
      reason: `Canje: ${reward.name}`,
      rewardId: reward.id,
      appointmentId: params.appointmentId ?? null,
    },
  });

  return {
    reward: {
      id: reward.id,
      name: reward.name,
      pointsCost: reward.pointsCost,
    },
    pointsBefore: currentPoints,
    pointsAfter: nextPoints,
    tier,
  };
}
