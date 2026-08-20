import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import { parseBranchId, resolveDashboardScope } from "@/shared/utils/branches";
import { prisma } from "@/shared/utils/prisma";
import {
  emptyDayMetrics,
  endOfMonth,
  fetchDayMetricsMap,
  monthKey,
  round2,
  startOfMonth,
} from "@/shared/utils/finance-cashflow";

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year"));
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { message: "Parámetro year requerido (2000-2100)" },
        { status: 400 },
      );
    }

    const requestedBranchId = parseBranchId(url.searchParams.get("branchId"));
    const scope = await resolveDashboardScope(prisma, auth.user, requestedBranchId);
    const branchId = scope.branchId;

    const start = startOfMonth(new Date(year, 0, 1));
    const end = endOfMonth(new Date(year, 11, 1));
    const days = await fetchDayMetricsMap(start, end, branchId);

    const months: Record<string, ReturnType<typeof emptyDayMetrics>> = {};
    for (let m = 0; m < 12; m++) {
      const key = monthKey(new Date(year, m, 1));
      months[key] = emptyDayMetrics();
    }

    for (const [day, metrics] of Object.entries(days)) {
      const mk = day.slice(0, 7);
      if (!months[mk]) continue;
      const row = months[mk];
      row.incomeAmount = round2(row.incomeAmount + metrics.incomeAmount);
      row.incomeCount += metrics.incomeCount;
      row.expenseAmount = round2(row.expenseAmount + metrics.expenseAmount);
      row.expenseCount += metrics.expenseCount;
      row.appointmentsAmount = round2(
        row.appointmentsAmount + metrics.appointmentsAmount,
      );
      row.appointmentsCount += metrics.appointmentsCount;
      row.productSalesAmount = round2(
        row.productSalesAmount + metrics.productSalesAmount,
      );
      row.productSalesCount += metrics.productSalesCount;
    }

    const totals = emptyDayMetrics();
    for (const row of Object.values(months)) {
      totals.incomeAmount = round2(totals.incomeAmount + row.incomeAmount);
      totals.incomeCount += row.incomeCount;
      totals.expenseAmount = round2(totals.expenseAmount + row.expenseAmount);
      totals.expenseCount += row.expenseCount;
      totals.appointmentsAmount = round2(
        totals.appointmentsAmount + row.appointmentsAmount,
      );
      totals.appointmentsCount += row.appointmentsCount;
      totals.productSalesAmount = round2(
        totals.productSalesAmount + row.productSalesAmount,
      );
      totals.productSalesCount += row.productSalesCount;
    }

    return NextResponse.json({ year, months, totals });
  } catch (error) {
    console.error("GET /api/finance/calendar-year", error);
    return NextResponse.json(
      { message: "Error al cargar resumen anual" },
      { status: 500 },
    );
  }
}
