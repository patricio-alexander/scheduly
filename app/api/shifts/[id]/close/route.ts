import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  computeExpectedCash,
  resolveCashFromBody,
} from "@/shared/utils/turno-cash";
import {
  getShiftMovementsSummary,
  sumShiftSales,
} from "@/shared/utils/shift-service";
import { toAmount } from "@/shared/utils/money";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const id = Number((await params).id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const shift = await prisma.cashShift.findUnique({ where: { id } });
    if (!shift || shift.status !== "open") {
      return NextResponse.json(
        { message: "Turno no encontrado o ya cerrado" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const resolved = resolveCashFromBody({
      cashCounts: body.cashCounts,
      cashTotal: body.cashTotal,
    });
    if (!resolved) {
      return NextResponse.json(
        { message: "Indica el efectivo contado al cierre" },
        { status: 400 },
      );
    }

    const [sales, movements] = await Promise.all([
      sumShiftSales(shift.id),
      getShiftMovementsSummary(shift.id),
    ]);
    const opening = toAmount(shift.openingCashTotal);
    const expectedCashTotal = computeExpectedCash(
      opening,
      sales.salesCash,
      movements.cashOut,
      movements.cashIn,
    );
    const closingCashTotal = resolved.total;
    const cashDifference = Number(
      (closingCashTotal - expectedCashTotal).toFixed(2),
    );
    const closedAtRaw = body.closedAt ? new Date(String(body.closedAt)) : new Date();
    const closedAt = Number.isNaN(closedAtRaw.getTime()) ? new Date() : closedAtRaw;
    const notes = String(body.notes ?? "").trim() || null;

    const updated = await prisma.cashShift.update({
      where: { id: shift.id },
      data: {
        status: "closed",
        closedAt,
        closingCashCounts: resolved.counts,
        closingCashTotal,
        expectedCashTotal,
        cashDifference,
        salesCashTotal: sales.salesCash,
        salesTransferTotal: sales.salesTransfer,
        salesCardTotal: sales.salesCard,
        salesTotal: sales.salesTotal,
        cashOutTotal: movements.cashOut,
        cashInTotal: movements.cashIn,
        closingNotes: notes,
      },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      closedAt: updated.closedAt?.toISOString() ?? null,
      closingCashTotal,
      expectedCashTotal,
      cashDifference,
      summary: {
        opening,
        salesCash: sales.salesCash,
        salesTransfer: sales.salesTransfer,
        salesCard: sales.salesCard,
        cashOut: movements.cashOut,
        cashIn: movements.cashIn,
        expectedCashTotal,
        closingCashTotal,
        cashDifference,
        orderCount: sales.orderCount,
      },
    });
  } catch (error) {
    console.error("POST /api/shifts/[id]/close", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Error al cerrar turno",
      },
      { status: 400 },
    );
  }
}
