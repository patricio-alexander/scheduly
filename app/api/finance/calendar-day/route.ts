import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import { parseBranchId, resolveDashboardScope } from "@/shared/utils/branches";
import { prisma } from "@/shared/utils/prisma";
import { toAmount } from "@/shared/utils/money";
import {
  endOfDay,
  parseDayKey,
  round2,
  startOfDay,
} from "@/shared/utils/finance-cashflow";

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const dateRaw = url.searchParams.get("date");
    if (!dateRaw || !/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      return NextResponse.json(
        { message: "Parámetro date requerido (yyyy-MM-dd)" },
        { status: 400 },
      );
    }

    const requestedBranchId = parseBranchId(url.searchParams.get("branchId"));
    await resolveDashboardScope(prisma, auth.user, requestedBranchId);

    const day = parseDayKey(dateRaw);
    const start = startOfDay(day);
    const end = endOfDay(day);

    const [incomes, expenses] = await Promise.all([
      prisma.income.findMany({
        where: {
          date: { gte: start, lte: end },
          status: "paid",
        },
        orderBy: { date: "asc" },
      }),
      prisma.expense.findMany({
        where: {
          date: { gte: start, lte: end },
          status: "paid",
        },
        orderBy: { date: "asc" },
      }),
    ]);

    const incomeRows = incomes.map((row) => {
      const isSale =
        (row.referenceType ?? "").toLowerCase() === "order" ||
        (row.category ?? "").toLowerCase() === "sales";
      return {
        id: `inc-${row.id}`,
        type: isSale ? ("product" as const) : ("appointment" as const),
        label: row.concept || row.category || "Ingreso",
        amount: toAmount(row.amount),
        at: row.date.toISOString(),
      };
    });

    const expenseRows = expenses.map((e) => ({
      id: e.id,
      label: e.concept || e.category || "Gasto",
      category: e.category || "Sin categoría",
      amount: toAmount(e.amount),
      at: e.date.toISOString(),
    }));

    const incomeTotal = round2(incomeRows.reduce((s, i) => s + i.amount, 0));
    const expenseTotal = round2(expenseRows.reduce((s, e) => s + e.amount, 0));

    return NextResponse.json({
      date: dateRaw,
      incomes: incomeRows,
      expenses: expenseRows,
      totals: {
        income: incomeTotal,
        expense: expenseTotal,
        net: round2(incomeTotal - expenseTotal),
      },
    });
  } catch (error) {
    console.error("GET /api/finance/calendar-day", error);
    return NextResponse.json(
      { message: "Error al cargar detalle del día" },
      { status: 500 },
    );
  }
}
