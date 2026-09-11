"use client";

import { Button } from "@heroui/react";
import ArrowLeft from "@gravity-ui/icons/ArrowLeft";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import CalendarIcon from "@gravity-ui/icons/Calendar";
import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { CHART_FALLBACK } from "@/shared/utils/chart-colors";
import { Skeleton } from "@/shared/components/ui";
import { CalendarDayDetailModal } from "./CalendarDayDetailModal";

type FinanceBucket = {
  incomeAmount: number;
  incomeCount: number;
  expenseAmount: number;
  expenseCount: number;
  appointmentsAmount: number;
  appointmentsCount: number;
  productSalesAmount: number;
  productSalesCount: number;
};

type MonthResponse = {
  year: number;
  month: number;
  days: Record<string, FinanceBucket>;
  totals: FinanceBucket;
};

type NavigateToMonth = {
  date: Date;
  requestId: string | number;
};

type MonthCalendarChartProps = {
  initialDate?: Date;
  navigateToMonth?: NavigateToMonth | null;
  branchId?: number | null;
};

const WEEK_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

const LINE_COLORS = {
  appointments: "#38bdf8",
  products: CHART_FALLBACK.warning,
  income: CHART_FALLBACK.success,
  expense: CHART_FALLBACK.danger,
} as const;

const LEGEND = [
  { key: "appointments", label: "Ventas", color: LINE_COLORS.appointments },
  { key: "products", label: "Productos", color: LINE_COLORS.products },
  { key: "income", label: "Ingresos", color: LINE_COLORS.income },
  { key: "expense", label: "Gastos", color: LINE_COLORS.expense },
] as const;

function emptyBucket(): FinanceBucket {
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

function toMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

function toDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayIndex(date: Date) {
  const weekday = date.getDay();
  return weekday === 0 ? 6 : weekday - 1;
}

function monthTitle(date: Date) {
  return date.toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  });
}

