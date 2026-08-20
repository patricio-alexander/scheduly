import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  getDashboardPeriodRange,
  parseDashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { parseBranchId, resolveDashboardScope, getUserPrimaryBranchId } from "@/shared/utils/branches";
import { toAmount } from "@/shared/utils/money";
import {
  paymentMethodOptions,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";
import { checkAuth } from "@/shared/utils/check-auth";
import { invalidateDashboard } from "@/shared/utils/socket";
import {
  isBranchAdminRole,
  isManagementRole,
  isOwnerRole,
} from "@/shared/utils/roles";

function parseMethod(value: unknown): PaymentMethodValue {
  const method = String(value ?? "cash");
  return (paymentMethodOptions as readonly string[]).includes(method)
    ? (method as PaymentMethodValue)
    : "cash";
}

async function resolveExpenseBranchId(
  user: { id: number; role: string },
  requestedBranchId: number | null,
): Promise<number | null> {
  if (isOwnerRole(user.role)) {
    return requestedBranchId && requestedBranchId > 0 ? requestedBranchId : null;
  }

  if (isBranchAdminRole(user.role)) {
    const branchId = await getUserPrimaryBranchId(prisma, user.id);
    if (!branchId) {
      throw new Error("No tienes una sucursal asignada");
    }
    if (requestedBranchId && requestedBranchId !== branchId) {
      throw new Error("No puedes registrar gastos en otra sucursal");
    }
    return branchId;
  }

  throw new Error("No autorizado");
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

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

    const expenses = await prisma.expense.findMany({
      where: {
        date: { gte: start, lte: end },
        status: "paid",
      },
      include: {
        creator: { select: { id: true, username: true } },
      },
      orderBy: { date: "desc" },
      take: 200,
    });

    const categoryNames = [
      ...new Set(
        expenses
          .map((e) => e.category?.trim())
          .filter((c): c is string => Boolean(c)),
      ),
    ].sort();

    const categories = categoryNames.map((name, idx) => ({
      id: idx + 1,
      name,
    }));

    return NextResponse.json({
      period,
      categories,
      expenses: expenses.map((e) => ({
        id: e.id,
        amount: toAmount(e.amount),
        description: e.concept ?? "",
        method: "cash",
        expenseDate: e.date.toISOString(),
        category: {
          id: Math.max(1, categoryNames.indexOf(e.category?.trim() || "") + 1),
          name: e.category || "Sin categoría",
        },
        branch: null,
        staff: e.creator
          ? { id: e.creator.id, name: e.creator.username ?? "—" }
          : null,
      })),
    });
  } catch (error) {
    console.error("GET /api/expenses", error);
    return NextResponse.json({ message: "Error al obtener gastos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const amount = toAmount(body.amount);
    const categoryId = Number(body.categoryId);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ message: "Categoría inválida" }, { status: 400 });
    }
    if (amount <= 0) {
      return NextResponse.json({ message: "Monto inválido" }, { status: 400 });
    }

    const branchIdRaw = body.branchId;
    const requestedBranchId =
      branchIdRaw == null || branchIdRaw === ""
        ? null
        : Number(branchIdRaw);

    if (
      requestedBranchId != null &&
      (!Number.isInteger(requestedBranchId) || requestedBranchId <= 0)
    ) {
      return NextResponse.json({ message: "Sucursal inválida" }, { status: 400 });
    }

    const branchId = await resolveExpenseBranchId(auth.user, requestedBranchId);

    const expense = await prisma.expense.create({
      data: {
        amount,
        categoryId,
        branchId,
        userId: auth.user.id,
        description: String(body.description ?? "").trim(),
        method: parseMethod(body.method),
        expenseDate:
          typeof body.expenseDate === "string" && body.expenseDate
            ? new Date(body.expenseDate)
            : new Date(),
      },
      include: { category: true, branch: { select: { id: true, name: true } } },
    });

    invalidateDashboard("expense:created");

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al registrar gasto";
    return NextResponse.json({ message }, { status: 400 });
  }
}
