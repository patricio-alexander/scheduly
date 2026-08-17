"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import { PageHeader } from "@/shared/components/ui";
import { BranchSelector, useBranches } from "@/src/features/branches";
import { useAuth } from "@/src/features/auth";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import {
  dashboardPeriodLabel,
  dashboardPeriodOptions,
  getDashboardPeriodDescription,
  type DashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { formatMoney } from "@/shared/utils/money";
import { isOwnerRole } from "@/shared/utils/roles";
import { RevenueOriginPieChart, FinanceKpiGrid } from "@/src/features/finance";
import { useDashboardSocket } from "@/src/features/dashboard";

type RevenueLine = {
  amount: number;
  count?: number;
  sharePct: number;
  servicesAmount?: number;
  productsAmount?: number;
};

type FinanceSummary = {
  revenue: number;
  expenses: number;
  purchases: number;
  commissions: number;
  netIncome: number;
  revenueBreakdown: {
    appointmentPayments: RevenueLine;
    directProductSales: RevenueLine;
    servicesOnAppointments: RevenueLine;
    productsOnAppointments: RevenueLine;
  };
  revenueByMethod: Array<{
    method: string;
    label: string;
    amount: number;
    sharePct: number;
  }>;
  byBranch: Array<{
    branchId: number;
    branchName: string;
    revenue: number;
    appointmentRevenue: number;
    directProductSales: number;
    expenses: number;
    commissions: number;
    purchases: number;
    net: number;
    appointments: number;
  }>;
};

function BreakdownRow({
  label,
  detail,
  amount,
  sharePct,
  tone = "text-foreground",
}: {
  label: string;
  detail?: string;
  amount: number;
  sharePct: number;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        {detail ? <p className="text-xs text-muted">{detail}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-4 sm:text-right">
        <span className="text-xs tabular-nums text-muted">{sharePct}%</span>
        <span className={`min-w-[6rem] font-semibold tabular-nums ${tone}`}>
          {formatMoney(amount)}
        </span>
      </div>
    </div>
  );
}

export default function FinanceCenterPage() {
  const { user } = useAuth();
  const { branches } = useBranches();
  const owner = user ? isOwnerRole(user.role) : false;
  const lockedBranch = user?.branch ?? null;
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [branchId, setBranchId] = useState<number | "all">("all");
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const effectiveBranchId =
    owner || !lockedBranch
      ? branchId
      : lockedBranch.id;

  useEffect(() => {
    if (!owner && lockedBranch) {
      setBranchId(lockedBranch.id);
    }
  }, [owner, lockedBranch]);

  const loadSummary = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const url = new URL(apiUrl("/api/finance/summary"), window.location.origin);
        url.searchParams.set("period", period);
        if (effectiveBranchId !== "all") {
          url.searchParams.set("branchId", String(effectiveBranchId));
        }
        const res = await fetch(url.toString(), { credentials: "include" });
        if (res.ok) setData(await res.json());
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [period, effectiveBranchId],
  );

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useDashboardSocket({
    enabled: Boolean(user),
    onInvalidate: () => {
      void loadSummary({ silent: true });
    },
  });

  if (!user) return null;

  const branchScoped = !owner && lockedBranch;
  const periodLabel = getDashboardPeriodDescription(period);
  const breakdown = data?.revenueBreakdown;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        icon={<ChartColumn width={24} height={24} />}
        title="Centro financiero"
        description={
          branchScoped
            ? `Resumen de ${lockedBranch.name} · ingresos, egresos y resultado del período`
            : "Ingresos, egresos y resultado del negocio en el período"
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {owner ? (
          <BranchSelector branches={branches} value={branchId} onChange={setBranchId} />
        ) : (
          <p className="rounded-xl border border-separator bg-surface-secondary/40 px-3 py-2.5 text-sm">
            Sucursal: <span className="font-medium">{lockedBranch?.name ?? "—"}</span>
          </p>
        )}
        <div className="inline-flex rounded-xl border border-separator p-1">
          {dashboardPeriodOptions.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                period === p ? "bg-accent text-accent-foreground" : "text-muted"
              }`}
            >
              {dashboardPeriodLabel[p]}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <>
          <p className="text-sm text-muted">{periodLabel}</p>
          <FinanceKpiGrid
            revenue={0}
            expenses={0}
            purchases={0}
            commissions={0}
            netIncome={0}
            periodLabel={periodLabel}
            loading
          />
        </>
      ) : (
        <>
          <p className="text-sm text-muted">{periodLabel}</p>
          <FinanceKpiGrid
            revenue={data.revenue}
            expenses={data.expenses}
            purchases={data.purchases}
            commissions={data.commissions}
            netIncome={data.netIncome}
            periodLabel={periodLabel}
          />

          {breakdown ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-separator bg-surface p-4 sm:p-6">
                <h2 className="mb-1 text-base font-semibold">Origen de ingresos</h2>
                <p className="mb-4 text-sm text-muted">
                  Desglose de todo el dinero que entró en el período.
                </p>
                <RevenueOriginPieChart breakdown={breakdown} totalRevenue={data.revenue} />
              </section>

              <section className="rounded-2xl border border-separator bg-surface p-4 sm:p-6">
                <h2 className="mb-1 text-base font-semibold">Ingresos por método de pago</h2>
                <p className="mb-4 text-sm text-muted">
                  Turnos cobrados y ventas directas combinados.
                </p>
                {data.revenueByMethod.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">Sin ingresos en este período.</p>
                ) : (
                  <div className="divide-y divide-separator">
                    {data.revenueByMethod.map((row) => (
                      <BreakdownRow
                        key={row.method}
                        label={row.label}
                        amount={row.amount}
                        sharePct={row.sharePct}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}

          <section className="rounded-2xl border border-separator bg-surface p-4">
            <h2 className="mb-4 text-base font-semibold">
              {branchScoped ? "Resumen de la sucursal" : "Comparativa por sucursal"}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-separator text-left text-muted">
                    <th className="py-2 pr-4">Sucursal</th>
                    <th className="py-2 pr-4">Turnos</th>
                    <th className="py-2 pr-4">Turnos cobrados</th>
                    <th className="py-2 pr-4">Ventas directas</th>
                    <th className="py-2 pr-4">Ingresos</th>
                    <th className="py-2 pr-4">Gastos</th>
                    <th className="py-2 pr-4">Comisiones</th>
                    <th className="py-2">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byBranch.map((row) => (
                    <tr key={row.branchId} className="border-b border-separator/60">
                      <td className="py-2.5 font-medium">{row.branchName}</td>
                      <td className="py-2.5 tabular-nums">{row.appointments}</td>
                      <td className="py-2.5 tabular-nums">
                        {formatMoney(row.appointmentRevenue)}
                      </td>
                      <td className="py-2.5 tabular-nums">
                        {formatMoney(row.directProductSales)}
                      </td>
                      <td className="py-2.5 tabular-nums">{formatMoney(row.revenue)}</td>
                      <td className="py-2.5 tabular-nums">{formatMoney(row.expenses)}</td>
                      <td className="py-2.5 tabular-nums">{formatMoney(row.commissions)}</td>
                      <td className="py-2.5 font-semibold tabular-nums">
                        {formatMoney(row.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href={appRoutes.finance.payroll}
          className="inline-flex rounded-xl border border-separator px-4 py-2 text-sm font-medium hover:bg-surface-secondary"
        >
          Ver sueldos
        </Link>
        <Link
          href={appRoutes.sales.history}
          className="inline-flex rounded-xl border border-separator px-4 py-2 text-sm font-medium hover:bg-surface-secondary"
        >
          Ingresos por turnos
        </Link>
        <Link
          href={appRoutes.sales.productSales}
          className="inline-flex rounded-xl border border-separator px-4 py-2 text-sm font-medium hover:bg-surface-secondary"
        >
          Productos vendidos
        </Link>
        <Link
          href={appRoutes.finance.expenses}
          className="inline-flex rounded-xl border border-separator px-4 py-2 text-sm font-medium hover:bg-surface-secondary"
        >
          Registrar gastos
        </Link>
      </div>
    </div>
  );
}
