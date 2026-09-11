import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { getBusinessSettings } from "@/shared/utils/business-settings";

/** Promociones públicas (si la dueña las tiene activas). */
export async function GET() {
  try {
    const settings = await getBusinessSettings();
    const enabled = settings.operationFlags?.showPublicPromos !== false;

    if (!enabled) {
      return NextResponse.json(
        {
          enabled: false,
          promotions: [],
          message: "Las promociones públicas están desactivadas por el local",
        },
        { status: 200 },
      );
    }

    const now = new Date();
    const promotions = await prisma.servicePromotion.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { startsAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        description: true,
        discountPct: true,
        comboLabel: true,
        startsAt: true,
        endsAt: true,
      },
    });

    return NextResponse.json({
      enabled: true,
      promotions: promotions.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        discountPct: p.discountPct,
        comboLabel: p.comboLabel,
        startsAt: p.startsAt.toISOString(),
        endsAt: p.endsAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/public/promociones", error);
    return NextResponse.json(
      { message: "Error al cargar promociones" },
      { status: 500 },
    );
  }
}
