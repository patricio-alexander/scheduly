"use client";

import { Button } from "@heroui/react";
import ArrowLeft from "@gravity-ui/icons/ArrowLeft";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { Skeleton } from "@/shared/components/ui";

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

type YearResponse = {
  year: number;
  months: Record<string, FinanceBucket>;
  totals: FinanceBucket;
};

type YearFinanceOverviewChartProps = {
  year?: number;
  branchId?: number | null;
  onMonthSelect?: (date: Date) => void;
  /** Columna estrecha: meses densos en 2 columnas. */
  compact?: boolean;
};

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

const MONTHS_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

function MonthCard({
  label,
  bucket,
  active,
  onPress,
  compact,
}: {
  label: string;
  bucket: FinanceBucket;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const net = bucket.incomeAmount - bucket.expenseAmount;
  const volume = Math.max(bucket.incomeAmount, bucket.expenseAmount, 1);
  const incomePct = Math.max(8, Math.round((bucket.incomeAmount / volume) * 100));
  const expensePct = Math.max(8, Math.round((bucket.expenseAmount / volume) * 100));

  return (
    <button
      type="button"
      onClick={onPress}
      className={`group text-left transition-all ${
        compact
          ? `rounded-xl border p-2.5 ${
              active
                ? "border-accent bg-accent/8"
                : "border-separator bg-surface hover:border-accent/35 hover:bg-surface-secondary/40"
            }`
          : `rounded-2xl border p-4 ${
              active
                ? "border-accent bg-accent/8 shadow-sm"
                : "border-separator bg-surface hover:border-accent/35 hover:bg-surface-secondary/40"
            }`
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>{label}</p>
          {!compact ? (
            <p className="mt-1 text-[11px] text-muted">
              {bucket.incomeCount + bucket.expenseCount} movimientos
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full font-semibold ${
            compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"
          } ${
            net >= 0
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-danger/10 text-danger"
          }`}
        >
          {net >= 0 ? "+" : ""}
          {formatMoney(net)}
        </span>
      </div>

      <div className={compact ? "mt-2 space-y-1.5" : "mt-4 space-y-2"}>
        <div>
          {!compact ? (
            <div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-muted">
              <span>Ingresos</span>
              <span className="tabular-nums text-foreground">{formatMoney(bucket.incomeAmount)}</span>
            </div>
          ) : null}
          <div className={`rounded-full bg-surface-secondary ${compact ? "h-1.5" : "h-2"}`}>
            <div
              className={`rounded-full bg-[var(--success)] ${compact ? "h-1.5" : "h-2"}`}
              style={{ width: `${incomePct}%` }}
            />
          </div>
        </div>
        <div>
          {!compact ? (
            <div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-muted">
              <span>Gastos</span>
              <span className="tabular-nums text-foreground">{formatMoney(bucket.expenseAmount)}</span>
            </div>
          ) : null}
          <div className={`rounded-full bg-surface-secondary ${compact ? "h-1.5" : "h-2"}`}>
            <div
              className={`rounded-full bg-[var(--danger)] ${compact ? "h-1.5" : "h-2"}`}
              style={{ width: `${expensePct}%` }}
            />
          </div>
        </div>
      </div>

      {!compact ? (
        <>
          <div className="mt-4 flex items-center justify-between text-[11px] text-muted">
            <span>Pedidos</span>
            <span className="tabular-nums">{formatMoney(bucket.appointmentsAmount)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
            <span>Productos</span>
            <span className="tabular-nums">{formatMoney(bucket.productSalesAmount)}</span>
          </div>
        </>
      ) : null}
    </button>
  );
}

export function YearFinanceOverviewChart({
  year,
  branchId = null,
  onMonthSelect,
  compact = false,
}: YearFinanceOverviewChartProps) {
  const [selectedYear, setSelectedYear] = useState(year ?? new Date().getFullYear());
  const [data, setData] = useState<YearResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof year === "number") {
      setSelectedYear(year);
    }
  }, [year]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ year: String(selectedYear) });
    if (typeof branchId === "number") {
      params.set("branchId", String(branchId));
    }

    setLoading(true);
    setError(null);

    fetch(apiUrl(`/api/finance/calendar-year?${params.toString()}`), {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message || "No se pudo cargar el resumen anual");
        }
        return (await response.json()) as YearResponse;
      })
      .then((payload) => setData(payload))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Error al cargar el resumen anual");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedYear, branchId]);

  const summary = useMemo(() => {
    const totals = data?.totals;
    if (!totals) return null;
    return {
      income: totals.incomeAmount,
      expense: totals.expenseAmount,
      net: totals.incomeAmount - totals.expenseAmount,
    };
  }, [data]);

  return (
    <section
      className={`flex h-full min-w-0 flex-col rounded-2xl border border-separator bg-surface ${
        compact ? "p-3 md:p-4" : "p-4 md:p-5"
      }`}
    >
      <div className={`mb-3 flex flex-wrap items-start justify-between gap-2 ${compact ? "" : "mb-4 gap-3"}`}>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center rounded-xl bg-accent/10 text-accent ${
              compact ? "h-9 w-9" : "h-10 w-10"
            }`}
          >
            <ChartColumn width={compact ? 16 : 18} height={compact ? 16 : 18} />
          </div>
          <div>
            <h2 className={`font-semibold ${compact ? "text-sm" : "text-base"}`}>
              {compact ? "Anual" : "Panorama anual"}
            </h2>
            <p className="text-xs text-muted">{compact ? "12 meses" : "Resumen financiero mes a mes"}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            isIconOnly
            size="sm"
            onPress={() => setSelectedYear((value) => value - 1)}
          >
            <ArrowLeft width={16} height={16} />
          </Button>
          <div
            className={`rounded-xl border border-separator text-center text-sm font-semibold ${
              compact ? "min-w-16 px-2 py-1.5" : "min-w-24 px-3 py-2"
            }`}
          >
            {selectedYear}
          </div>
          <Button
            variant="secondary"
            isIconOnly
            size="sm"
            onPress={() => setSelectedYear((value) => value + 1)}
          >
            <ArrowRight width={16} height={16} />
          </Button>
        </div>
      </div>

      {summary ? (
        compact ? (
          <div className="mb-3 flex flex-wrap gap-1.5 text-[10px]">
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatMoney(summary.income)}
            </span>
            <span className="rounded-full bg-danger/10 px-2 py-1 font-semibold tabular-nums text-danger">
              {formatMoney(summary.expense)}
            </span>
            <span
              className={`rounded-full border border-separator px-2 py-1 font-semibold tabular-nums ${
                summary.net >= 0 ? "text-accent" : "text-warning"
              }`}
            >
              {formatMoney(summary.net)}
            </span>
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-separator bg-surface-secondary/30 p-3">
              <p className="text-xs text-muted">Ingresos del año</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatMoney(summary.income)}
              </p>
            </div>
            <div className="rounded-2xl border border-separator bg-surface-secondary/30 p-3">
              <p className="text-xs text-muted">Gastos del año</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-danger">
                {formatMoney(summary.expense)}
              </p>
            </div>
            <div className="rounded-2xl border border-separator bg-surface-secondary/30 p-3">
              <p className="text-xs text-muted">Resultado neto</p>
              <p
                className={`mt-1 text-lg font-bold tabular-nums ${
                  summary.net >= 0 ? "text-accent" : "text-warning"
                }`}
              >
                {formatMoney(summary.net)}
              </p>
            </div>
          </div>
        )
      ) : null}

      {loading ? (
        <div
          className={`grid gap-2 ${
            compact
              ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
          }`}
        >
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className={compact ? "h-16 rounded-xl" : "h-48 rounded-2xl"} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </div>
      ) : (
        <div
          className={`grid gap-2 ${
            compact
              ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          }`}
        >
          {(compact ? MONTHS_SHORT : MONTHS).map((monthLabel, monthIndex) => {
            const key = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`;
            const bucket =
              data?.months[key] ?? {
                incomeAmount: 0,
                incomeCount: 0,
                expenseAmount: 0,
                expenseCount: 0,
                appointmentsAmount: 0,
                appointmentsCount: 0,
                productSalesAmount: 0,
                productSalesCount: 0,
              };

            const today = new Date();
            const active =
              selectedYear === today.getFullYear() && monthIndex === today.getMonth();

            return (
              <MonthCard
                key={key}
                label={monthLabel}
                bucket={bucket}
                active={active}
                compact={compact}
                onPress={() => onMonthSelect?.(new Date(selectedYear, monthIndex, 1))}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
