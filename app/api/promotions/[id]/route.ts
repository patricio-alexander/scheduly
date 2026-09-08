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

function parsePromotionBody(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  if (!name) throw new Error("Nombre requerido");

  return {
    name,
    description: String(body.description ?? "").trim(),
    discountPct: body.discountPct != null ? Number(body.discountPct) : null,
    discountFixed: body.discountFixed != null ? Number(body.discountFixed) : null,
    comboLabel: body.comboLabel ? String(body.comboLabel) : null,
    startsAt: body.startsAt ? new Date(String(body.startsAt)) : new Date(),
    endsAt: body.endsAt ? new Date(String(body.endsAt)) : null,
    isActive: body.isActive !== false,
    serviceIds: Array.isArray(body.serviceIds) ? body.serviceIds : [],
    branchIds: Array.isArray(body.branchIds) ? body.branchIds : [],
    weekdays: parseWeekdays(body.weekdays),
  };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const data = parsePromotionBody(body);
    const promotion = await prisma.servicePromotion.update({
      where: { id: Number(id) },
      data,
    });
    return NextResponse.json(promotion);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al actualizar la oferta";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.servicePromotion.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Oferta eliminada" });
  } catch {
    return NextResponse.json(
      { message: "Error al eliminar la oferta" },
      { status: 500 },
    );
  }
}
