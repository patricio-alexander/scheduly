"use client";

import { useState } from "react";
import { YearFinanceOverviewChart } from "./YearFinanceOverviewChart";
import { MonthCalendarChart } from "./MonthCalendarChart";
import { CashFlowCandlestickPanel } from "./CashFlowCandlestickPanel";
import { CashFlowMirrorPanel } from "./CashFlowMirrorPanel";
import { ProductSeriesPanel } from "./ProductSeriesPanel";
import { CustomersSalesTable } from "./CustomersSalesTable";
import { PaymentMethodsCard } from "./PaymentMethodsCard";
import {
  AppointmentStatusPieCard,
  type StatusChartEntry,
} from "./AppointmentStatusPieCard";
import type { DashboardPaymentBreakdownItem } from "@/shared/utils/dashboard-widgets";
import {
  resolveMirrorFromCandle,
  type CashFlowCandle,
  type CashFlowMirrorFocus,
  type CashGranularity,
} from "./cashFlowLinkUtils";

type DashboardFinanceChartsProps = {
  branchId?: number | "all" | null;
  paymentBreakdown?: DashboardPaymentBreakdownItem[];
  periodDescription?: string;
  statusChartData?: StatusChartEntry[];
  totalStatus?: number;
  activeStatusKey?: string | null;
  onActiveStatusKeyChange?: (key: string | null) => void;
  activeStatusEntry?: StatusChartEntry | null;
  activeStatusPct?: number;
  unitLabel?: string;
};

export function DashboardFinanceCharts({
  branchId = null,
  paymentBreakdown = [],
  periodDescription,
  statusChartData = [],
  totalStatus = 0,
  activeStatusKey = null,
  onActiveStatusKeyChange,
  activeStatusEntry = null,
  activeStatusPct = 0,
  unitLabel = "turnos",
}: DashboardFinanceChartsProps) {
  const normalizedBranchId = typeof branchId === "number" ? branchId : null;
  const [navigateToMonth, setNavigateToMonth] = useState<{
    date: Date;
    requestId: string;
  } | null>(null);
  const [mirrorFocus, setMirrorFocus] = useState<CashFlowMirrorFocus | null>(null);

  const handleMonthSelect = (date: Date) => {
    setNavigateToMonth({
      date,
      requestId: `${date.toISOString()}-${Date.now()}`,
    });
  };

  const handleCandleSelect = (candle: CashFlowCandle, granularity: CashGranularity) => {
    setMirrorFocus(resolveMirrorFromCandle(granularity, candle));
  };

  const handleClearMirrorFocus = () => {
    setMirrorFocus(null);
  };

  const handleMirrorBucketClick = (key: string) => {
    const parts = key.split("-").map(Number);
    if (parts.length >= 2 && parts.every((value) => Number.isFinite(value))) {
      const [year, month, day] = parts;
      const date = new Date(year, month - 1, day ?? 1, 12, 0, 0, 0);
      handleMonthSelect(date);
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Cols 1–2 anual (4×3) · Col 3 métodos · Col 4 turnos */}
      <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-4">
        <div className="min-w-0 xl:col-span-2">
          <YearFinanceOverviewChart
            branchId={normalizedBranchId}
            onMonthSelect={handleMonthSelect}
            compact
          />
        </div>
        <div className="min-w-0">
          <PaymentMethodsCard
            breakdown={paymentBreakdown}
            periodDescription={periodDescription}
          />
        </div>
        <div className="min-w-0">
          <AppointmentStatusPieCard
            statusChartData={statusChartData}
            totalStatus={totalStatus}
            activeStatusKey={activeStatusKey}
            onActiveStatusKeyChange={onActiveStatusKeyChange ?? (() => undefined)}
            activeStatusEntry={activeStatusEntry}
            activeStatusPct={activeStatusPct}
            periodDescription={periodDescription}
            unitLabel={unitLabel}
          />
        </div>
      </section>

      {/* Flujo semanal (1) + velas compactas (2–3) */}
      <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-1">
          <CashFlowMirrorPanel
            branchId={normalizedBranchId}
            focus={mirrorFocus}
            onClearFocus={handleClearMirrorFocus}
            onBucketClick={handleMirrorBucketClick}
          />
        </div>
        <div className="min-w-0 xl:col-span-2">
          <CashFlowCandlestickPanel
            branchId={normalizedBranchId}
            onCandleSelect={handleCandleSelect}
            compact
          />
        </div>
      </section>

      <MonthCalendarChart
        branchId={normalizedBranchId}
        navigateToMonth={navigateToMonth}
      />

      <ProductSeriesPanel branchId={normalizedBranchId} />
      <CustomersSalesTable branchId={normalizedBranchId} />
    </div>
  );
}
