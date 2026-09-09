import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  isBranchAdminRole,
  isManagementRole,
  isOwnerRole,
} from "@/shared/utils/roles";
import { getUserPrimaryBranchId } from "@/shared/utils/branches";
import { getBusinessSettings } from "@/shared/utils/business-settings";
import { calcAppointmentCommission } from "@/shared/utils/commissions";
import { toAmount } from "@/shared/utils/money";
import {
  calcPayrollLineTotal,
  endOfLocalDay,
  getPayrollWeekRange,
  parseDateKey,
  startOfLocalDay,
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

function serializeWeek(
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
    lineCount: week.lines.length,
    grandTotal: Math.round(
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
    })),
  };
}

async function loadWeekInclude(id: number) {
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
        },
        orderBy: { id: "asc" },
      },
    },
  });
}

/** Auto-cálculo Se/Pr por empleado en el rango. */
async function computeEmployeeCommissions(
  periodStart: Date,
  periodEnd: Date,
  branchId: number | null,
) {
  const employees = await prisma.account.findMany({
    where: {
      isActive: true,
      userId: { not: null },
      roles: { some: { role: { name: "employee" } } },
      ...(branchId
        ? { branches: { some: { branchId } } }
        : {}),
    },
    select: {
      id: true,
      userId: true,
      person: {
        select: {
          firstName: true,
          secondName: true,
          firstLastName: true,
          secondLastName: true,
        },
      },
      branches: {
        where: { isPrimary: true },
        select: { branchId: true },
        take: 1,
      },
    },
  });

  const personIds = employees
    .map((e) => e.userId)
    .filter((id): id is number => id != null);

  const appointmentSelect = {
    userId: true,
    branchId: true,
    payment: { select: { amount: true } },
    services: {
      select: {
        service: { select: { price: true, commissionPct: true } },
      },
    },
    products: {
      select: {
        quantity: true,
        product: {
          select: {
            price: true,
            commissionPct: true,
            category: { select: { commissionPct: true } },
          },
        },
      },
    },
  } as const;

  let appts = await prisma.appointment.findMany({
    where: {
      userId: { in: personIds.length ? personIds : [-1] },
      appointmentDate: { gte: periodStart, lte: periodEnd },
      status: "completed",
      ...(branchId ? { branchId } : {}),
      payment: { isNot: null },
    },
    select: appointmentSelect,
  });

  if (appts.length === 0 && personIds.length > 0) {
    appts = await prisma.appointment.findMany({
      where: {
        userId: { in: personIds },
        appointmentDate: { gte: periodStart, lte: periodEnd },
        ...(branchId ? { branchId } : {}),
        payment: { isNot: null },
      },
      select: appointmentSelect,
    });
  }

  type Acc = { produced: number; sales: number; branchId: number | null };
  const byPerson = new Map<number, Acc>();

  for (const a of appts) {
    const paid = toAmount(a.payment?.amount ?? 0);
    const calc = calcAppointmentCommission(a.services, a.products, paid);
    const prev = byPerson.get(a.userId) ?? {
      produced: 0,
      sales: 0,
      branchId: a.branchId ?? null,
    };
    prev.produced += calc.servicesCommission;
    prev.sales += calc.productsCommission;
    if (!prev.branchId && a.branchId) prev.branchId = a.branchId;
    byPerson.set(a.userId, prev);
  }

  return employees
    .filter((e) => e.userId != null)
    .map((e) => {
      const stats = byPerson.get(e.userId!) ?? {
        produced: 0,
        sales: 0,
        branchId: e.branches[0]?.branchId ?? null,
      };
      const producedAmount = Math.round(stats.produced * 100) / 100;
      const salesAmount = Math.round(stats.sales * 100) / 100;
      return {
        accountId: e.id,
        personId: e.userId!,
        name: personName(e.person),
        branchId: stats.branchId ?? e.branches[0]?.branchId ?? null,
        producedAmount,
        salesAmount,
        totalAmount: calcPayrollLineTotal({
          producedAmount,
          salesAmount,
          vouchersAmount: 0,
          cafeteriaAmount: 0,
          finesAmount: 0,
          discountsAmount: 0,
          additionalAmount: 0,
        }),
      };
    })
    .filter((e) => e.producedAmount > 0 || e.salesAmount > 0 || true);
}

