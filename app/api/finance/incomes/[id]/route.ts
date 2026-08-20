import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";
import { isManagementRole } from "@/shared/utils/roles";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }
  try {
    await prisma.income.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/finance/incomes/[id]", error);
    return NextResponse.json({ message: "No se pudo eliminar" }, { status: 400 });
  }
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
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const amount = Number(body.amount);
    const dateRaw = body.date ? new Date(String(body.date)) : undefined;
    const updated = await prisma.income.update({
      where: { id },
      data: {
        ...(Number.isFinite(amount) && amount > 0 ? { amount } : {}),
        concept:
          body.concept !== undefined
            ? String(body.concept).trim() || null
            : undefined,
        category:
          body.category !== undefined
            ? String(body.category).trim() || null
            : undefined,
        ...(dateRaw && !Number.isNaN(dateRaw.getTime())
          ? { date: dateRaw }
          : {}),
      },
    });
    return NextResponse.json({
      id: updated.id,
      amount: toAmount(updated.amount),
    });
  } catch (error) {
    console.error("PUT /api/finance/incomes/[id]", error);
    return NextResponse.json({ message: "No se pudo actualizar" }, { status: 400 });
  }
}
