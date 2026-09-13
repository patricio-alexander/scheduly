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
import { checkAuth } from "@/shared/utils/check-auth";
import {
  isBranchAdminRole,
  isManagementRole,
  isOwnerRole,
  mapExternalRoleName,
} from "@/shared/utils/roles";
import {
  serializeVoucher,
  voucherInclude,
} from "@/src/features/vouchers/lib/serialize-voucher";

const VALID_METHODS = ["cash", "card", "transfer"];

/** GET lista de vales del período + empleados con su saldo pendiente. */
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
    const scopeFilter = {
      ...(branchId ? { branchId } : {}),
      ...(personIds.length ? { userId: { in: personIds } } : { userId: -1 }),
    };

    // El listado se acota al período, pero el pendiente por empleado es
    // histórico: un vale de la semana pasada se sigue debiendo hoy.
    const [rows, pendingRows] = await Promise.all([
      prisma.employeeVoucher.findMany({
        where: { ...scopeFilter, issuedAt: { gte: start, lte: end } },
        include: voucherInclude,
        orderBy: { issuedAt: "desc" },
        take: 300,
      }),
      prisma.employeeVoucher.groupBy({
        by: ["userId"],
        where: { ...scopeFilter, settledAt: null },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const pendingByUser = new Map(
      pendingRows.map((r) => [
        r.userId,
        {
          amount: toAmount(r._sum.amount ?? 0),
          count: r._count._all,
        },
      ]),
    );

    const items = rows.map(serializeVoucher);
    const periodTotal = items.reduce((sum, i) => sum + i.amount, 0);
    const periodSettled = items
      .filter((i) => i.settledAt)
      .reduce((sum, i) => sum + i.amount, 0);
    const pendingTotal = [...pendingByUser.values()].reduce(
      (sum, p) => sum + p.amount,
      0,
    );

    return NextResponse.json({
      period,
      branchId,
      totals: {
        periodTotal: Math.round(periodTotal * 100) / 100,
        periodSettled: Math.round(periodSettled * 100) / 100,
        pendingTotal: Math.round(pendingTotal * 100) / 100,
        count: items.length,
      },
      employees: employees
        .map((e) => ({
          ...e,
          pendingAmount: pendingByUser.get(e.personId)?.amount ?? 0,
          pendingCount: pendingByUser.get(e.personId)?.count ?? 0,
        }))
        .sort(
          (a, b) =>
            b.pendingAmount - a.pendingAmount || a.name.localeCompare(b.name),
        ),
      items,
    });
  } catch (error) {
    console.error("GET /api/operation/vouchers", error);
    return NextResponse.json(
      { message: "Error al obtener los vales" },
      { status: 500 },
    );
  }
}

async function resolveVoucherBranchId(
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
      throw new Error("No puedes registrar vales en otra sucursal");
    }
    return branchId;
  }
  throw new Error("No autorizado");
}

/** POST registra un vale (adelanto de sueldo) a un empleado. */
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
      return NextResponse.json(
        { message: "Empleado inválido" },
        { status: 400 },
      );
    }
    if (amount <= 0) {
      return NextResponse.json({ message: "Monto inválido" }, { status: 400 });
    }

    const account = await prisma.account.findFirst({
      where: { userId, isActive: true },
      select: {
        id: true,
        userId: true,
        roles: { select: { role: { select: { name: true } } } },
        branches: { select: { branchId: true } },
        person: { select: { id: true } },
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
      branchIdRaw == null || branchIdRaw === "" ? null : Number(branchIdRaw);
    const branchId = await resolveVoucherBranchId(
      auth.user,
      requestedBranchId,
    );

    if (branchId != null) {
      const belongs = account.branches.some((b) => b.branchId === branchId);
      if (!belongs) {
        return NextResponse.json(
          { message: "El empleado no pertenece a esta sucursal" },
          { status: 400 },
        );
      }
    }

    const methodRaw = String(body.method ?? "cash");
    const method = VALID_METHODS.includes(methodRaw) ? methodRaw : "cash";
    const reason = String(body.reason ?? "").trim();

    const issuedAtRaw = body.issuedAt ? new Date(String(body.issuedAt)) : null;
    const issuedAt =
      issuedAtRaw && !Number.isNaN(issuedAtRaw.getTime())
        ? issuedAtRaw
        : new Date();

    const created = await prisma.employeeVoucher.create({
      data: {
        userId,
        branchId,
        registeredById: auth.user.id,
        amount,
        method,
        reason: reason || null,
        issuedAt,
      },
      include: voucherInclude,
    });

    return NextResponse.json(serializeVoucher(created), { status: 201 });
  } catch (error) {
    console.error("POST /api/operation/vouchers", error);
    const message =
      error instanceof Error ? error.message : "Error al registrar el vale";
    return NextResponse.json({ message }, { status: 400 });
  }
}
