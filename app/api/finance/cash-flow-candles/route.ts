import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import { parseBranchId, resolveDashboardScope } from "@/shared/utils/branches";
import { prisma } from "@/shared/utils/prisma";
import {
  type CashGranularity,
  bucketMeta,
  buildCandlesFromMovements,
  fetchAllCashMovements,
  openingBalanceBefore,
  round2,
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
      "week") as CashGranularity;
    if (!VALID.has(granularity)) {
      return NextResponse.json({ message: "granularity inválida" }, { status: 400 });
    }
    const limit = Math.min(60, Math.max(5, Number(url.searchParams.get("limit")) || 25));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

    const requestedBranchId = parseBranchId(url.searchParams.get("branchId"));
    const scope = await resolveDashboardScope(prisma, auth.user, requestedBranchId);
    const branchId = scope.branchId;

    const all = await fetchAllCashMovements(branchId);
    if (!all.length) {
      return NextResponse.json({
        granularity,
        openingBalance: 0,
        currentBalance: 0,
        totalCandles: 0,
        hasMore: false,
        limit,
        offset,
        candles: [],
      });
    }

    const firstTs = all[0].ts;
    const lastTs = all[all.length - 1].ts;

    // Generar todos los buckets del rango
    const buckets: ReturnType<typeof bucketMeta>[] = [];
    let cursor = firstTs;
    const guard = 5000;
    let i = 0;
    while (cursor <= lastTs && i < guard) {
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

    // Deduplicate by key
    const unique: ReturnType<typeof bucketMeta>[] = [];
    const seen = new Set<string>();
    for (const b of buckets) {
      if (seen.has(b.key)) continue;
      seen.add(b.key);
      unique.push(b);
    }

    const totalCandles = unique.length;
    const sliceEnd = Math.max(0, totalCandles - offset);
    const sliceStart = Math.max(0, sliceEnd - limit);
    const window = unique.slice(sliceStart, sliceEnd);

    const opening = window.length
      ? openingBalanceBefore(all, window[0].start)
      : 0;
    const candles = buildCandlesFromMovements(
      all,
      window,
      granularity,
      opening,
    );
    const currentBalance = round2(all.reduce((s, m) => s + m.delta, 0));

    return NextResponse.json({
      granularity,
      openingBalance: opening,
      currentBalance,
      totalCandles,
      hasMore: sliceStart > 0,
      limit,
      offset,
      candles,
    });
  } catch (error) {
    console.error("GET /api/finance/cash-flow-candles", error);
    return NextResponse.json(
      { message: "Error al cargar velas" },
      { status: 500 },
    );
  }
}
