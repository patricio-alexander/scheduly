import { prisma } from "@/shared/utils/prisma";
import { toAmount } from "@/shared/utils/money";

export type CashGranularity = "day" | "week" | "month";

export type CashMovement = {
  ts: Date;
  dayKey: string;
  delta: number;
  kind: "income" | "expense";
  label?: string;
};

export type DayMetrics = {
  incomeAmount: number;
  incomeCount: number;
  expenseAmount: number;
  expenseCount: number;
  appointmentsAmount: number;
  appointmentsCount: number;
  productSalesAmount: number;
  productSalesCount: number;
};

export function emptyDayMetrics(): DayMetrics {
  return {
    incomeAmount: 0,
    incomeCount: 0,
    expenseAmount: 0,
    expenseCount: 0,
    appointmentsAmount: 0,
    appointmentsCount: 0,
    productSalesAmount: 0,
    productSalesCount: 0,
  };
}

export function round2(n: number) {
  return Number(Number(n || 0).toFixed(2));
}

export function toDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function endOfWeek(d: Date) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return endOfDay(e);
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(d: Date) {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function bucketKey(ts: Date, granularity: CashGranularity) {
  if (granularity === "day") return toDayKey(ts);
  if (granularity === "week") return toDayKey(startOfWeek(ts));
  return monthKey(ts);
}

function esWeekdayShort(d: Date) {
  return d.toLocaleDateString("es-EC", { weekday: "short" });
}

function esDayMonth(d: Date) {
  return d.toLocaleDateString("es-EC", { day: "numeric", month: "short" });
}

function esMonthYear(d: Date) {
  return d.toLocaleDateString("es-EC", { month: "short", year: "numeric" });
}

export function bucketMeta(date: Date, granularity: CashGranularity) {
  if (granularity === "day") {
    const start = startOfDay(date);
    return {
      key: toDayKey(start),
      label: `${esWeekdayShort(start)} ${esDayMonth(start)}`,
      start,
      end: endOfDay(start),
      time: toDayKey(start),
    };
  }
  if (granularity === "week") {
    const start = startOfWeek(date);
    const weekEnd = endOfWeek(date);
    return {
      key: toDayKey(start),
      label: `${esDayMonth(start)} – ${esDayMonth(weekEnd)}`,
      start,
      end: weekEnd,
      time: toDayKey(start),
    };
  }
  const start = startOfMonth(date);
  return {
    key: monthKey(start),
    label: esMonthYear(start),
    start,
    end: endOfMonth(start),
    time: toDayKey(start),
  };
}

/** Ingresos (Income EdDeli) y gastos (Expense) del rango. */
export async function fetchCashMovements(
  start: Date,
  end: Date,
  _branchId: number | null,
): Promise<CashMovement[]> {
  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({
      where: {
        date: { gte: start, lte: end },
        status: "paid",
      },
      select: { date: true, amount: true, concept: true, category: true },
      orderBy: { date: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        date: { gte: start, lte: end },
        status: "paid",
      },
      select: { date: true, amount: true, concept: true, category: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const movements: CashMovement[] = [
    ...incomes.map((row) => ({
      ts: row.date,
      dayKey: toDayKey(row.date),
      delta: toAmount(row.amount),
      kind: "income" as const,
      label: row.concept || row.category || "Ingreso",
    })),
    ...expenses.map((row) => ({
      ts: row.date,
      dayKey: toDayKey(row.date),
      delta: -toAmount(row.amount),
      kind: "expense" as const,
      label: row.concept || row.category || "Gasto",
    })),
  ];

  return movements.sort((a, b) => a.ts.getTime() - b.ts.getTime());
}

export async function fetchDayMetricsMap(
  start: Date,
  end: Date,
  branchId: number | null,
): Promise<Record<string, DayMetrics>> {
  const movements = await fetchCashMovements(start, end, branchId);
  const days: Record<string, DayMetrics> = {};

  for (const m of movements) {
    if (!days[m.dayKey]) days[m.dayKey] = emptyDayMetrics();
    const row = days[m.dayKey];
    if (m.kind === "income") {
      row.incomeAmount = round2(row.incomeAmount + m.delta);
      row.incomeCount += 1;
      const isSale =
        (m.label ?? "").toLowerCase().includes("order") ||
        (m.label ?? "").toLowerCase().includes("venta") ||
        (m.label ?? "").toLowerCase().includes("sales");
      if (isSale) {
        row.productSalesAmount = round2(row.productSalesAmount + m.delta);
        row.productSalesCount += 1;
      } else {
        row.appointmentsAmount = round2(row.appointmentsAmount + m.delta);
        row.appointmentsCount += 1;
      }
    } else {
      row.expenseAmount = round2(row.expenseAmount + Math.abs(m.delta));
      row.expenseCount += 1;
    }
  }

  return days;
}

export function buildCandlesFromMovements(
  movements: CashMovement[],
  buckets: ReturnType<typeof bucketMeta>[],
  granularity: CashGranularity,
  openingBalance: number,
) {
  const byKey = new Map<string, CashMovement[]>();
  for (const m of movements) {
    const key = bucketKey(m.ts, granularity);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(m);
  }

  let balance = openingBalance;
  return buckets.map((bucket) => {
    const open = round2(balance);
    let high = balance;
    let low = balance;
    for (const m of byKey.get(bucket.key) || []) {
      balance += m.delta;
      high = Math.max(high, balance);
      low = Math.min(low, balance);
    }
    const close = round2(balance);
    return {
      key: bucket.key,
      label: bucket.label,
      time: bucket.time,
      open,
      high: round2(high),
      low: round2(low),
      close,
      overdraft: low < 0,
      bullish: close >= open,
    };
  });
}

export function openingBalanceBefore(
  allMovementsChronological: CashMovement[],
  before: Date,
) {
  let balance = 0;
  for (const m of allMovementsChronological) {
    if (m.ts < before) balance += m.delta;
    else break;
  }
  return round2(balance);
}

/** Todos los movimientos históricos (para saldo de apertura). */
export async function fetchAllCashMovements(
  branchId: number | null,
): Promise<CashMovement[]> {
  const farPast = new Date(2000, 0, 1);
  const farFuture = new Date(2100, 11, 31);
  return fetchCashMovements(farPast, farFuture, branchId);
}
