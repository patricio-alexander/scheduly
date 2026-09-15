import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isPureEmployeeRole } from "@/shared/utils/roles";
import { toAmount } from "@/shared/utils/money";
import { toDateKey } from "@/shared/utils/payroll-settings";

/** Empleado: liquidaciones publicadas propias. */
export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isPureEmployeeRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const lines = await prisma.payrollWeekLine.findMany({
      where: {
        accountId: auth.user.id,
        payrollWeek: { status: { in: ["published", "closed"] } },
      },
      include: {
        payrollWeek: {
          select: {
            id: true,
            periodStart: true,
            periodEnd: true,
            status: true,
            notes: true,
          },
        },
        branch: { select: { id: true, name: true } },
        payments: {
          select: { id: true, paidAt: true },
          orderBy: { paidAt: "desc" },
          take: 1,
        },
      },
      orderBy: { payrollWeek: { periodStart: "desc" } },
      take: 20,
    });

    return NextResponse.json({
      lines: lines.map((l) => ({
        id: l.id,
        weekId: l.payrollWeek.id,
        periodStart: toDateKey(l.payrollWeek.periodStart),
        periodEnd: toDateKey(l.payrollWeek.periodEnd),
        status: l.payrollWeek.status,
        branchName: l.branch?.name ?? null,
        producedAmount: toAmount(l.producedAmount),
        salesAmount: toAmount(l.salesAmount),
        vouchersAmount: toAmount(l.vouchersAmount),
        cafeteriaAmount: toAmount(l.cafeteriaAmount),
        finesAmount: toAmount(l.finesAmount),
        discountsAmount: toAmount(l.discountsAmount),
        additionalAmount: toAmount(l.additionalAmount),
        totalAmount: toAmount(l.totalAmount),
        notes: l.notes,
        employeeConfirmedAt: l.employeeConfirmedAt?.toISOString() ?? null,
        employeePaidAckAt: l.employeePaidAckAt?.toISOString() ?? null,
        paidAt: l.payments[0]?.paidAt.toISOString() ?? null,
        weekNotes: l.payrollWeek.notes,
      })),
    });
  } catch (error) {
    console.error("GET /api/finance/my-payroll", error);
    return NextResponse.json(
      { message: "Error al obtener tu liquidación" },
      { status: 500 },
    );
  }
}

/**
 * Empleado confirma revisión de montos o acuse de pago.
 * body: { lineId, action?: "confirm" | "ack-paid" }
 */
export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isPureEmployeeRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const lineId = Number(body.lineId);
    const action =
      body.action === "ack-paid" ? "ack-paid" : "confirm";
    if (!Number.isInteger(lineId) || lineId <= 0) {
      return NextResponse.json({ message: "Línea inválida" }, { status: 400 });
    }

    const line = await prisma.payrollWeekLine.findUnique({
      where: { id: lineId },
      include: {
        payrollWeek: { select: { status: true } },
        payments: { select: { id: true }, take: 1 },
      },
    });

    if (!line || line.accountId !== auth.user.id) {
      return NextResponse.json(
        { message: "No encontré esa liquidación" },
        { status: 404 },
      );
    }

    if (action === "confirm") {
      if (line.payrollWeek.status !== "published") {
        return NextResponse.json(
          {
            message:
              line.payrollWeek.status === "closed"
                ? "La semana ya está cerrada"
                : "Aún no está publicada para confirmar",
          },
          { status: 400 },
        );
      }
      if (line.employeeConfirmedAt) {
        return NextResponse.json({
          message: "Ya confirmaste esta liquidación",
          employeeConfirmedAt: line.employeeConfirmedAt.toISOString(),
        });
      }

      const updated = await prisma.payrollWeekLine.update({
        where: { id: lineId },
        data: { employeeConfirmedAt: new Date() },
      });

      return NextResponse.json({
        id: updated.id,
        employeeConfirmedAt: updated.employeeConfirmedAt?.toISOString() ?? null,
        message: "Confirmación registrada",
      });
    }

    // ack-paid: solo si ya hay pago registrado
    if (!line.payments.length && line.payrollWeek.status !== "closed") {
      return NextResponse.json(
        { message: "Todavía no figura el pago de esta semana" },
        { status: 400 },
      );
    }
    if (!line.employeeConfirmedAt) {
      return NextResponse.json(
        { message: "Primero confirmá los montos de la liquidación" },
        { status: 400 },
      );
    }
    if (line.employeePaidAckAt) {
      return NextResponse.json({
        message: "Ya confirmaste que te pagaron",
        employeePaidAckAt: line.employeePaidAckAt.toISOString(),
      });
    }

    const updated = await prisma.payrollWeekLine.update({
      where: { id: lineId },
      data: { employeePaidAckAt: new Date() },
    });

    return NextResponse.json({
      id: updated.id,
      employeePaidAckAt: updated.employeePaidAckAt?.toISOString() ?? null,
      message: "Acuse de pago registrado",
    });
  } catch (error) {
    console.error("POST /api/finance/my-payroll", error);
    return NextResponse.json(
      { message: "Error al confirmar" },
      { status: 400 },
    );
  }
}
