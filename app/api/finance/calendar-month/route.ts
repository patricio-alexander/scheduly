import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import { parseBranchId, resolveDashboardScope } from "@/shared/utils/branches";
import { prisma } from "@/shared/utils/prisma";
import {
  emptyDayMetrics,
  endOfMonth,
  fetchDayMetricsMap,
  round2,
  startOfMonth,
  toDayKey,
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
    const month = Number(url.searchParams.get("month"));
    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        { message: "Parámetros year y month (1-12) requeridos" },
        { status: 400 },
      );
    }

    const requestedBranchId = parseBranchId(url.searchParams.get("branchId"));
    const scope = await resolveDashboardScope(prisma, auth.user, requestedBranchId);
    const branchId = scope.branchId;

    const start = startOfMonth(new Date(year, month - 1, 1));
    const end = endOfMonth(start);
    const daysMap = await fetchDayMetricsMap(start, end, branchId);

    const days: Record<string, ReturnType<typeof emptyDayMetrics>> = {};
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = toDayKey(cursor);
      days[key] = daysMap[key] ?? emptyDayMetrics();
      cursor.setDate(cursor.getDate() + 1);
    }

    const totals = emptyDayMetrics();
    for (const row of Object.values(days)) {
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

    return NextResponse.json({
      year,
      month,
      days,
      totals,
    });
  } catch (error) {
    console.error("GET /api/finance/calendar-month", error);
    return NextResponse.json(
      { message: "Error al cargar calendario del mes" },
      { status: 500 },
    );
  }
}
