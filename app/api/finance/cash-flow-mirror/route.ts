import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import { parseBranchId, resolveDashboardScope } from "@/shared/utils/branches";
import { prisma } from "@/shared/utils/prisma";
import {
  type CashGranularity,
  bucketKey,
  bucketMeta,
  endOfDay,
  endOfMonth,
  endOfWeek,
  fetchCashMovements,
  parseDayKey,
  round2,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDayKey,
} from "@/shared/utils/finance-cashflow";

const VALID = new Set<CashGranularity>(["day", "week", "month"]);

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const granularity = (url.searchParams.get("granularity") ||
      "day") as CashGranularity;
    if (!VALID.has(granularity)) {
      return NextResponse.json({ message: "granularity inválida" }, { status: 400 });
    }

    const startRaw = url.searchParams.get("startDate");
    const endRaw = url.searchParams.get("endDate") || startRaw;
    if (!startRaw || !/^\d{4}-\d{2}-\d{2}$/.test(startRaw)) {
      return NextResponse.json(
        { message: "startDate requerido (yyyy-MM-dd)" },
        { status: 400 },
      );
    }

    const requestedBranchId = parseBranchId(url.searchParams.get("branchId"));
    const scope = await resolveDashboardScope(prisma, auth.user, requestedBranchId);
    const branchId = scope.branchId;

    let start = startOfDay(parseDayKey(startRaw));
    let end = endOfDay(parseDayKey(endRaw || startRaw));

    if (granularity === "week") {
      start = startOfWeek(start);
      end = endOfWeek(end);
    } else if (granularity === "month") {
      start = startOfMonth(start);
      end = endOfMonth(end);
    }

    const movements = await fetchCashMovements(start, end, branchId);
    const buckets: ReturnType<typeof bucketMeta>[] = [];
    let cursor = start;
    const guard = 400;
    let i = 0;
    while (cursor <= end && i < guard) {
      buckets.push(bucketMeta(cursor, granularity));
      if (granularity === "day") {
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 1);
      } else if (granularity === "week") {
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7);
      } else {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
      i += 1;
    }

    const unique: ReturnType<typeof bucketMeta>[] = [];
    const seen = new Set<string>();
    for (const b of buckets) {
      if (seen.has(b.key)) continue;
      seen.add(b.key);
      unique.push(b);
    }

    const byKey = new Map<string, { income: number; expense: number }>();
    for (const m of movements) {
      const key = bucketKey(m.ts, granularity);
      const row = byKey.get(key) ?? { income: 0, expense: 0 };
      if (m.delta >= 0) row.income += m.delta;
      else row.expense += Math.abs(m.delta);
      byKey.set(key, row);
    }

    const bucketsOut = unique.map((b) => {
      const row = byKey.get(b.key) ?? { income: 0, expense: 0 };
      const income = round2(row.income);
      const expense = round2(row.expense);
      const net = round2(income - expense);
      return {
        key: b.key,
        label: b.label,
        start: toDayKey(b.start),
        end: toDayKey(b.end),
        income,
        expense: -expense,
        expenseTotal: expense,
        netBalance: net,
        marginPct: income > 0 ? round2((net / income) * 100) : 0,
      };
    });

    return NextResponse.json({
      granularity,
      startDate: toDayKey(start),
      endDate: toDayKey(end),
      buckets: bucketsOut,
    });
  } catch (error) {
    console.error("GET /api/finance/cash-flow-mirror", error);
    return NextResponse.json(
      { message: "Error al cargar mirror" },
      { status: 500 },
    );
  }
}
