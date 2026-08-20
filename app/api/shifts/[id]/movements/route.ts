import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  MOVEMENT_IN_CATEGORIES,
  MOVEMENT_OUT_CATEGORIES,
  movementCategoryLabel,
} from "@/shared/utils/turno-cash";
import { buildActiveShiftPayload } from "@/shared/utils/shift-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    if (!auth.user.personId) {
      return NextResponse.json(
        { message: "La cuenta no tiene persona asociada" },
        { status: 400 },
      );
    }

    const id = Number((await params).id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const shift = await prisma.cashShift.findUnique({ where: { id } });
    if (!shift || shift.status !== "open") {
      return NextResponse.json(
        { message: "Turno no encontrado o cerrado" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const direction = String(body.direction ?? "out") === "in" ? "in" : "out";
    const category = String(body.category ?? "").trim();
    const amount = Number(body.amount);
    const concept = String(body.concept ?? "").trim();

    const allowed: string[] =
      direction === "out"
        ? MOVEMENT_OUT_CATEGORIES.map((c) => c.id)
        : MOVEMENT_IN_CATEGORIES.map((c) => c.id);

    if (!allowed.includes(category)) {
      return NextResponse.json({ message: "Categoría inválida" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: "Monto inválido" }, { status: 400 });
    }
    if (!concept) {
      return NextResponse.json({ message: "Concepto requerido" }, { status: 400 });
    }

    const createdAtRaw = body.createdAt
      ? new Date(String(body.createdAt))
      : new Date();
    const createdAt = Number.isNaN(createdAtRaw.getTime())
      ? new Date()
      : createdAtRaw;

    await prisma.cashShiftMovement.create({
      data: {
        shiftId: shift.id,
        accountId: auth.user.id,
        userId: auth.user.personId,
        direction,
        category,
        amount,
        concept,
        notes: String(body.notes ?? "").trim() || null,
        createdAt,
        updatedAt: createdAt,
      },
    });

    const payload = await buildActiveShiftPayload(shift.id);
    return NextResponse.json(
      {
        ok: true,
        categoryLabel: movementCategoryLabel(category),
        shift: payload,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/shifts/[id]/movements", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Error al registrar movimiento",
      },
      { status: 400 },
    );
  }
}