function moneyCompact(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function pct(value: number, max: number) {
  if (!max || max <= 0) return 0;
  return Math.min(100, (Number(value) / max) * 100);
}

function buildCalendarDays(monthDate: Date, daysMap: Record<string, FinanceBucket>) {
  const monthStart = toMonthStart(monthDate);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 12, 0, 0, 0);
  const leading = mondayIndex(monthStart);
  const cells: Array<{
    key: string;
    date: Date | null;
    metrics: FinanceBucket | null;
  }> = [];

  for (let index = 0; index < leading; index += 1) {
    cells.push({ key: `lead-${index}`, date: null, metrics: null });
  }

  const cursor = new Date(monthStart);
  while (cursor <= monthEnd) {
    const day = new Date(cursor);
    const key = toDayKey(day);
    cells.push({
      key,
      date: day,
      metrics: daysMap[key] ?? null,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const trailing = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let index = 0; index < trailing; index += 1) {
    cells.push({ key: `trail-${index}`, date: null, metrics: null });
  }

  return cells;
}

function ValueStrip({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  if (!(value > 0)) return null;
  const width = Math.max(6, pct(value, max));
  return (
    <div className="mb-1 last:mb-0">
      <p
        className="mb-0.5 text-right text-[10px] font-bold leading-none tabular-nums"
        style={{ color }}
      >
        {moneyCompact(value)}
      </p>
      <div className="h-[3px] overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function MonthCalendarChart({
  initialDate,
  navigateToMonth,
  branchId = null,
}: MonthCalendarChartProps) {
  const [visibleDate, setVisibleDate] = useState(toMonthStart(initialDate ?? new Date()));
  const [data, setData] = useState<MonthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!navigateToMonth) return;
    setVisibleDate(toMonthStart(navigateToMonth.date));
  }, [navigateToMonth?.requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      year: String(visibleDate.getFullYear()),
      month: String(visibleDate.getMonth() + 1),
    });
    if (typeof branchId === "number") {
      params.set("branchId", String(branchId));
    }

    setLoading(true);
    setError(null);

    fetch(apiUrl(`/api/finance/calendar-month?${params.toString()}`), {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message || "No se pudo cargar el calendario mensual");
        }
        return (await response.json()) as MonthResponse;
      })
      .then((payload) => setData(payload))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Error al cargar el calendario");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [visibleDate, branchId]);

  const calendarCells = useMemo(
    () => buildCalendarDays(visibleDate, data?.days ?? {}),
    [visibleDate, data],
  );

  const weeks = useMemo(() => {
    const rows: (typeof calendarCells)[] = [];
    for (let i = 0; i < calendarCells.length; i += 7) {
      rows.push(calendarCells.slice(i, i + 7));
    }
    return rows;
  }, [calendarCells]);

  const maxima = useMemo(() => {
    const days = Object.values(data?.days ?? {});
    return {
      appointments: Math.max(1, ...days.map((d) => d.appointmentsAmount || 0)),
      products: Math.max(1, ...days.map((d) => d.productSalesAmount || 0)),
      income: Math.max(1, ...days.map((d) => d.incomeAmount || 0)),
      expense: Math.max(1, ...days.map((d) => d.expenseAmount || 0)),
    };
  }, [data]);

  const monthNet = useMemo(() => {
    if (!data) return 0;
    return data.totals.incomeAmount - data.totals.expenseAmount;
  }, [data]);

  const openDay = (day: Date) => {
    setSelectedDate(day);
    setModalOpen(true);
  };

  return (
    <>
      <section className="rounded-2xl border border-separator bg-surface p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <CalendarIcon width={18} height={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Calendario financiero</h2>
              <p className="text-xs text-muted">
                Ventas, productos, ingresos y gastos por día · clic para detalle
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              isIconOnly
              size="sm"
              onPress={() =>
                setVisibleDate(
                  (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1, 12, 0, 0, 0),
                )
              }
            >
              <ArrowLeft width={16} height={16} />
            </Button>
            <div className="min-w-44 rounded-xl border border-separator px-3 py-2 text-center text-sm font-semibold capitalize">
              {monthTitle(visibleDate)}
            </div>
            <Button
              variant="secondary"
              isIconOnly
              size="sm"
              onPress={() =>
                setVisibleDate(
                  (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1, 12, 0, 0, 0),
                )
              }
            >
              <ArrowRight width={16} height={16} />
            </Button>
          </div>
        </div>

        {/* Leyenda de colores (estilo EdDeli) */}
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {LEGEND.map((item) => (
            <div key={item.key} className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: item.color }}
              />
              <span className="text-[11px] text-muted">{item.label}</span>
            </div>
          ))}
        </div>

        {data ? (
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-xl border border-separator bg-surface-secondary/25 px-3 py-2">
              <p className="text-[11px] text-muted">Ventas</p>
              <p
                className="mt-0.5 text-sm font-extrabold tabular-nums"
                style={{ color: LINE_COLORS.appointments }}
              >
                {formatMoney(data.totals.appointmentsAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-separator bg-surface-secondary/25 px-3 py-2">
              <p className="text-[11px] text-muted">Productos</p>
              <p
                className="mt-0.5 text-sm font-extrabold tabular-nums"
                style={{ color: LINE_COLORS.products }}
              >
                {formatMoney(data.totals.productSalesAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-separator bg-surface-secondary/25 px-3 py-2">
              <p className="text-[11px] text-muted">Ingresos</p>
              <p
                className="mt-0.5 text-sm font-extrabold tabular-nums"
                style={{ color: LINE_COLORS.income }}
              >
                {formatMoney(data.totals.incomeAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-separator bg-surface-secondary/25 px-3 py-2">
              <p className="text-[11px] text-muted">Gastos · Neto {formatMoney(monthNet)}</p>
              <p
                className="mt-0.5 text-sm font-extrabold tabular-nums"
                style={{ color: LINE_COLORS.expense }}
              >
                {formatMoney(data.totals.expenseAmount)}
              </p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 40 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="mb-2 grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(72px,0.55fr)] gap-2">
                {WEEK_LABELS.map((label) => (
                  <div
                    key={label}
                    className="rounded-lg px-1 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted"
                  >
                    {label}
                  </div>
                ))}
                <div className="rounded-lg px-1 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-accent">
                  Sem
                </div>
              </div>

              <div className="space-y-2">
                {weeks.map((week, weekIndex) => {
                  const weekTotals = week.reduce(
                    (acc, cell) => {
                      const m = cell.metrics ?? emptyBucket();
                      return {
                        appointments: acc.appointments + (m.appointmentsAmount || 0),
                        products: acc.products + (m.productSalesAmount || 0),
                        income: acc.income + (m.incomeAmount || 0),
                        expense: acc.expense + (m.expenseAmount || 0),
                      };
                    },
                    { appointments: 0, products: 0, income: 0, expense: 0 },
                  );

                  return (
                    <div
                      key={`week-${weekIndex}`}
                      className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(72px,0.55fr)] gap-2"
                    >
                      {week.map((cell) => {
                        const day = cell.date;
                        const metrics = cell.metrics;
                        const isToday =
                          day != null && toDayKey(day) === toDayKey(new Date());
                        const hasMovement = Boolean(
                          metrics &&
                            (metrics.incomeAmount > 0 ||
                              metrics.expenseAmount > 0 ||
                              metrics.appointmentsAmount > 0 ||
                              metrics.productSalesAmount > 0),
                        );

                        if (!day) {
                          return (
                            <div
                              key={cell.key}
                              className="min-h-[7.5rem] rounded-xl border border-dashed border-separator/50 bg-surface-secondary/10"
                            />
                          );
                        }

                        return (
                          <button
                            key={cell.key}
                            type="button"
                            onClick={() => openDay(day)}
                            className={`min-h-[7.5rem] rounded-xl border p-2 text-left transition-colors ${
                              hasMovement
                                ? "border-separator bg-surface hover:border-accent/40 hover:bg-surface-secondary/25"
                                : "border-separator/70 bg-surface-secondary/10 hover:bg-surface-secondary/20"
                            } ${isToday ? "ring-1 ring-accent/50" : ""}`}
                          >
                            <div className="mb-2 flex items-center justify-between gap-1">
                              <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                                  isToday
                                    ? "bg-accent text-accent-foreground"
                                    : "text-foreground"
                                }`}
                              >
                                {day.getDate()}
                              </span>
                            </div>

                            {hasMovement && metrics ? (
                              <div className="space-y-0.5">
                                <ValueStrip
                                  value={metrics.appointmentsAmount}
                                  max={maxima.appointments}
                                  color={LINE_COLORS.appointments}
                                />
                                <ValueStrip
                                  value={metrics.productSalesAmount}
                                  max={maxima.products}
                                  color={LINE_COLORS.products}
                                />
                                <ValueStrip
                                  value={metrics.incomeAmount}
                                  max={maxima.income}
                                  color={LINE_COLORS.income}
                                />
                                <ValueStrip
                                  value={metrics.expenseAmount}
                                  max={maxima.expense}
                                  color={LINE_COLORS.expense}
                                />
                              </div>
                            ) : (
                              <p className="mt-4 text-center text-[10px] text-muted/70">—</p>
                            )}
                          </button>
                        );
                      })}

                      <div className="flex min-h-[7.5rem] flex-col justify-center gap-1 rounded-xl border border-separator/80 bg-surface-secondary/20 px-2 py-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">
                          Sem {weekIndex + 1}
                        </p>
                        <p
                          className="text-[10px] font-bold tabular-nums"
                          style={{ color: LINE_COLORS.appointments }}
                        >
                          {moneyCompact(weekTotals.appointments)}
                        </p>
                        <p
                          className="text-[10px] font-bold tabular-nums"
                          style={{ color: LINE_COLORS.products }}
                        >
                          {moneyCompact(weekTotals.products)}
                        </p>
                        <p
                          className="text-[10px] font-bold tabular-nums"
                          style={{ color: LINE_COLORS.income }}
                        >
                          {moneyCompact(weekTotals.income)}
                        </p>
                        <p
                          className="text-[10px] font-bold tabular-nums"
                          style={{ color: LINE_COLORS.expense }}
                        >
                          {moneyCompact(weekTotals.expense)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <CalendarDayDetailModal
        open={modalOpen}
        date={selectedDate}
        onClose={() => setModalOpen(false)}
        branchId={branchId}
      />
    </>
  );
}
