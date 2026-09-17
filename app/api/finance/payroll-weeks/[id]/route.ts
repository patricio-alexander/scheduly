import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  isBranchAdminRole,
  isManagementRole,
  isOwnerRole,
} from "@/shared/utils/roles";
import { getBusinessSettings } from "@/shared/utils/business-settings";
import { toAmount } from "@/shared/utils/money";
import {
  calcPayrollLineTotal,
  toDateKey,
} from "@/shared/utils/payroll-settings";

async function canManagePayroll(user: {
  id: number;
  role: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (isOwnerRole(user.role)) return { ok: true };
  if (!isBranchAdminRole(user.role)) {
    return { ok: false, message: "No autorizado" };
  }
  const settings = await getBusinessSettings();
  if (!settings.payrollAllowBranchAdmin) {
    return {
      ok: false,
      message: "La liquidación semanal solo la arma la dueña",
    };
  }
  return { ok: true };
}

function personName(
  p:
    | {
        firstName: string | null;
        secondName?: string | null;
        firstLastName: string | null;
        secondLastName?: string | null;
      }
    | null
    | undefined,
) {
  if (!p) return "Sin nombre";
  return (
    [p.firstName, p.secondName, p.firstLastName, p.secondLastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Sin nombre"
  );
}

export function serializeWeek(
  week: {
    id: number;
    periodStart: Date;
    periodEnd: Date;
    status: string;
    notes: string | null;
    createdById: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: {
      person: {
        firstName: string | null;
        secondName?: string | null;
        firstLastName: string | null;
        secondLastName?: string | null;
      } | null;
    } | null;
    lines: Array<{
      id: number;
      accountId: number;
      branchId: number | null;
      producedAmount: number;
      salesAmount: number;
      vouchersAmount: number;
      cafeteriaAmount: number;
      finesAmount: number;
      discountsAmount: number;
      additionalAmount: number;
      totalAmount: number;
      notes: string | null;
      employeeConfirmedAt: Date | null;
      paymentRequestedAt: Date | null;
      paymentRequestedById: number | null;
      paymentRequestMethod: string | null;
      paymentRequestNotes: string | null;
      paymentAcceptedAt: Date | null;
      paymentRejectedAt: Date | null;
      payments?: Array<{
        paidAt: Date;
        amount: number;
        method: string;
      }>;
      account?: {
        id: number;
        person: {
          firstName: string | null;
          secondName?: string | null;
          firstLastName: string | null;
          secondLastName?: string | null;
        } | null;
      } | null;
      branch?: { id: number; name: string } | null;
    }>;
  },
) {
  const confirmed = week.lines.filter((l) => l.employeeConfirmedAt).length;
  const paidCount = week.lines.filter((l) => (l.payments?.length ?? 0) > 0).length;
  return {
    id: week.id,
    periodStart: toDateKey(week.periodStart),
    periodEnd: toDateKey(week.periodEnd),
    status: week.status,
    notes: week.notes,
    createdById: week.createdById,
    createdByName: personName(week.createdBy?.person),
    createdAt: week.createdAt.toISOString(),
    updatedAt: week.updatedAt.toISOString(),
    confirmedCount: confirmed,
    paidCount,
    lineCount: week.lines.length,
    grandTotal:
      Math.round(
        week.lines.reduce((s, l) => s + toAmount(l.totalAmount), 0) * 100,
      ) / 100,
    lines: week.lines.map((l) => ({
      id: l.id,
      accountId: l.accountId,
      employeeName: personName(l.account?.person),
      branchId: l.branchId,
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
      paymentRequestedAt: l.paymentRequestedAt?.toISOString() ?? null,
      paymentRequestedById: l.paymentRequestedById,
      paymentRequestMethod: l.paymentRequestMethod,
      paymentRequestNotes: l.paymentRequestNotes,
      paymentAcceptedAt: l.paymentAcceptedAt?.toISOString() ?? null,
      paymentRejectedAt: l.paymentRejectedAt?.toISOString() ?? null,
      paidAt: l.payments?.[0]?.paidAt.toISOString() ?? null,
      paidAmount: toAmount(l.payments?.[0]?.amount ?? 0),
      paidMethod: l.payments?.[0]?.method ?? null,
    })),
  };
}

export async function loadWeek(id: number) {
  return prisma.payrollWeek.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          person: {
            select: {
              firstName: true,
              secondName: true,
              firstLastName: true,
              secondLastName: true,
            },
          },
        },
      },
      lines: {
        include: {
          account: {
            select: {
              id: true,
              person: {
                select: {
                  firstName: true,
                  secondName: true,
                  firstLastName: true,
                  secondLastName: true,
                },
              },
            },
          },
          branch: { select: { id: true, name: true } },
          payments: {
            select: { paidAt: true, amount: true, method: true },
            orderBy: { paidAt: "desc" },
            take: 1,
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });
}

export async function GET(
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

  const week = await loadWeek(id);
  if (!week) {
    return NextResponse.json(
      { message: "Liquidación no encontrada" },
      { status: 404 },
    );
  }
  return NextResponse.json(serializeWeek(week));
}

/** PATCH: actualizar estado o líneas */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const perm = await canManagePayroll(auth.user);
  if (!perm.ok) {
    return NextResponse.json({ message: perm.message }, { status: 403 });
  }

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  try {
    const week = await prisma.payrollWeek.findUnique({ where: { id } });
    if (!week) {
      return NextResponse.json(
        { message: "Liquidación no encontrada" },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    const nextStatus =
      body.status != null ? String(body.status) : null;
    const reopening = week.status === "closed" && nextStatus === "draft";

    if (week.status === "closed" && !reopening) {
      return NextResponse.json(
        { message: "La liquidación está cerrada" },
        { status: 400 },
      );
    }

    if (body.status != null) {
      const status = String(body.status);
      if (!["draft", "published", "closed"].includes(status)) {
        return NextResponse.json(
          { message: "Estado inválido" },
          { status: 400 },
        );
      }
      await prisma.payrollWeek.update({
        where: { id },
        data: {
          status,
          notes:
            body.notes !== undefined
              ? String(body.notes).trim() || null
              : undefined,
        },
      });
    }

    if (Array.isArray(body.lines)) {
      for (const raw of body.lines) {
        if (!raw || typeof raw !== "object") continue;
        const row = raw as Record<string, unknown>;
        const lineId = Number(row.id);
        if (!Number.isInteger(lineId) || lineId <= 0) continue;

        const producedAmount = Math.max(0, toAmount(row.producedAmount));
        const salesAmount = Math.max(0, toAmount(row.salesAmount));
        const vouchersAmount = Math.max(0, toAmount(row.vouchersAmount));
        const cafeteriaAmount = Math.max(0, toAmount(row.cafeteriaAmount));
        const finesAmount = Math.max(0, toAmount(row.finesAmount));
        const discountsAmount = Math.max(0, toAmount(row.discountsAmount));
        const additionalAmount = Math.max(0, toAmount(row.additionalAmount));

        await prisma.payrollWeekLine.updateMany({
          where: {
            id: lineId,
            payrollWeekId: id,
            payments: { none: {} },
          },
          data: {
            producedAmount,
            salesAmount,
            vouchersAmount,
            cafeteriaAmount,
            finesAmount,
            discountsAmount,
            additionalAmount,
            totalAmount: calcPayrollLineTotal({
              producedAmount,
              salesAmount,
              vouchersAmount,
              cafeteriaAmount,
              finesAmount,
              discountsAmount,
              additionalAmount,
            }),
            notes:
              row.notes !== undefined
                ? String(row.notes).trim() || null
                : undefined,
            // al editar se reinicia confirmación
            employeeConfirmedAt: null,
          },
        });
      }
    }

    const full = await loadWeek(id);
    return NextResponse.json(serializeWeek(full!));
  } catch (error) {
    console.error("PATCH /api/finance/payroll-weeks/[id]", error);
    return NextResponse.json(
      { message: "Error al actualizar liquidación" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const perm = await canManagePayroll(auth.user);
  if (!perm.ok) {
    return NextResponse.json({ message: perm.message }, { status: 403 });
  }

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  try {
    const week = await prisma.payrollWeek.findUnique({ where: { id } });
    if (!week) {
      return NextResponse.json(
        { message: "Liquidación no encontrada" },
        { status: 404 },
      );
    }

    await prisma.payrollWeek.delete({ where: { id } });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("DELETE /api/finance/payroll-weeks/[id]", error);
    return NextResponse.json(
      { message: "Error al borrar liquidación" },
      { status: 400 },
    );
  }
}
