"use client";

import { Button } from "@heroui/react";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import ArrowLeft from "@gravity-ui/icons/ArrowLeft";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
import { CHART_FALLBACK } from "@/shared/utils/chart-colors";

type MetricMode = "amount" | "qty";
type PeriodMode = "today" | "week" | "month";
type KindMode = "all" | "products" | "services";

type SeriesItem = {
  id: number;
  key: string;
  kind: "product" | "service";
  name: string;
  rank: number;
  totalQty: number;
  totalAmt: number;
};

type ProductSeriesResponse = {
  period: PeriodMode;
  kind: KindMode;
  band: number;
  sortBy: MetricMode;
  rankStart: number;
  rankEnd: number;
  totalBands: number;
  totalRanked: number;
  periodLabel: string;
  sales: {
    products: SeriesItem[];
    dataset: Array<Record<string, string | number>>;
    datasetAmount: Array<Record<string, string | number>>;
  };
};

type ProductSeriesPanelProps = {
  branchId?: number | null;
};

const PERIOD_OPTIONS: Array<{ value: PeriodMode; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

const KIND_OPTIONS: Array<{ value: KindMode; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "products", label: "Productos" },
  { value: "services", label: "Servicios" },
];

const METRIC_OPTIONS: Array<{ value: MetricMode; label: string }> = [
  { value: "amount", label: "$" },
  { value: "qty", label: "Cant" },
];

const EXTRA_LINE_COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#0ea5e9",
  "#f97316",
  "#14b8a6",
  "#64748b",
  "#84cc16",
];

function qtyLabel(item: SeriesItem) {
  if (item.kind === "service") {
    return `${item.totalQty} ${item.totalQty === 1 ? "vez" : "veces"}`;
  }
  return `${item.totalQty} ${item.totalQty === 1 ? "unidad" : "unidades"}`;
}

