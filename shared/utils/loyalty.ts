import type { PrismaClient } from "@/generated/prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export function tierFromPoints(
  points: number,
  silver: number,
  gold: number,
): "bronze" | "silver" | "gold" {
  if (points >= gold) return "gold";
  if (points >= silver) return "silver";
  return "bronze";
}

export async function awardLoyaltyForPayment(
  tx: Tx,
  params: {
    customerId: number;
    appointmentId: number;
    paidAmount: number;
  },
) {
  const settings = await tx.loyaltySettings.upsert({
    where: { id: 1 },
    create: {},
    update: {},
  });

  const amountPoints = Math.floor(
    (params.paidAmount / settings.amountUnit) * settings.pointsPerAmount,
  );
  const totalPoints = settings.pointsPerAppointment + amountPoints;
  if (totalPoints <= 0) return;

  const existing = await tx.customerLoyalty.findUnique({
    where: { customerId: params.customerId },
  });

  const nextPoints = (existing?.points ?? 0) + totalPoints;
  const tier = tierFromPoints(
    nextPoints,
    settings.silverThreshold,
    settings.goldThreshold,
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
      points: totalPoints,
      reason: "Turno completado",
      appointmentId: params.appointmentId,
    },
  });
}
