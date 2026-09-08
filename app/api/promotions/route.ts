import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";

function parseWeekdays(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const days = value
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return days.length ? [...new Set(days)].sort() : [];
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const all = url.searchParams.get("all") === "1";
    const now = new Date();

    const promotions = await prisma.servicePromotion.findMany({
      where: all
        ? {}
        : {
            isActive: true,
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
      orderBy: { startsAt: "desc" },
    });
    return NextResponse.json(promotions);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener promociones" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }

    const promotion = await prisma.servicePromotion.create({
      data: {
        name,
        description: String(body.description ?? "").trim(),
        discountPct: body.discountPct != null ? Number(body.discountPct) : null,
        discountFixed:
          body.discountFixed != null ? Number(body.discountFixed) : null,
        comboLabel: body.comboLabel ? String(body.comboLabel) : null,
        startsAt: body.startsAt ? new Date(String(body.startsAt)) : new Date(),
        endsAt: body.endsAt ? new Date(String(body.endsAt)) : null,
        isActive: body.isActive !== false,
        serviceIds: Array.isArray(body.serviceIds) ? body.serviceIds : [],
        branchIds: Array.isArray(body.branchIds) ? body.branchIds : [],
        weekdays: parseWeekdays(body.weekdays),
      },
    });
    return NextResponse.json(promotion, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Error al crear promoción" },
      { status: 400 },
    );
  }
}
