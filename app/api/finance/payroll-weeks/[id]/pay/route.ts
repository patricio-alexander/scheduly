import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  isBranchAdminRole,
  isManagementRole,
  isOwnerRole,
} from "@/shared/utils/roles";
import { getUserPrimaryBranchId } from "@/shared/utils/branches";
import { settleCommissionsForEmployeePayment } from "@/shared/utils/commissions";
import { toAmount } from "@/shared/utils/money";
import { endOfLocalDay, startOfLocalDay } from "@/shared/utils/payroll-settings";
import { invalidateDashboard } from "@/shared/utils/socket";
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

    await prisma.$transaction(async (tx) => {
      await tx.employeePayment.create({
        data: {
          userId,
          branchId: line.branchId,
          registeredById: auth.user.id,
          amount,
          method,
          notes,
          payrollWeekLineId: line.id,
        },
      });
      await settleCommissionsForEmployeePayment(tx, {
        userId,
        branchId: line.branchId,
        paymentAmount: amount,
        periodStart: startOfLocalDay(line.payrollWeek.periodStart),
        periodEnd: endOfLocalDay(line.payrollWeek.periodEnd),
      });
    });

    invalidateDashboard("payroll:payment-created");

    const full = await loadWeek(weekId);
    return NextResponse.json(serializeWeek(full!), { status: 201 });
  } catch (error) {
    console.error("POST /api/finance/payroll-weeks/[id]/pay", error);
    return NextResponse.json(
      { message: "Error al confirmar el pago" },
      { status: 400 },
    );
  }
}
