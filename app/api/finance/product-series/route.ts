import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import { parseBranchId, resolveDashboardScope } from "@/shared/utils/branches";
import { prisma } from "@/shared/utils/prisma";
import { toAmount } from "@/shared/utils/money";
import {
  getDashboardPeriodRange,
  parseDashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { toDayKey } from "@/shared/utils/finance-cashflow";
import { saleLineWhereForLocation } from "@/shared/utils/pos-location";

type ItemKind = "all" | "products" | "services";

function parseKind(raw: string | null): ItemKind {
  if (raw === "products" || raw === "services") return raw;
  return "all";
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const period = parseDashboardPeriod(url.searchParams.get("period") || "month");
    const sortBy = url.searchParams.get("sortBy") === "qty" ? "qty" : "amount";
    const kind = parseKind(url.searchParams.get("kind"));
    const band = Math.max(0, Number(url.searchParams.get("band")) || 0);
    const bandSize = 10;

    const requestedBranchId = parseBranchId(url.searchParams.get("branchId"));
    const scope = await resolveDashboardScope(prisma, auth.user, requestedBranchId);
    const branchId = scope.branchId;
    const { start, end } = getDashboardPeriodRange(period);

    const includeProducts = kind === "all" || kind === "products";

    const saleLines = includeProducts
      ? await prisma.saleLine.findMany({
          where: {
            ...saleLineWhereForLocation(branchId),
            sale: { date: { gte: start, lte: end } },
          },
          include: {
            product: { select: { id: true, name: true } },
            sale: { select: { date: true, paidAt: true } },
          },
        })
      : [];

    type Agg = {
      key: string;
      id: number;
      kind: "product" | "service";
      name: string;
      totalQty: number;
      totalAmt: number;
      byDay: Map<string, { qty: number; amt: number }>;
    };
    const map = new Map<string, Agg>();

    const bump = (
      itemKind: "product" | "service",
      id: number,
      name: string,
      qty: number,
      amt: number,
      date: Date,
    ) => {
      const key = `${itemKind}:${id}`;
      const current = map.get(key) ?? {
        key,
        id,
        kind: itemKind,
        name,
        totalQty: 0,
        totalAmt: 0,
        byDay: new Map(),
      };
      current.totalQty += qty;
      current.totalAmt += amt;
      const dayKey = toDayKey(date);
      const day = current.byDay.get(dayKey) ?? { qty: 0, amt: 0 };
      day.qty += qty;
      day.amt += amt;
      current.byDay.set(dayKey, day);
      map.set(key, current);
    };

    for (const row of saleLines) {
      const qty = Math.max(
        0,
        toAmount(row.quantity) -
          toAmount(row.damagedQty) -
          toAmount(row.giftQty),
      );
      if (qty <= 0) continue;
      bump(
        "product",
        row.product.id,
        row.product.name,
        qty,
        qty * toAmount(row.price),
        row.sale.paidAt ?? row.sale.date,
      );
    }

    const ranked = [...map.values()].sort((a, b) =>
      sortBy === "qty"
        ? b.totalQty - a.totalQty || b.totalAmt - a.totalAmt
        : b.totalAmt - a.totalAmt || b.totalQty - a.totalQty,
    );

    const totalRanked = ranked.length;
    const totalBands = Math.max(1, Math.ceil(totalRanked / bandSize) || 1);
    const safeBand = Math.min(band, Math.max(0, totalBands - 1));
    const rankStart = safeBand * bandSize + 1;
    const slice = ranked.slice(safeBand * bandSize, safeBand * bandSize + bandSize);

    const dayKeys = new Set<string>();
    for (const item of slice) {
      for (const k of item.byDay.keys()) dayKeys.add(k);
    }
    const dates = [...dayKeys].sort();

    const dataset = dates.map((date) => {
      const row: Record<string, string | number> = { date };
      for (const item of slice) {
        row[item.key] = item.byDay.get(date)?.qty ?? 0;
      }
      return row;
    });
    const datasetAmount = dates.map((date) => {
      const row: Record<string, string | number> = { date };
      for (const item of slice) {
        row[item.key] = item.byDay.get(date)?.amt ?? 0;
      }
      return row;
    });

    return NextResponse.json({
      period,
      kind,
      band: safeBand,
      sortBy,
      rankStart,
      rankEnd: rankStart + slice.length - 1,
      totalBands,
      totalRanked,
      periodLabel:
        period === "today"
          ? "Hoy"
          : period === "week"
            ? "Semana"
            : period === "all"
              ? "Todo"
              : "Mes",
      sales: {
        products: slice.map((item, i) => ({
          id: item.id,
          key: item.key,
          kind: item.kind,
          name: item.name,
          rank: rankStart + i,
          totalQty: item.totalQty,
          totalAmt: toAmount(item.totalAmt),
        })),
        dataset,
        datasetAmount,
      },
    });
  } catch (error) {
    console.error("GET /api/finance/product-series", error);
    return NextResponse.json(
      { message: "Error al cargar series de productos" },
      { status: 500 },
    );
  }
}
