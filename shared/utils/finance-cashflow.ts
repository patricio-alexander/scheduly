import { prisma } from "@/shared/utils/prisma";
import { toAmount } from "@/shared/utils/money";
import {
  isPaidSale,
  saleTotal,
} from "@/shared/utils/dashboard-eddeli-metrics";
import { saleWhereForLocation } from "@/shared/utils/pos-location";

export type CashGranularity = "day" | "week" | "month";

export type CashMovement = {
  ts: Date;
  dayKey: string;
  delta: number;
  kind: "income" | "expense";
  label?: string;
  /** Origen del movimiento (para métricas de calendario). */
  source?: "ledger" | "sale" | "appointment";
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

function saleEventDate(sale: { paidAt: Date | null; date: Date }) {
  return sale.paidAt ?? sale.date;
}

/**
 * Ingresos/gastos del rango para charts de caja.
 * Incluye ledger (Income/Expense) + ventas POS pagadas + cobros de citas,
 * alineado con el panel (que ya cae a sales/appointments si no hay Income).
 */
export async function fetchCashMovements(
  start: Date,
  end: Date,
  branchId: number | null,
): Promise<CashMovement[]> {
  const location = branchId
    ? await prisma.branch.findUnique({
        where: { id: branchId },
        select: { locationKind: true },
      })
    : null;
  const isVitrina = location?.locationKind === "vitrina";

  const [incomes, expenses, deliveryLines, sales, appointmentPayments] =
    await Promise.all([
      isVitrina
        ? Promise.resolve([])
        : prisma.income.findMany({
            where: {
              date: { gte: start, lte: end },
              status: "paid",
            },
            select: {
              date: true,
              amount: true,
              concept: true,
              category: true,
              referenceType: true,
            },
            orderBy: { date: "asc" },
          }),
      isVitrina
        ? Promise.resolve([])
        : prisma.expense.findMany({
            where: {
              date: { gte: start, lte: end },
              status: "paid",
            },
            select: { date: true, amount: true, concept: true, category: true },
            orderBy: { date: "asc" },
          }),
      branchId
        ? prisma.saleLine.findMany({
            where: {
              deliveredStoreId: branchId,
              sale: {
                OR: [
                  { paidAt: { gte: start, lte: end } },
                  { paidAt: null, date: { gte: start, lte: end } },
                ],
              },
            },
            select: {
              quantity: true,
              price: true,
              damagedQty: true,
              giftQty: true,
              sale: { select: { date: true, paidAt: true, status: true } },
            },
          })
        : Promise.resolve([]),
      // Ventas POS (salón): no duplicar si ya hay Income vía financeIncomeId
      isVitrina
        ? Promise.resolve([])
        : prisma.sale.findMany({
            where: {
              financeIncomeId: null,
              ...saleWhereForLocation(branchId),
              OR: [
                { paidAt: { gte: start, lte: end } },
                {
                  paidAt: null,
                  date: { gte: start, lte: end },
                  status: "pagado",
                },
              ],
            },
            select: {
              id: true,
              date: true,
              paidAt: true,
              status: true,
              notes: true,
              lines: {
                select: {
                  quantity: true,
                  price: true,
                  damagedQty: true,
                  giftQty: true,
                },
              },
            },
          }),
      isVitrina
        ? Promise.resolve([])
        : prisma.appointmentPayment.findMany({
            where: {
              paidAt: { gte: start, lte: end },
              ...(branchId ? { appointment: { branchId } } : {}),
            },
            select: {
              id: true,
              amount: true,
              paidAt: true,
              method: true,
              appointmentId: true,
            },
          }),
    ]);

  const incomeMovements: CashMovement[] = isVitrina
    ? deliveryLines.map((line) => {
        const qty = Math.max(
          0,
          toAmount(line.quantity) -
            toAmount(line.damagedQty) -
            toAmount(line.giftQty),
        );
        const ts = line.sale.paidAt ?? line.sale.date;
        return {
          ts,
          dayKey: toDayKey(ts),
          delta: qty * toAmount(line.price),
          kind: "income" as const,
          label: "Entrega vitrina",
          source: "sale" as const,
        };
      })
    : incomes.map((row) => {
        const ref = (row.referenceType ?? "").toLowerCase();
        const cat = (row.category ?? "").toLowerCase();
        const isSaleRef = ref === "order" || cat === "sales";
        return {
          ts: row.date,
          dayKey: toDayKey(row.date),
          delta: toAmount(row.amount),
          kind: "income" as const,
          label: row.concept || row.category || "Ingreso",
          source: isSaleRef ? ("sale" as const) : ("ledger" as const),
        };
      });

  const expenseMovements: CashMovement[] = expenses.map((row) => ({
    ts: row.date,
    dayKey: toDayKey(row.date),
    delta: -toAmount(row.amount),
    kind: "expense" as const,
    label: row.concept || row.category || "Gasto",
    source: "ledger" as const,
  }));

  const saleMovements: CashMovement[] = sales
    .filter((sale) => isPaidSale(sale))
    .map((sale) => {
      const ts = saleEventDate(sale);
      const amount = saleTotal(sale);
      return {
        ts,
        dayKey: toDayKey(ts),
        delta: amount,
        kind: "income" as const,
        label: sale.notes?.includes("[CAJA_POS]")
          ? `Venta POS #${sale.id}`
          : `Venta #${sale.id}`,
        source: "sale" as const,
      };
    })
    .filter((m) => m.delta > 0);

  const appointmentMovements: CashMovement[] = appointmentPayments
    .map((pay) => ({
      ts: pay.paidAt,
      dayKey: toDayKey(pay.paidAt),
      delta: toAmount(pay.amount),
      kind: "income" as const,
      label: `Cobro cita #${pay.appointmentId}`,
      source: "appointment" as const,
    }))
    .filter((m) => m.delta > 0);

  return [
    ...incomeMovements,
    ...expenseMovements,
    ...saleMovements,
    ...appointmentMovements,
  ].sort((a, b) => a.ts.getTime() - b.ts.getTime());
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
      if (m.source === "appointment") {
        row.appointmentsAmount = round2(row.appointmentsAmount + m.delta);
        row.appointmentsCount += 1;
      } else if (m.source === "sale") {
        row.productSalesAmount = round2(row.productSalesAmount + m.delta);
        row.productSalesCount += 1;
      } else {
        row.productSalesAmount = round2(row.productSalesAmount + m.delta);
        row.productSalesCount += 1;
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
