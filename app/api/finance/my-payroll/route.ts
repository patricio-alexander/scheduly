import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isPureEmployeeRole } from "@/shared/utils/roles";
import { toAmount } from "@/shared/utils/money";
import {
  endOfLocalDay,
  startOfLocalDay,
  toDateKey,
} from "@/shared/utils/payroll-settings";
import { settleCommissionsForEmployeePayment } from "@/shared/utils/commissions";
import { invalidateDashboard } from "@/shared/utils/socket";

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
        OR: [
          { payrollWeek: { status: { in: ["published", "closed"] } } },
          {
            paymentRequestedAt: { not: null },
            paymentAcceptedAt: null,
            paymentRejectedAt: null,
          },
        ],
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
        payments: { select: { id: true }, take: 1 },
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
        weekNotes: l.payrollWeek.notes,
        paymentRequest:
          l.paymentRequestedAt &&
          !l.paymentAcceptedAt &&
          !l.paymentRejectedAt &&
          l.payments.length === 0
            ? {
                requestedAt: l.paymentRequestedAt.toISOString(),
                amount: toAmount(l.totalAmount),
                method: l.paymentRequestMethod ?? "transfer",
                notes: l.paymentRequestNotes ?? "",
              }
            : null,
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

/** Empleado confirma (check) que revisó lo producido. */
export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isPureEmployeeRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const lineId = Number(body.lineId);
    if (!Number.isInteger(lineId) || lineId <= 0) {
      return NextResponse.json({ message: "Línea inválida" }, { status: 400 });
    }

    const line = await prisma.payrollWeekLine.findUnique({
      where: { id: lineId },
      include: {
        payrollWeek: {
          select: { status: true, periodStart: true, periodEnd: true },
        },
        payments: { select: { id: true }, take: 1 },
      },
    });

    if (!line || line.accountId !== auth.user.id) {
      return NextResponse.json(
        { message: "No encontré esa liquidación" },
        { status: 404 },
      );
    }

    if (body.action === "reject-payment") {
      if (
        !line.paymentRequestedAt ||
        line.paymentAcceptedAt ||
        line.paymentRejectedAt ||
        line.payments.length > 0
      ) {
        return NextResponse.json(
          { message: "Este pago ya no está pendiente de respuesta" },
          { status: 409 },
        );
      }

      const rejectedAt = new Date();
      await prisma.$transaction(async (tx) => {
        const rejected = await tx.payrollWeekLine.updateMany({
          where: {
            id: line.id,
            paymentAcceptedAt: null,
            paymentRejectedAt: null,
          },
          data: { paymentRejectedAt: rejectedAt },
        });
        if (rejected.count !== 1) {
          throw new Error("La solicitud ya fue respondida");
        }
        if (auth.user.personId) {
          await tx.notification.updateMany({
            where: {
              userId: auth.user.personId,
              sourceKey: `payroll-payment-request:${line.id}`,
            },
            data: { seen: true },
          });
        }
      });

      invalidateDashboard("payroll:payment-rejected");
      return NextResponse.json({
        id: line.id,
        paymentRejectedAt: rejectedAt.toISOString(),
        message: "Pago rechazado",
      });
    }

    if (body.action === "accept-payment") {
      if (
        !line.paymentRequestedAt ||
        line.paymentAcceptedAt ||
        line.paymentRejectedAt ||
        line.payments.length > 0
      ) {
        return NextResponse.json(
          { message: "Este pago ya no está pendiente de confirmación" },
          { status: 409 },
        );
      }
      if (!line.paymentRequestedById) {
        return NextResponse.json(
          { message: "La solicitud de pago no tiene un administrador válido" },
          { status: 400 },
        );
      }
      if (!auth.user.personId) {
        return NextResponse.json(
          { message: "Tu cuenta no tiene una persona asociada" },
          { status: 400 },
        );
      }

      const acceptedAt = new Date();
      const personId = auth.user.personId;
      await prisma.$transaction(async (tx) => {
        const accepted = await tx.payrollWeekLine.updateMany({
          where: { id: line.id, paymentAcceptedAt: null },
          data: {
            paymentAcceptedAt: acceptedAt,
            employeeConfirmedAt: line.employeeConfirmedAt ?? acceptedAt,
          },
        });
        if (accepted.count !== 1) {
          throw new Error("El pago ya fue procesado");
        }

        await tx.employeePayment.create({
          data: {
            userId: personId,
            branchId: line.branchId,
            registeredById: line.paymentRequestedById!,
            amount: toAmount(line.totalAmount),
            method: line.paymentRequestMethod ?? "transfer",
            notes: line.paymentRequestNotes,
            payrollWeekLineId: line.id,
            paidAt: acceptedAt,
          },
        });
        await settleCommissionsForEmployeePayment(tx, {
          userId: personId,
          branchId: line.branchId,
          paymentAmount: toAmount(line.totalAmount),
          periodStart: startOfLocalDay(line.payrollWeek.periodStart),
          periodEnd: endOfLocalDay(line.payrollWeek.periodEnd),
        });
        await tx.notification.updateMany({
          where: {
            userId: personId,
            sourceKey: `payroll-payment-request:${line.id}`,
          },
          data: { seen: true },
        });
      });

      invalidateDashboard("payroll:payment-accepted");
      return NextResponse.json({
        id: line.id,
        paymentAcceptedAt: acceptedAt.toISOString(),
        message: "Pago confirmado correctamente",
      });
    }

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
  } catch (error) {
    console.error("POST /api/finance/my-payroll", error);
    return NextResponse.json(
      { message: "Error al confirmar" },
      { status: 400 },
    );
  }
}
