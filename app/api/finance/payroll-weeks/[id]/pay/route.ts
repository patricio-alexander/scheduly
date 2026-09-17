import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  isBranchAdminRole,
  isManagementRole,
  isOwnerRole,
} from "@/shared/utils/roles";
import { getUserPrimaryBranchId } from "@/shared/utils/branches";
import { toAmount } from "@/shared/utils/money";
import {
  emitPayrollPaymentRequested,
  invalidateDashboard,
} from "@/shared/utils/socket";
import { loadWeek, serializeWeek } from "../route";

const METHODS = new Set(["cash", "card", "transfer"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const weekId = Number((await params).id);
  if (!Number.isInteger(weekId) || weekId <= 0) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const lineId = Number(body.lineId);
    if (!Number.isInteger(lineId) || lineId <= 0) {
      return NextResponse.json({ message: "Línea inválida" }, { status: 400 });
    }

    const methodRaw = String(body.method ?? "transfer");
    const method = METHODS.has(methodRaw) ? methodRaw : "transfer";
    const notes = String(body.notes ?? "").trim() || null;

    const line = await prisma.payrollWeekLine.findFirst({
      where: { id: lineId, payrollWeekId: weekId },
      include: {
        payrollWeek: {
          select: { periodStart: true, periodEnd: true },
        },
        account: { select: { userId: true } },
        branch: { select: { name: true } },
        payments: { select: { id: true }, take: 1 },
      },
    });

    if (!line) {
      return NextResponse.json(
        { message: "Línea no encontrada" },
        { status: 404 },
      );
    }
    if (line.payments.length > 0) {
      return NextResponse.json(
        { message: "Esa línea ya está pagada" },
        { status: 409 },
      );
    }
    if (line.paymentRequestedAt && !line.paymentRejectedAt) {
      return NextResponse.json(
        { message: "El pago ya está esperando confirmación del empleado" },
        { status: 409 },
      );
    }

    const amount = toAmount(line.totalAmount);
    if (amount <= 0) {
      return NextResponse.json(
        { message: "No hay monto para pagar" },
        { status: 400 },
      );
    }

    const userId = line.account.userId;
    if (userId == null) {
      return NextResponse.json(
        { message: "El empleado no tiene persona asociada" },
        { status: 400 },
      );
    }

    if (isBranchAdminRole(auth.user.role) && !isOwnerRole(auth.user.role)) {
      const branchId = await getUserPrimaryBranchId(prisma, auth.user.id);
      if (line.branchId && branchId && line.branchId !== branchId) {
        return NextResponse.json(
          { message: "No puedes pagar a personal de otro local" },
          { status: 403 },
        );
      }
    }

    const requestedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.payrollWeekLine.update({
        where: { id: line.id },
        data: {
          paymentRequestedAt: requestedAt,
          paymentRequestedById: auth.user.id,
          paymentRequestMethod: method,
          paymentRequestNotes: notes,
          paymentAcceptedAt: null,
          paymentRejectedAt: null,
        },
      });

      await tx.notification.updateMany({
        where: {
          userId,
          sourceKey: `payroll-payment-request:${line.id}`,
        },
        data: { deleted: true },
      });
      await tx.notification.create({
        data: {
        userId,
          type: "alert",
          title: "Confirma tu pago",
          message: `Administración solicita validar un pago de ${amount.toFixed(2)} por la liquidación ${line.payrollWeek.periodStart.toISOString().slice(0, 10)} → ${line.payrollWeek.periodEnd.toISOString().slice(0, 10)}.`,
          link: "/mobile",
          sourceKey: `payroll-payment-request:${line.id}`,
        },
      });
    });

    emitPayrollPaymentRequested(line.accountId, {
      lineId: line.id,
      weekId,
      periodStart: line.payrollWeek.periodStart.toISOString().slice(0, 10),
      periodEnd: line.payrollWeek.periodEnd.toISOString().slice(0, 10),
      branchName: line.branch?.name ?? null,
      amount,
      method,
      notes: notes ?? "",
      requestedAt: requestedAt.toISOString(),
    });
    invalidateDashboard("payroll:payment-requested");

    const full = await loadWeek(weekId);
    return NextResponse.json(serializeWeek(full!), { status: 202 });
  } catch (error) {
    console.error("POST /api/finance/payroll-weeks/[id]/pay", error);
    return NextResponse.json(
      { message: "Error al confirmar el pago" },
      { status: 400 },
    );
  }
}
