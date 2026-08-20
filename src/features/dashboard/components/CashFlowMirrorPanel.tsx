"use client";

import { Button } from "@heroui/react";
import CircleDollar from "@gravity-ui/icons/CircleDollar";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { Skeleton } from "@/shared/components/ui";
import { useChartThemeColors } from "../hooks/useChartThemeColors";
import {
  currentWeekMirrorFocus,
  type CashFlowMirrorFocus,
} from "./cashFlowLinkUtils";

type MirrorBucket = {
  key: string;
  label: string;
  start: string;
  end: string;
  income: number;
  expense: number;
  expenseTotal: number;
  netBalance: number;
  marginPct: number;
};

type MirrorResponse = {
  granularity: "day" | "week" | "month";
  startDate: string;
  endDate: string;
  buckets: MirrorBucket[];
};

type CashFlowMirrorPanelProps = {
  focus: CashFlowMirrorFocus | null;
  branchId?: number | null;
  onClearFocus: () => void;
  onBucketClick?: (key: string) => void;
};

export function CashFlowMirrorPanel({
  focus,
  branchId = null,
  onClearFocus,
  onBucketClick,
}: CashFlowMirrorPanelProps) {
  const theme = useChartThemeColors();
  const activeFocus = focus ?? currentWeekMirrorFocus();
  const [data, setData] = useState<MirrorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      granularity: activeFocus.granularity,
      startDate: activeFocus.startDate,
      endDate: activeFocus.endDate,
    });
    if (typeof branchId === "number") {
      params.set("branchId", String(branchId));
    }

    setLoading(true);
    setError(null);

    fetch(apiUrl(`/api/finance/cash-flow-mirror?${params.toString()}`), {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message || "No se pudo cargar el flujo semanal");
        }
        return (await response.json()) as MirrorResponse;
      })
      .then((payload) => setData(payload))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Error al cargar el flujo");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeFocus.granularity, activeFocus.startDate, activeFocus.endDate, branchId]);

  const chartData = useMemo(
    () =>
      (data?.buckets ?? []).map((bucket) => ({
        ...bucket,
        expenseMirror: -Math.abs(Number(bucket.expenseTotal || 0)),
        highlighted: activeFocus.highlightKey === bucket.key,
      })),
    [data, activeFocus.highlightKey],
  );

  const totals = useMemo(() => {
    if (!data) return null;
    return data.buckets.reduce(
      (acc, bucket) => ({
        income: acc.income + bucket.income,
        expense: acc.expense + bucket.expenseTotal,
        net: acc.net + bucket.netBalance,
      }),
      { income: 0, expense: 0, net: 0 },
    );
  }, [data]);

  const yMax = useMemo(() => {
    let max = 100;
    for (const row of chartData) {
      max = Math.max(max, Number(row.income || 0), Math.abs(Number(row.expenseMirror || 0)));
    }
    return Math.ceil(max * 1.15) || 100;
  }, [chartData]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-separator bg-surface p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <CircleDollar width={18} height={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Flujo de ingresos y gastos</h2>
            <p className="text-xs text-muted">
              {focus
                ? "Según la vela seleccionada"
                : "Semana actual · clic en una vela para cambiar"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-separator px-2.5 py-1.5 text-[11px] text-muted">
            {activeFocus.startDate} → {activeFocus.endDate}
          </div>
          {focus ? (
            <Button variant="secondary" size="sm" onPress={onClearFocus}>
              Semana actual
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-[220px] rounded-2xl" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </div>
      ) : chartData.length > 0 ? (
        <>
          {totals ? (
            <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-full bg-emerald-500/15 px-2 py-1 font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                Ing. {formatMoney(totals.income)}
              </span>
              <span className="rounded-full bg-danger/10 px-2 py-1 font-semibold tabular-nums text-danger">
                Gas. {formatMoney(totals.expense)}
              </span>
              <span
                className={`rounded-full border border-separator px-2 py-1 font-semibold tabular-nums ${
                  totals.net >= 0 ? "text-accent" : "text-warning"
                }`}
              >
                Bal. {formatMoney(totals.net)}
              </span>
            </div>
          ) : null}

          <div className="min-h-[220px] flex-1 rounded-2xl border border-separator bg-surface-secondary/10 p-2">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid stroke={theme.separator} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: theme.muted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis
                    domain={[-yMax, yMax]}
                    tick={{ fill: theme.muted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickFormatter={(value) =>
                      new Intl.NumberFormat("es-CL", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(Number(value))
                    }
                  />
                  <ReferenceLine y={0} stroke={theme.separator} />
                  <Tooltip
                    cursor={{ fill: "color-mix(in srgb, var(--foreground) 6%, transparent)" }}
                    contentStyle={{
                      background: theme.surface,
                      border: `1px solid ${theme.separator}`,
                      borderRadius: "12px",
                      fontSize: 12,
                      color: theme.foreground,
                    }}
                    formatter={(value, name) => [
                      formatMoney(Math.abs(Number(value))),
                      name === "income" ? "Ingresos" : "Gastos",
                    ]}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar
                    dataKey="income"
                    name="income"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(item) => {
                      const key = (item as { payload?: { key?: string } })?.payload?.key;
                      if (key) onBucketClick?.(key);
                    }}
                  >
                    {chartData.map((bucket) => (
                      <Cell
                        key={`income-${bucket.key}`}
                        fill={bucket.highlighted ? theme.accent : theme.success}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="expenseMirror"
                    name="expense"
                    radius={[0, 0, 6, 6]}
                    cursor="pointer"
                    onClick={(item) => {
                      const key = (item as { payload?: { key?: string } })?.payload?.key;
                      if (key) onBucketClick?.(key);
                    }}
                  >
                    {chartData.map((bucket) => (
                      <Cell
                        key={`expense-${bucket.key}`}
                        fill={bucket.highlighted ? theme.warning : theme.danger}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-separator bg-surface-secondary/15 p-6 text-sm text-muted">
          Sin movimientos en esta semana.
        </div>
      )}
    </section>
  );
}
