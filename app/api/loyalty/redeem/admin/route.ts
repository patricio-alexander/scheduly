import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { getUserPrimaryBranchId } from "@/shared/utils/branches";
import { redeemRewardForCustomer } from "@/shared/utils/loyalty-redeem";
import { isBranchAdminRole, isManagementRole, isOwnerRole } from "@/shared/utils/roles";

async function assertCustomerAccess(
  customerId: number,
  role: string,
  userId: number,
) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      lastnames: true,
      loyalty: { select: { points: true, tier: true } },
    },
  });

  if (!customer) {
    return { ok: false as const, status: 404, message: "Cliente no encontrado" };
  }

  if (!isOwnerRole(role) && isBranchAdminRole(role)) {
    const branchId = await getUserPrimaryBranchId(prisma, userId);
    if (!branchId) {
      return { ok: false as const, status: 403, message: "No autorizado" };
    }

    const linked = await prisma.customer.findFirst({
      where: {
        id: customerId,
        OR: [
          { appointments: { some: { branchId } } },
          { productSales: { some: { branchId } } },
        ],
      },
      select: { id: true },
    });

    if (!linked) {
      return { ok: false as const, status: 403, message: "Cliente fuera de tu sucursal" };
    }
  }

  return { ok: true as const, customer };
}

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

    const access = await assertCustomerAccess(
      customerId,
      auth.user.role,
      auth.user.id,
    );
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }

    const result = await prisma.$transaction(async (tx) =>
      redeemRewardForCustomer(tx, { customerId, rewardId }),
    );

    return NextResponse.json({
      ...result,
      customer: {
        id: access.customer.id,
        name: access.customer.name,
        lastnames: access.customer.lastnames,
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
