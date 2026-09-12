import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  getDashboardPeriodRange,
  parseDashboardPeriod,
} from "@/shared/utils/dashboard-period";
import {
  getUserPrimaryBranchId,
  parseBranchId,
  resolveDashboardScope,
} from "@/shared/utils/branches";
import { toAmount } from "@/shared/utils/money";
import { personFullName } from "@/shared/utils/person-name";
import {
  settleCommissionsForEmployeePayment,
  reconcileCommissionSettlementsForUser,
} from "@/shared/utils/commissions";
import { checkAuth } from "@/shared/utils/check-auth";
import { invalidateDashboard } from "@/shared/utils/socket";
import {
  isBranchAdminRole,
  isManagementRole,
  isOwnerRole,
  mapExternalRoleName,
} from "@/shared/utils/roles";

function registrarName(account: {
  username: string | null;
  person: {
    firstName: string | null;
    firstLastName: string | null;
    secondName?: string | null;
    secondLastName?: string | null;
  } | null;
}) {
  const fromPerson = personFullName(account.person);
  if (fromPerson && fromPerson !== "—") return fromPerson;
  return account.username?.trim() || "—";
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const period = parseDashboardPeriod(url.searchParams.get("period"));
    const requestedBranchId = parseBranchId(url.searchParams.get("branchId"));
    const { start, end } = getDashboardPeriodRange(period);

    const scope = await resolveDashboardScope(
      prisma,
      auth.user,
      requestedBranchId,
    );
    const branchId = scope.branchId;

    const accounts = await prisma.account.findMany({
      where: {
        isActive: true,
        userId: { not: null },
        ...(branchId ? { branches: { some: { branchId } } } : {}),
      },
      select: {
        id: true,
        username: true,
        userId: true,
        person: {
          select: {
            id: true,
            firstName: true,
            secondName: true,
            firstLastName: true,
            secondLastName: true,
          },
        },
        roles: { select: { role: { select: { name: true } } } },
        branches: {
          where: branchId ? { branchId } : { isPrimary: true },
          include: { branch: { select: { id: true, name: true } } },
          take: 1,
        },
      },
      orderBy: { id: "asc" },
    });

    const employees = accounts
      .filter((a) =>
        a.roles.some((r) => mapExternalRoleName(r.role.name) === "employee"),
      )
      .filter((a) => a.userId != null && a.person != null)
      .map((a) => ({
        personId: a.userId as number,
        name: personFullName(a.person),
        branch: a.branches[0]?.branch ?? null,
      }));

    const personIds = employees.map((e) => e.personId);
    if (personIds.length) {
      await Promise.all(
        personIds.map((userId) =>
          reconcileCommissionSettlementsForUser(prisma, userId),
        ),
      );
    }

    const [commissions, payments] = await Promise.all([
      prisma.commissionRecord.findMany({
        where: {
          settledAt: null,
          createdAt: { gte: start, lte: end },
          ...(branchId ? { appointment: { branchId } } : {}),
          ...(personIds.length ? { userId: { in: personIds } } : { userId: -1 }),
        },
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              secondName: true,
              firstLastName: true,
              secondLastName: true,
            },
          },
          appointment: {
            select: {
              id: true,
              title: true,
              appointmentDate: true,
              branch: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.employeePayment.findMany({
        where: {
          paidAt: { gte: start, lte: end },
          ...(branchId ? { branchId } : {}),
          ...(personIds.length ? { userId: { in: personIds } } : { userId: -1 }),
        },
        include: {
          registeredBy: {
            select: {
              id: true,
              username: true,
              person: {
                select: {
                  firstName: true,
                  firstLastName: true,
                  secondName: true,
                  secondLastName: true,
                },
              },
            },
          },
          person: {
            select: {
              id: true,
              firstName: true,
              secondName: true,
              firstLastName: true,
              secondLastName: true,
            },
          },
        },
        orderBy: { paidAt: "desc" },
      }),
    ]);

    type PayrollRow = {
      userId: number;
      name: string;
      branch: { id: number; name: string } | null;
      completedAppointments: number;
      commissionTotal: number;
      paidTotal: number;
      pendingAmount: number;
      isFullyPaid: boolean;
      commissionLines: Array<{
        appointmentId: number;
        title: string;
        appointmentDate: string;
        baseAmount: number;
        amount: number;
      }>;
      payments: Array<{
        id: number;
        amount: number;
        method: string;
        paidAt: string;
        notes: string;
        registeredBy: { id: number; name: string };
      }>;
    };

    const byUser = new Map<number, PayrollRow>();

    for (const employee of employees) {
      byUser.set(employee.personId, {
        userId: employee.personId,
        name: employee.name,
        branch: employee.branch,
        completedAppointments: 0,
        commissionTotal: 0,
        paidTotal: 0,
        pendingAmount: 0,
        isFullyPaid: false,
        commissionLines: [],
        payments: [],
      });
    }

    for (const record of commissions) {
      let row = byUser.get(record.userId);
      if (!row) {
        row = {
          userId: record.userId,
          name: personFullName(record.person),
          branch: record.appointment.branch,
          completedAppointments: 0,
          commissionTotal: 0,
          paidTotal: 0,
          pendingAmount: 0,
          isFullyPaid: false,
          commissionLines: [],
          payments: [],
        };
        byUser.set(record.userId, row);
      }

      const amount = toAmount(record.amount);
      row.commissionTotal += amount;
      row.completedAppointments += 1;
      row.commissionLines.push({
        appointmentId: record.appointment.id,
        title: record.appointment.title,
        appointmentDate: record.appointment.appointmentDate.toISOString(),
        baseAmount: toAmount(record.baseAmount),
        amount,
      });
    }

    for (const payment of payments) {
      let row = byUser.get(payment.userId);
      if (!row) continue;
      const amount = toAmount(payment.amount);
      row.paidTotal += amount;
      row.payments.push({
        id: payment.id,
        amount,
        method: payment.method,
        paidAt: payment.paidAt.toISOString(),
        notes: payment.notes ?? "",
        registeredBy: {
          id: payment.registeredBy.id,
          name: registrarName(payment.registeredBy),
        },
      });
    }

    const payrollEmployees = [...byUser.values()]
      .map((row) => {
        const pendingAmount = Math.round(row.commissionTotal * 100) / 100;
        return {
          ...row,
          pendingAmount,
          isFullyPaid: pendingAmount <= 0 && row.paidTotal > 0,
        };
      })
      .sort(
        (a, b) =>
          b.pendingAmount - a.pendingAmount || a.name.localeCompare(b.name),
      );

    const totalCommissions = payrollEmployees.reduce(
      (sum, e) => sum + e.commissionTotal,
      0,
    );
    const totalPaid = payrollEmployees.reduce((sum, e) => sum + e.paidTotal, 0);
    const totalPending = payrollEmployees.reduce(
      (sum, e) => sum + e.pendingAmount,
      0,
    );

    return NextResponse.json({
      period,
      branchId,
      totalCommissions,
      totalPaid,
      totalPending,
      employeeCount: payrollEmployees.length,
      employees: payrollEmployees,
    });
  } catch (error) {
    console.error("GET /api/finance/payroll", error);
    return NextResponse.json(
      { message: "Error al obtener sueldos" },
      { status: 500 },
    );
  }
}

async function resolvePaymentBranchId(
  user: { id: number; role: string },
  requestedBranchId: number | null,
): Promise<number | null> {
  if (isOwnerRole(user.role)) {
    return requestedBranchId && requestedBranchId > 0 ? requestedBranchId : null;
  }
  if (isBranchAdminRole(user.role)) {
    const branchId = await getUserPrimaryBranchId(prisma, user.id);
    if (!branchId) throw new Error("No tienes una sucursal asignada");
    if (requestedBranchId && requestedBranchId !== branchId) {
      throw new Error("No puedes registrar pagos en otra sucursal");
    }
    return branchId;
  }
  throw new Error("No autorizado");
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const userId = Number(body.userId);
    const amount = toAmount(body.amount);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ message: "Empleado inválido" }, { status: 400 });
    }
    if (amount <= 0) {
      return NextResponse.json({ message: "Monto inválido" }, { status: 400 });
    }

    const account = await prisma.account.findFirst({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        roles: { select: { role: { select: { name: true } } } },
        branches: { select: { branchId: true } },
        person: {
          select: {
            id: true,
            firstName: true,
            secondName: true,
            firstLastName: true,
            secondLastName: true,
          },
        },
      },
    });

    const isEmployee =
      account &&
      account.roles.some(
        (r) => mapExternalRoleName(r.role.name) === "employee",
      );
    if (!account || !isEmployee || !account.person) {
      return NextResponse.json(
        { message: "Empleado no encontrado" },
        { status: 400 },
      );
    }

    const branchIdRaw = body.branchId;
    const requestedBranchId =
      branchIdRaw == null || branchIdRaw === ""
        ? null
        : Number(branchIdRaw);

    const branchId = await resolvePaymentBranchId(auth.user, requestedBranchId);

    if (branchId != null) {
      const belongs = account.branches.some((b) => b.branchId === branchId);
      if (!belongs) {
        return NextResponse.json(
          { message: "El empleado no pertenece a esta sucursal" },
          { status: 400 },
        );
      }
    }

    const method = String(body.method ?? "cash");
    const validMethods = ["cash", "card", "transfer"];
    const paymentMethod = validMethods.includes(method) ? method : "cash";
    const notes = String(body.notes ?? "").trim();
    const period = parseDashboardPeriod(
      body.period != null ? String(body.period) : null,
    );
    const { start, end } = getDashboardPeriodRange(period);

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.employeePayment.create({
        data: {
          userId,
          branchId,
          registeredById: auth.user.id,
          amount,
          method: paymentMethod,
          notes: notes || null,
        },
        include: {
          registeredBy: {
            select: {
              id: true,
              username: true,
              person: {
                select: {
                  firstName: true,
                  firstLastName: true,
                  secondName: true,
                  secondLastName: true,
                },
              },
            },
          },
          person: {
            select: {
              id: true,
              firstName: true,
              secondName: true,
              firstLastName: true,
              secondLastName: true,
            },
          },
          branch: { select: { id: true, name: true } },
        },
      });

      await settleCommissionsForEmployeePayment(tx, {
        userId,
        branchId,
        paymentAmount: amount,
        periodStart: start,
        periodEnd: end,
      });

      return created;
    });

    invalidateDashboard("payroll:payment-created");

    return NextResponse.json(
      {
        id: payment.id,
        userId: payment.userId,
        amount: toAmount(payment.amount),
        method: payment.method,
        paidAt: payment.paidAt.toISOString(),
        notes: payment.notes ?? "",
        registeredBy: {
          id: payment.registeredBy.id,
          name: registrarName(payment.registeredBy),
        },
        employee: {
          id: payment.person.id,
          name: personFullName(payment.person),
        },
        branch: payment.branch,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/finance/payroll", error);
    const message =
      error instanceof Error ? error.message : "Error al registrar el pago";
    return NextResponse.json({ message }, { status: 400 });
  }
}
