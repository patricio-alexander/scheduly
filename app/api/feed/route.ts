import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

/** Feed público: promociones, premios y novedades para la app del cliente */
export async function GET() {
  try {
    const now = new Date();
    const [posts, promotions, rewards, settings] = await Promise.all([
      prisma.feedPost.findMany({
        where: {
          isActive: true,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
        orderBy: [{ sortOrder: "asc" }, { startsAt: "desc" }],
        take: 20,
      }),
      prisma.servicePromotion.findMany({
        where: {
          isActive: true,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
        orderBy: { startsAt: "desc" },
        take: 10,
      }),
      prisma.reward.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }],
      }),
      prisma.loyaltySettings.findUnique({ where: { id: 1 } }),
    ]);

    return NextResponse.json({
      posts,
      promotions,
      rewards,
      loyaltyRules: settings ?? {
        pointsPerAppointment: 10,
        pointsPerAmount: 1,
        amountUnit: 10,
        silverThreshold: 100,
        goldThreshold: 300,
      },
    });
  } catch {
    return NextResponse.json({ message: "Error al cargar novedades" }, { status: 500 });
  }
}