/** GET lista semanas o preview */
export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");

    if (mode === "preview") {
      const settings = await getBusinessSettings();
      const ref =
        parseDateKey(String(url.searchParams.get("date") ?? "")) ?? new Date();
      const range = getPayrollWeekRange(ref, settings.payrollWeekStartDay);
      let branchId: number | null = null;
      const branchRaw = url.searchParams.get("branchId");
      if (isBranchAdminRole(auth.user.role)) {
        branchId = await getUserPrimaryBranchId(prisma, auth.user.id);
      } else if (branchRaw) {
        branchId = Number(branchRaw) || null;
      }
      const employees = await computeEmployeeCommissions(
        range.start,
        range.end,
        branchId,
      );
      return NextResponse.json({
        periodStart: toDateKey(range.start),
        periodEnd: toDateKey(range.end),
        payrollWeekStartDay: settings.payrollWeekStartDay,
        payrollAllowBranchAdmin: settings.payrollAllowBranchAdmin,
        employees,
      });
    }

    const weeks = await prisma.payrollWeek.findMany({
      orderBy: { periodStart: "desc" },
      take: 24,
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
          },
        },
      },
    });

    const settings = await getBusinessSettings();
    return NextResponse.json({
      payrollWeekStartDay: settings.payrollWeekStartDay,
      payrollAllowBranchAdmin: settings.payrollAllowBranchAdmin,
      weeks: weeks.map(serializeWeek),
    });
  } catch (error) {
    console.error("GET /api/finance/payroll-weeks", error);
    return NextResponse.json(
      { message: "Error al obtener liquidaciones" },
      { status: 500 },
    );
  }
}

/** POST crear liquidación semanal (híbrida: auto + líneas editables) */
export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const perm = await canManagePayroll(auth.user);
  if (!perm.ok) {
    return NextResponse.json({ message: perm.message }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const settings = await getBusinessSettings();
    const ref =
      parseDateKey(String(body.date ?? body.periodStart ?? "")) ?? new Date();
    let start = parseDateKey(String(body.periodStart ?? ""));
    let end = parseDateKey(String(body.periodEnd ?? ""));
    if (!start || !end) {
      const range = getPayrollWeekRange(ref, settings.payrollWeekStartDay);
      start = range.start;
      end = startOfLocalDay(range.end);
    } else {
      start = startOfLocalDay(start);
      end = startOfLocalDay(end);
    }

    let branchId: number | null = null;
    if (isBranchAdminRole(auth.user.role)) {
      branchId = await getUserPrimaryBranchId(prisma, auth.user.id);
    } else if (body.branchId != null && body.branchId !== "") {
      branchId = Number(body.branchId) || null;
    }

    const existing = await prisma.payrollWeek.findUnique({
      where: {
        periodStart_periodEnd: { periodStart: start, periodEnd: end },
      },
    });
    if (existing) {
      return NextResponse.json(
        { message: "Ya existe una liquidación para esa semana", id: existing.id },
        { status: 409 },
      );
    }

    const computed = await computeEmployeeCommissions(
      start,
      endOfLocalDay(end),
      branchId,
    );

    // Si vienen líneas manuales en el body, preferirlas (ajustes)
    const bodyLines = Array.isArray(body.lines) ? body.lines : null;
    const lineInputs =
      bodyLines && bodyLines.length > 0
        ? bodyLines.map((raw) => {
            const row = raw as Record<string, unknown>;
            const producedAmount = Math.max(0, toAmount(row.producedAmount));
            const salesAmount = Math.max(0, toAmount(row.salesAmount));
            const vouchersAmount = Math.max(0, toAmount(row.vouchersAmount));
            const cafeteriaAmount = Math.max(0, toAmount(row.cafeteriaAmount));
            const finesAmount = Math.max(0, toAmount(row.finesAmount));
            const discountsAmount = Math.max(0, toAmount(row.discountsAmount));
            const additionalAmount = Math.max(0, toAmount(row.additionalAmount));
            return {
              accountId: Number(row.accountId),
              branchId:
                row.branchId != null && row.branchId !== ""
                  ? Number(row.branchId)
                  : null,
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
              notes: String(row.notes ?? "").trim() || null,
            };
          })
        : computed.map((e) => ({
            accountId: e.accountId,
            branchId: e.branchId,
            producedAmount: e.producedAmount,
            salesAmount: e.salesAmount,
            vouchersAmount: 0,
            cafeteriaAmount: 0,
            finesAmount: 0,
            discountsAmount: 0,
            additionalAmount: 0,
            totalAmount: e.totalAmount,
            notes: null as string | null,
          }));

    const validLines = lineInputs.filter(
      (l) => Number.isInteger(l.accountId) && l.accountId > 0,
    );

    const week = await prisma.payrollWeek.create({
      data: {
        periodStart: start,
        periodEnd: end,
        status: "draft",
        notes: String(body.notes ?? "").trim() || null,
        createdById: auth.user.id,
        lines: {
          create: validLines,
        },
      },
    });

    const full = await loadWeekInclude(week.id);
    return NextResponse.json(serializeWeek(full!), { status: 201 });
  } catch (error) {
    console.error("POST /api/finance/payroll-weeks", error);
    const message =
      error instanceof Error ? error.message : "Error al crear liquidación";
    return NextResponse.json({ message }, { status: 400 });
  }
}
