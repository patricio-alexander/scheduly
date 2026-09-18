import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { getUserPrimaryBranchId } from "@/shared/utils/branches";
import { customerFullName, customerLastnames } from "@/shared/utils/person-name";
import { rewardApplyInclude } from "@/shared/utils/reward-apply";
import { isBranchAdminRole, isManagementRole, isOwnerRole } from "@/shared/utils/roles";

function customerBranchFilter(branchId: number) {
  return {
    OR: [
      { appointments: { some: { branchId } } },
      { sales: { some: { shift: { storeId: branchId } } } },
    ],
  };
}

function mapRedemption(tx: {
  id: number;
  customerId: number;
  points: number;
  createdAt: Date;
  source?: string;
  deliveredAt?: Date | null;
  appointmentId?: number | null;
  customer: {
    name: string;
    firstLastName: string | null;
    secondLastName: string | null;
    email: string | null;
    phone: string | null;
  };
  reward: {
    id: number;
    name: string;
    description: string;
    pointsCost: number;
    productId: number | null;
    service: { id: number; name: string } | null;
    product: { id: number; name: string } | null;
  } | null;
}) {
  if (!tx.reward) return null;

  const isProduct = Boolean(tx.reward.productId ?? tx.reward.product);
  const pendingPickup =
    isProduct &&
    tx.source === "customer" &&
    !tx.deliveredAt &&
    !tx.appointmentId;

  return {
    id: tx.id,
    customerId: tx.customerId,
    customerName: customerFullName(tx.customer),
    customerEmail: tx.customer.email ?? "",
    customerPhone: tx.customer.phone ?? "",
    points: tx.points,
    redeemedAt: tx.createdAt.toISOString(),
    isProduct,
    pendingPickup,
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

    let branchFilter: ReturnType<typeof customerBranchFilter> | undefined;

    if (!isOwnerRole(auth.user.role) && isBranchAdminRole(auth.user.role)) {
      const branchId = await getUserPrimaryBranchId(prisma, auth.user.id);
      if (!branchId) {
        return NextResponse.json({
          customers: [],
          recentRedemptions: [],
          claimedProducts: [],
        });
      }
      branchFilter = customerBranchFilter(branchId);
    }

    const redemptionCustomerFilter = branchFilter
      ? { customer: branchFilter }
      : {};

    const customerNameSelect = {
      name: true,
      firstLastName: true,
      secondLastName: true,
      email: true,
      phone: true,
    } as const;

    const rewardSelect = {
      id: true,
      name: true,
      description: true,
      pointsCost: true,
      productId: true,
      ...rewardApplyInclude,
    } as const;

    const [customers, redemptionRows, pendingPickupRows] = await Promise.all([
      minReward
        ? prisma.customer.findMany({
            where: {
              loyalty: { points: { gte: minReward.pointsCost } },
              ...branchFilter,
            },
            select: {
              id: true,
              ...customerNameSelect,
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
        take: 50,
        select: {
          id: true,
          customerId: true,
          points: true,
          createdAt: true,
          source: true,
          deliveredAt: true,
          appointmentId: true,
          customer: { select: customerNameSelect },
          reward: { select: rewardSelect },
        },
      }),
      prisma.pointTransaction.findMany({
        where: {
          rewardId: { not: null },
          source: "customer",
          deliveredAt: null,
          appointmentId: null,
          reward: { productId: { not: null } },
          ...redemptionCustomerFilter,
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: {
          id: true,
          customerId: true,
          points: true,
          createdAt: true,
          source: true,
          deliveredAt: true,
          appointmentId: true,
          customer: { select: customerNameSelect },
          reward: { select: rewardSelect },
        },
      }),
    ]);

    const lastRedemptionByCustomer = new Map<
      number,
      ReturnType<typeof mapRedemption>
    >();

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
              const claimableRewards = rewards.filter(
                (r) => r.productId && r.pointsCost <= points,
              );
              if (claimableRewards.length === 0) return null;

              return {
                id: customer.id,
                name: customer.name,
                lastnames: customerLastnames(customer),
                email: customer.email,
                phone: customer.phone,
                points,
                tier: loyalty?.tier ?? "bronze",
                hasPortalAccess: Boolean(password),
                claimableRewards,
                lastRedemption:
                  lastRedemptionByCustomer.get(customer.id) ?? null,
              };
            })
            .filter(Boolean);

    const mappedRedemptions = redemptionRows
      .map(mapRedemption)
      .filter(Boolean);

    function toRecord(
      row: NonNullable<(typeof mappedRedemptions)[number]>,
    ) {
      return {
        id: row.id,
        customerId: row.customerId,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        customerPhone: row.customerPhone,
        points: row.points,
        redeemedAt: row.redeemedAt,
        pendingPickup: row.pendingPickup,
        reward: row.reward,
      };
    }

    const recentRedemptions = mappedRedemptions.map(toRecord);
    const claimedProducts = pendingPickupRows
      .map(mapRedemption)
      .filter(Boolean)
      .map(toRecord);

    return NextResponse.json({
      customers: eligibleCustomers,
      recentRedemptions,
      claimedProducts,
    });
  } catch (error) {
    console.error("GET /api/loyalty/eligible-customers", error);
    return NextResponse.json(
      { message: "Error al obtener clientes elegibles" },
      { status: 500 },
    );
  }
}