export function ProductSeriesPanel({ branchId = null }: ProductSeriesPanelProps) {
  const theme = useChartThemeColors();
  const lineColors = [
    theme.accent || CHART_FALLBACK.accent,
    theme.success || CHART_FALLBACK.success,
    theme.warning || CHART_FALLBACK.warning,
    ...EXTRA_LINE_COLORS,
  ];
  const [period, setPeriod] = useState<PeriodMode>("month");
  const [kind, setKind] = useState<KindMode>("all");
  const [metric, setMetric] = useState<MetricMode>("amount");
  const [band, setBand] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [data, setData] = useState<ProductSeriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBand(0);
  }, [period, metric, kind, branchId]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      period,
      sortBy: metric,
      band: String(band),
      kind,
    });
    if (typeof branchId === "number") {
      params.set("branchId", String(branchId));
    }

    setLoading(true);
    setError(null);

    fetch(apiUrl(`/api/finance/product-series?${params.toString()}`), {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message || "No se pudo cargar la serie");
        }
        return (await response.json()) as ProductSeriesResponse;
      })
      .then((payload) => {
        setData(payload);
        setSelectedKey((current) =>
          current && payload.sales.products.some((item) => item.key === current)
            ? current
            : payload.sales.products[0]?.key ?? null,
        );
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Error al cargar las series");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [period, metric, band, kind, branchId]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return metric === "amount" ? data.sales.datasetAmount : data.sales.dataset;
  }, [data, metric]);

  const selectedItem = useMemo(
    () => data?.sales.products.find((item) => item.key === selectedKey) ?? null,
    [data, selectedKey],
  );

  const emptyMessage =
    kind === "services"
      ? "No hay servicios completados en el periodo seleccionado."
      : kind === "products"
        ? "No hay ventas de productos en el periodo seleccionado."
        : "No hay productos ni servicios en el periodo seleccionado.";

  return (
    <section className="rounded-2xl border border-separator bg-surface p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <ChartColumn width={18} height={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold">Series de ventas</h2>
            <p className="text-xs text-muted">
              Ranking y evolución por bandas top 10 · productos y servicios
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {KIND_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={kind === option.value ? "primary" : "secondary"}
              onPress={() => setKind(option.value)}
            >
              {option.label}
            </Button>
          ))}
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={period === option.value ? "primary" : "secondary"}
              onPress={() => setPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
          {METRIC_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={metric === option.value ? "primary" : "secondary"}
              onPress={() => setMetric(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-separator bg-surface-secondary/20 px-3 py-2.5">
        <div className="text-xs text-muted">
          Banda {data ? data.band + 1 : band + 1} · ranking {data?.rankStart ?? 1} a{" "}
          {data?.rankEnd ?? 10}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            isIconOnly
            isDisabled={loading || band <= 0}
            onPress={() => setBand((value) => Math.max(0, value - 1))}
          >
            <ArrowLeft width={16} height={16} />
          </Button>
          <Button
            variant="secondary"
            isIconOnly
            isDisabled={loading || Boolean(data && band >= data.totalBands - 1)}
            onPress={() => setBand((value) => value + 1)}
          >
            <ArrowRight width={16} height={16} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[320px] rounded-2xl" />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </div>
      ) : data && data.sales.products.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-separator bg-surface-secondary/10 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Evolución por {metric === "amount" ? "monto" : "cantidad"}
              </p>
              <p className="text-xs text-muted">{data.periodLabel}</p>
            </div>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={theme.separator} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme.muted, fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme.muted, fontSize: 11 }}
                    tickFormatter={(value) =>
                      metric === "amount"
                        ? new Intl.NumberFormat("es-CL", {
                            notation: "compact",
                            maximumFractionDigits: 1,
                          }).format(Number(value))
                        : String(value)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      background: theme.surface,
                      border: `1px solid ${theme.separator}`,
                      borderRadius: "12px",
                      fontSize: 13,
                      color: theme.foreground,
                    }}
                    formatter={(value, name) => [
                      metric === "amount" ? formatMoney(value) : value,
                      String(name),
                    ]}
                  />
                  <Legend />
                  {data.sales.products.map((item, index) => (
                    <Line
                      key={item.key}
                      type="monotone"
                      dataKey={item.key}
                      name={item.name}
                      stroke={lineColors[index % lineColors.length]}
                      strokeWidth={selectedKey === null || selectedKey === item.key ? 3 : 1.75}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-separator bg-surface">
            <div className="border-b border-separator px-4 py-3">
              <h3 className="text-sm font-semibold">Ranking visible</h3>
            </div>
            <div className="divide-y divide-separator">
              {data.sales.products.map((item, index) => {
                const selected = selectedKey === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedKey(item.key)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selected ? "bg-accent/8" : "hover:bg-surface-secondary/25"
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ background: lineColors[index % lineColors.length] }}
                    >
                      {item.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            item.kind === "service"
                              ? "bg-accent/15 text-accent"
                              : "bg-surface-secondary text-muted"
                          }`}
                        >
                          {item.kind === "service" ? "Serv." : "Prod."}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {qtyLabel(item)} · {formatMoney(item.totalAmt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {metric === "amount" ? formatMoney(item.totalAmt) : item.totalQty}
                      </p>
                      <p className="text-[11px] text-muted">
                        {metric === "amount" ? "monto" : "cantidad"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedItem ? (
            <div className="xl:col-span-2 rounded-2xl border border-separator bg-surface-secondary/20 p-3 text-sm">
              <p className="font-semibold">
                {selectedItem.name}{" "}
                <span className="text-xs font-medium text-muted">
                  · {selectedItem.kind === "service" ? "Servicio" : "Producto"}
                </span>
              </p>
              <p className="mt-1 text-muted">
                Rank #{selectedItem.rank} · Total {formatMoney(selectedItem.totalAmt)} ·{" "}
                {qtyLabel(selectedItem)}.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-separator bg-surface-secondary/15 p-6 text-sm text-muted">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
