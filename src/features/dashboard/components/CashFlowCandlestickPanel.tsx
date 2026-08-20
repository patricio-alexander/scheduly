"use client";

import { Button } from "@heroui/react";
import ArrowLeft from "@gravity-ui/icons/ArrowLeft";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
} from "lightweight-charts";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import {
  chartSafePalette,
  lightweightChartsColorParser,
} from "@/shared/utils/chart-colors";
import { Skeleton } from "@/shared/components/ui";
import type { CashFlowCandle, CashGranularity } from "./cashFlowLinkUtils";

type CandlesResponse = {
  granularity: CashGranularity;
  openingBalance: number;
  currentBalance: number;
  totalCandles: number;
  hasMore: boolean;
  limit: number;
  offset: number;
  candles: CashFlowCandle[];
};

type CashFlowCandlestickPanelProps = {
  branchId?: number | null;
  onCandleSelect?: (candle: CashFlowCandle, granularity: CashGranularity) => void;
  compact?: boolean;
};

const GRANULARITY_OPTIONS: Array<{ value: CashGranularity; label: string }> = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

function keyFromChartTime(time: unknown) {
  if (typeof time === "string") return time;
  if (time && typeof time === "object") {
    const maybeBusinessDay = time as {
      year?: number;
      month?: number;
      day?: number;
    };
    if (
      typeof maybeBusinessDay.year === "number" &&
      typeof maybeBusinessDay.month === "number" &&
      typeof maybeBusinessDay.day === "number"
    ) {
      return `${maybeBusinessDay.year}-${String(maybeBusinessDay.month).padStart(2, "0")}-${String(
        maybeBusinessDay.day,
      ).padStart(2, "0")}`;
    }
  }
  return null;
}

export function CashFlowCandlestickPanel({
  branchId = null,
  onCandleSelect,
  compact = false,
}: CashFlowCandlestickPanelProps) {
  const { resolvedTheme } = useTheme();
  const [granularity, setGranularity] = useState<CashGranularity>("week");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<CandlesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOffset(0);
  }, [granularity, branchId]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      granularity,
      limit: "18",
      offset: String(offset),
    });
    if (typeof branchId === "number") {
      params.set("branchId", String(branchId));
    }

    setLoading(true);
    setError(null);

    fetch(apiUrl(`/api/finance/cash-flow-candles?${params.toString()}`), {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message || "No se pudo cargar el flujo en velas");
        }
        return (await response.json()) as CandlesResponse;
      })
      .then((payload) => {
        setData(payload);
        setSelectedKey((current) =>
          current && payload.candles.some((candle) => candle.key === current)
            ? current
            : payload.candles[payload.candles.length - 1]?.key ?? null,
        );
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Error al cargar las velas");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [granularity, offset, branchId]);

  useEffect(() => {
    if (!chartRef.current || !data || data.candles.length === 0) return;

    const container = chartRef.current;
    // Solo hex clásico: Chromium puede devolver lab() desde CSS y LWC no lo parsea.
    const theme = chartSafePalette(resolvedTheme === "dark");

    const chartHeight = compact ? 220 : 340;

    const chart = createChart(container, {
      autoSize: true,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: theme.surface },
        textColor: theme.muted,
        attributionLogo: false,
        // Chromium serializa a lab(); sin esto LWC lanza Failed to parse color.
        colorParsers: [lightweightChartsColorParser],
      },
      grid: {
        vertLines: { color: theme.separator },
        horzLines: { color: theme.separator },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: theme.separator,
      },
      timeScale: {
        borderColor: theme.separator,
        timeVisible: granularity === "day",
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: theme.success,
      downColor: theme.danger,
      borderVisible: false,
      wickUpColor: theme.success,
      wickDownColor: theme.danger,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const chartData = data.candles.map((candle) => ({
      time: candle.time as string,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    (series as { setData: (value: typeof chartData) => void }).setData(chartData);

    const handleClick = (param: unknown) => {
      const typed = param as { time?: unknown };
      const key = keyFromChartTime(typed.time);
      if (!key) return;
      const candle = data.candles.find((item) => item.key === key || item.time === key);
      if (!candle) return;
      setSelectedKey(candle.key);
      onCandleSelect?.(candle, granularity);
    };

    chart.subscribeClick(handleClick);
    chart.timeScale().fitContent();

    return () => {
      chart.unsubscribeClick(handleClick);
      chart.remove();
    };
  }, [data, granularity, onCandleSelect, resolvedTheme, compact]);

  return (
    <section
      className={`rounded-2xl border border-separator bg-surface ${
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
            <h2 className={`font-semibold ${compact ? "text-sm" : "text-base"}`}>Velas de caja</h2>
            <p className="text-xs text-muted">
              {compact ? "Clic en una vela → flujo semanal" : "Saldo de apertura, picos y cierre por tramo"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {GRANULARITY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={granularity === option.value ? "primary" : "secondary"}
              size="sm"
              onPress={() => setGranularity(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {data ? (
        <div
          className={`mb-3 flex flex-wrap gap-1.5 text-[11px] ${compact ? "" : "mb-4 gap-3 md:grid md:grid-cols-3 md:gap-3"}`}
        >
          {compact ? (
            <>
              <span className="rounded-full border border-separator px-2 py-1 tabular-nums text-muted">
                Apertura {formatMoney(data.openingBalance)}
              </span>
              <span className="rounded-full border border-separator px-2 py-1 font-semibold tabular-nums text-accent">
                Actual {formatMoney(data.currentBalance)}
              </span>
              <span className="rounded-full border border-separator px-2 py-1 tabular-nums text-muted">
                {data.candles.length} velas
              </span>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-separator bg-surface-secondary/30 p-3">
                <p className="text-xs text-muted">Saldo apertura ventana</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{formatMoney(data.openingBalance)}</p>
              </div>
              <div className="rounded-2xl border border-separator bg-surface-secondary/30 p-3">
                <p className="text-xs text-muted">Saldo actual</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-accent">
                  {formatMoney(data.currentBalance)}
                </p>
              </div>
              <div className="rounded-2xl border border-separator bg-surface-secondary/30 p-3">
                <p className="text-xs text-muted">Velas en vista</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{data.candles.length}</p>
              </div>
            </>
          )}
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {!compact ? (
          <div className="text-xs text-muted">
            Clic en una vela para ver su semana en el flujo de la izquierda.
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            isIconOnly
            isDisabled={loading || !data?.hasMore}
            onPress={() => setOffset((value) => value + (data?.limit ?? 18))}
          >
            <ArrowLeft width={16} height={16} />
          </Button>
          <Button
            variant="secondary"
            isIconOnly
            isDisabled={loading || offset === 0}
            onPress={() => setOffset((value) => Math.max(0, value - (data?.limit ?? 18)))}
          >
            <ArrowRight width={16} height={16} />
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className={`rounded-2xl ${compact ? "h-[220px]" : "h-[340px]"}`} />
      ) : error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </div>
      ) : data && data.candles.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-separator bg-surface-secondary/10 p-2">
          <div ref={chartRef} className="w-full" />
        </div>
      ) : (
        <div className="rounded-2xl border border-separator bg-surface-secondary/20 p-6 text-sm text-muted">
          Todavia no hay movimientos para dibujar velas.
        </div>
      )}
    </section>
  );
}
