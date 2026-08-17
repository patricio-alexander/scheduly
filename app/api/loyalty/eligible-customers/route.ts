import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { getUserPrimaryBranchId } from "@/shared/utils/branches";
import { rewardApplyInclude } from "@/shared/utils/reward-apply";
import { isBranchAdminRole, isManagementRole, isOwnerRole } from "@/shared/utils/roles";

function customerBranchFilter(branchId: number) {
  return {
    OR: [
      { appointments: { some: { branchId } } },
      { productSales: { some: { branchId } } },
    ],
  };
}

function mapRedemption(
  tx: {
    id: number;
    customerId: number;
    points: number;
    createdAt: Date;
    customer: { name: string; lastnames: string };
    reward: { id: number; name: string; description: string; pointsCost: number; service: { id: number; name: string } | null; product: { id: number; name: string } | null } | null;
  },
) {
  if (!tx.reward) return null;

  return {
    id: tx.id,
    customerId: tx.customerId,
    customerName: `${tx.customer.name} ${tx.customer.lastnames}`.trim(),
    points: tx.points,
    redeemedAt: tx.createdAt.toISOString(),
    reward: {
      id: tx.reward.id,
      name: tx.reward.name,
      description: tx.reward.description,
      pointsCost: tx.reward.pointsCost,
      service: tx.reward.service,
      product: tx.reward.product,
    },
  };
}

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const [rewards, minReward] = await Promise.all([
      prisma.reward.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }],
        include: rewardApplyInclude,
      }),
      prisma.reward.findFirst({
        where: { isActive: true },
        orderBy: { pointsCost: "asc" },
        select: { pointsCost: true },
      }),
    ]);

    let branchId: number | null = null;
    let branchFilter:
      | ReturnType<typeof customerBranchFilter>
      | undefined;

    if (!isOwnerRole(auth.user.role) && isBranchAdminRole(auth.user.role)) {
      branchId = await getUserPrimaryBranchId(prisma, auth.user.id);
      if (!branchId) {
        return NextResponse.json({ customers: [], recentRedemptions: [] });
      }
      branchFilter = customerBranchFilter(branchId);
    }

    const redemptionCustomerFilter = branchFilter
      ? { customer: branchFilter }
      : {};

    const [customers, redemptionRows] = await Promise.all([
      minReward
        ? prisma.customer.findMany({
            where: {
              loyalty: { points: { gte: minReward.pointsCost } },
              ...branchFilter,
            },
            select: {
              id: true,
              name: true,
              lastnames: true,
              email: true,
              phone: true,
              password: true,
              loyalty: { select: { points: true, tier: true } },
            },
            orderBy: { loyalty: { points: "desc" } },
          })
        : Promise.resolve([]),
      prisma.pointTransaction.findMany({
        where: {
          rewardId: { not: null },
          ...redemptionCustomerFilter,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          customerId: true,
          points: true,
          createdAt: true,
          customer: { select: { name: true, lastnames: true } },
          reward: {
            select: {
              id: true,
              name: true,
              description: true,
              pointsCost: true,
              ...rewardApplyInclude,
            },
          },
        },
      }),
    ]);

    const lastRedemptionByCustomer = new Map<number, ReturnType<typeof mapRedemption>>();

    for (const tx of redemptionRows) {
      if (lastRedemptionByCustomer.has(tx.customerId)) continue;
      const mapped = mapRedemption(tx);
      if (mapped) lastRedemptionByCustomer.set(tx.customerId, mapped);
    }

    const eligibleCustomers =
      !minReward || rewards.length === 0
        ? []
        : customers
            .map(({ password, loyalty, ...customer }) => {
              const points = loyalty?.points ?? 0;
              const claimableRewards = rewards.filter((r) => r.pointsCost <= points);
              if (claimableRewards.length === 0) return null;

              return {
                ...customer,
                points,
                tier: loyalty?.tier ?? "bronze",
                hasPortalAccess: Boolean(password),
                claimableRewards,
                lastRedemption: lastRedemptionByCustomer.get(customer.id) ?? null,
              };
            })
            .filter(Boolean);

    const recentRedemptions = redemptionRows
      .map(mapRedemption)
      .filter(Boolean);

    return NextResponse.json({
      customers: eligibleCustomers,
      recentRedemptions,
    });
  } catch {
    return NextResponse.json(
      { message: "Error al obtener clientes elegibles" },
      { status: 500 },
    );
  }
}
