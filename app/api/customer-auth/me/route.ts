import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkCustomerAuth } from "@/shared/utils/check-customer-auth";
import { rewardApplyInclude } from "@/shared/utils/reward-apply";

export async function GET() {
  const auth = await checkCustomerAuth();
  if (!auth.ok) return auth.response;

  try {
    const [transactions, settings] = await Promise.all([
      prisma.pointTransaction.findMany({
        where: { customerId: auth.customer.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          reward: { select: { id: true, name: true } },
        },
      }),
      prisma.loyaltySettings.findUnique({ where: { id: 1 } }),
    ]);

    const rewards = await prisma.reward.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }],
      include: rewardApplyInclude,
    });

    return NextResponse.json({
      customer: auth.customer,
      loyaltyRules: settings ?? {
        pointsPerAppointment: 10,
        pointsPerAmount: 1,
        amountUnit: 10,
        silverThreshold: 100,
        goldThreshold: 300,
      },
      rewards,
      transactions: transactions.map((t) => ({
        id: t.id,
        points: t.points,
        reason: t.reason,
        reward: t.reward,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json(
      { message: "Error al cargar la cuenta" },
      { status: 500 },
    );
  }
}
