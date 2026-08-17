import type { PrismaClient } from "@/generated/prisma/client";
import { lineTotal, toAmount } from "@/shared/utils/money";
import { rewardApplyInclude } from "@/shared/utils/reward-apply";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

type AppointmentLine = {
  services: Array<{ service: { id: number; price: unknown } }>;
  products: Array<{ product: { id: number; price: unknown }; quantity: unknown }>;
};

export type RewardDiscountTarget = {
  id: number;
  name: string;
  description: string;
  pointsCost: number;
  discountPct: number | null;
  serviceId: number | null;
  productId: number | null;
  service?: { id: number; name: string } | null;
  product?: { id: number; name: string } | null;
};

export function calcRewardDiscountAmount(
  reward: Pick<RewardDiscountTarget, "serviceId" | "productId" | "discountPct">,
  appointment: AppointmentLine,
): number {
  const pct = reward.discountPct ?? 0;
  if (pct <= 0) return 0;

  let discount = 0;

  if (reward.serviceId) {
    const line = appointment.services.find(
      ({ service }) => service.id === reward.serviceId,
    );
    if (line) {
      discount += toAmount(line.service.price) * (pct / 100);
    }
  }

  if (reward.productId) {
    const line = appointment.products.find(
      ({ product }) => product.id === reward.productId,
    );
    if (line) {
      discount += lineTotal(line.product.price, line.quantity) * (pct / 100);
    }
  }

  return Math.round(discount * 100) / 100;
}

export async function findClaimableRewardsForAppointment(
  db: Tx,
  customerId: number,
  serviceIds: number[],
  productIds: number[],
) {
  const loyalty = await db.customerLoyalty.findUnique({
    where: { customerId },
    select: { points: true },
  });
  const points = loyalty?.points ?? 0;
  if (points <= 0 || (serviceIds.length === 0 && productIds.length === 0)) {
    return { points, rewards: [] as RewardDiscountTarget[] };
  }

  const orFilters = [
    ...(serviceIds.length > 0 ? [{ serviceId: { in: serviceIds } }] : []),
    ...(productIds.length > 0 ? [{ productId: { in: productIds } }] : []),
  ];

  if (orFilters.length === 0) {
    return { points, rewards: [] as RewardDiscountTarget[] };
  }

  const rewards = await db.reward.findMany({
    where: {
      isActive: true,
      pointsCost: { lte: points },
      OR: orFilters,
    },
    orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }],
    include: rewardApplyInclude,
  });

  return {
    points,
    rewards: rewards.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      pointsCost: r.pointsCost,
      discountPct: r.discountPct,
      serviceId: r.serviceId,
      productId: r.productId,
      service: r.service,
      product: r.product,
    })),
  };
}
