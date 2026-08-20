"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import TriangleExclamation from "@gravity-ui/icons/TriangleExclamation";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import ArrowUp from "@gravity-ui/icons/ArrowUp";
import ArrowDown from "@gravity-ui/icons/ArrowDown";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import { appRoutes } from "@/shared/utils/app-routes";
import { branchChartLabel } from "@/shared/utils/branches";
import type { OwnerInsights } from "@/shared/utils/dashboard-owner-insights";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function DeltaBadge({
  changePct,
  label,
}: {
  changePct: number | null | undefined;
  label: string;
}) {
  if (changePct == null) {
    return (
      <span className="inline-flex flex-wrap items-center gap-0.5 text-[11px] font-medium text-accent">
        Nuevo
        <span className="font-normal text-muted">· {label}</span>
      </span>
    );
  }
  if (changePct === 0) {
    return (
      <span className="text-[11px] text-muted">Sin cambio · {label}</span>
    );
  }
  const up = changePct > 0;
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-0.5 text-[11px] font-semibold ${
        up ? "text-emerald-600 dark:text-emerald-400" : "text-danger"
      }`}
    >
      {up ? (
        <ArrowUp width={12} height={12} />
      ) : (
        <ArrowDown width={12} height={12} />
      )}
      {up ? "+" : ""}
      {changePct}%
      <span className="font-normal text-muted">· {label}</span>
    </span>
  );
}

function MiniStat({
  label,
  value,
  delta,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: ReactNode;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  const valueTone = {
    default: "text-foreground",
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-danger",
    warning: "text-warning",
  }[tone];

  return (
    <div className="rounded-xl border border-separator bg-surface-secondary/40 p-3">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${valueTone}`}>
        {value}
      </p>
      {delta ? <div className="mt-1">{delta}</div> : null}
    </div>
  );
}

type OwnerInsightsPanelProps = {
  insights: OwnerInsights;
  comparisonLabel: string;
  periodDescription: string;
  showBranchComparison: boolean;
};

export function OwnerInsightsPanel({
  insights,
  comparisonLabel,
  periodDescription,
  showBranchComparison,
}: OwnerInsightsPanelProps) {
  const {
    financial,
    byBranch,
    topProducts,
    topExpenseCategories,
    lowStockAlerts,
  } = insights;

  const pnlItems = [
    { label: "Ingresos", amount: financial.revenue, tone: "positive" as const },
    { label: "Gastos", amount: -financial.expenses, tone: "negative" as const },
    { label: "Compras", amount: -financial.purchases, tone: "negative" as const },
    { label: "Comisiones", amount: -financial.commissions, tone: "negative" as const },
  ];

  const branchChartData = byBranch.map((b) => ({
    name: branchChartLabel(b.branchName),
    fullName: b.branchName,
    revenue: b.revenue,
    net: b.net,
  }));

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <section className="rounded-2xl border border-accent/25 bg-accent/5 p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Resumen ejecutivo</h2>
            <p className="text-xs text-muted">
              Finanzas y operación · {periodDescription}
            </p>
          </div>
          <Link
            href={appRoutes.finance.hub}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          >
            Ver finanzas
            <ArrowRight width={12} height={12} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <MiniStat
            label="Ingreso neto"
            value={formatCurrency(financial.netIncome)}
            tone={financial.netIncome >= 0 ? "positive" : "negative"}
            delta={
              <DeltaBadge
                changePct={financial.comparison.netIncome.changePct}
                label={comparisonLabel}
              />
            }
          />
          <MiniStat
            label="Ingresos brutos"
            value={formatCurrency(financial.revenue)}
            delta={
              <DeltaBadge
                changePct={financial.comparison.revenue.changePct}
                label={comparisonLabel}
              />
            }
          />
          <MiniStat
            label="Gastos"
            value={formatCurrency(financial.expenses)}
            delta={
              <DeltaBadge
                changePct={financial.comparison.expenses.changePct}
                label={comparisonLabel}
              />
            }
          />
          <MiniStat
            label="Ticket promedio"
            value={formatCurrency(financial.averageTicket)}
            delta={
              <DeltaBadge
                changePct={financial.comparison.averageTicket.changePct}
                label={comparisonLabel}
              />
            }
          />
          <MiniStat
            label="Clientes activos"
            value={String(financial.activeCustomers)}
            tone="default"
          />
          <MiniStat
            label="Tasa cancelación"
            value={`${financial.cancellationRate}%`}
            tone={financial.cancellationRate > 15 ? "warning" : "default"}
          />
        </div>

        <div className="mt-4 rounded-xl border border-separator bg-surface p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Flujo del período
          </p>
          <div className="space-y-2">
            {pnlItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{item.label}</span>
                <span
                  className={`font-semibold tabular-nums ${
                    item.tone === "positive"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-danger"
                  }`}
                >
                  {item.amount >= 0 ? "" : "−"}
                  {formatCurrency(Math.abs(item.amount))}
                </span>
              </div>
            ))}
            <div className="border-t border-separator pt-2">
              <div className="flex items-center justify-between gap-3 text-sm font-bold">
                <span>Resultado neto</span>
                <span
                  className={`tabular-nums ${
                    financial.netIncome >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-danger"
                  }`}
                >
                  {formatCurrency(financial.netIncome)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted">
            <span>
              Servicios:{" "}
              <strong className="text-foreground">
                {formatCurrency(financial.servicesRevenue)}
              </strong>
            </span>
            <span>
              Productos:{" "}
              <strong className="text-foreground">
                {formatCurrency(financial.productsRevenue)}
              </strong>
            </span>
            <span>
              Compras:{" "}
              <strong className="text-foreground">
                {formatCurrency(financial.purchases)}
              </strong>
            </span>
            <span>
              Comisiones:{" "}
              <strong className="text-foreground">
                {formatCurrency(financial.commissions)}
              </strong>
            </span>
          </div>
        </div>
      </section>

      {showBranchComparison && byBranch.length > 1 ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-separator bg-surface p-4 md:p-5">
            <h2 className="text-base font-semibold">Ingresos por sucursal</h2>
            <p className="mb-4 text-xs text-muted">{periodDescription}</p>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={branchChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--separator)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("es-CL", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(Number(v))
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={96}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--separator)",
                      borderRadius: "12px",
                      fontSize: 13,
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), "Ingresos"]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullName ?? ""
                    }
                  />
                  <Bar
                    dataKey="revenue"
                    fill="var(--accent)"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-separator bg-surface">
            <div className="border-b border-separator px-4 py-3.5 md:px-5">
              <h2 className="text-base font-semibold">Comparativa por sucursal</h2>
              <p className="text-xs text-muted">{periodDescription}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-separator text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                    <th className="px-4 py-2.5 md:px-5">Sucursal</th>
                    <th className="px-2 py-2.5 text-right">Ingresos</th>
                    <th className="px-2 py-2.5 text-right">Neto</th>
                    <th className="px-2 py-2.5 text-right">Turnos</th>
                    <th className="px-2 py-2.5 text-right">Cierre</th>
                    <th className="px-4 py-2.5 text-right md:px-5">Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-separator">
                  {byBranch.map((branch, index) => (
                    <tr key={branch.branchId} className="hover:bg-surface-secondary/40">
                      <td className="px-4 py-2.5 md:px-5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                              index === 0
                                ? "bg-accent text-accent-foreground"
                                : "bg-surface-secondary text-muted"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="font-medium">{branch.branchName}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums font-medium">
                        {formatCurrency(branch.revenue)}
                      </td>
                      <td
                        className={`px-2 py-2.5 text-right tabular-nums font-medium ${
                          branch.net >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-danger"
                        }`}
                      >
                        {formatCurrency(branch.net)}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted">
                        {branch.appointments}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">
                        {branch.completionRate}%
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums md:px-5">
                        {branch.sharePct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-1">
        <div className="min-w-0 rounded-2xl border border-separator bg-surface p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2">
            <ChartColumn width={18} height={18} className="text-accent" />
            <div>
              <h2 className="text-base font-semibold">Top productos</h2>
              <p className="text-xs text-muted">Ventas en turnos</p>
            </div>
          </div>
          {topProducts.length > 0 ? (
            <ul className="divide-y divide-separator">
              {topProducts.map((product, index) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-xs font-bold text-muted">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-[11px] text-muted">
                      {product.units} {product.units === 1 ? "unidad" : "unidades"}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCurrency(product.revenue)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-xs text-muted">
              Sin productos vendidos en el período
            </p>
          )}
        </div>
      </section>

      {(topExpenseCategories.length > 0 || lowStockAlerts.length > 0) && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {topExpenseCategories.length > 0 ? (
            <div className="min-w-0 rounded-2xl border border-separator bg-surface p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">Gastos por categoría</h2>
                  <p className="text-xs text-muted">Principales egresos</p>
                </div>
                <Link
                  href={appRoutes.finance.expenses}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Ver gastos
                </Link>
              </div>
              <ul className="divide-y divide-separator">
                {topExpenseCategories.map((cat) => (
                  <li
                    key={cat.categoryId}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{cat.name}</p>
                      <p className="text-[11px] text-muted">
                        {cat.count} {cat.count === 1 ? "registro" : "registros"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-danger">
                      {formatCurrency(cat.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {lowStockAlerts.length > 0 ? (
            <div className="min-w-0 rounded-2xl border border-warning/30 bg-warning/5 p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TriangleExclamation width={18} height={18} className="text-warning" />
                  <div>
                    <h2 className="text-base font-semibold">Alertas de inventario</h2>
                    <p className="text-xs text-muted">Stock en o bajo mínimo</p>
                  </div>
                </div>
                <Link
                  href={appRoutes.inventory.products}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Ver inventario
                </Link>
              </div>
              <ul className="divide-y divide-separator/60">
                {lowStockAlerts.map((alert) => (
                  <li
                    key={`${alert.branchId}-${alert.productId}`}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{alert.productName}</p>
                      <p className="text-[11px] text-muted">{alert.branchName}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-warning/15 px-2 py-1 text-xs font-bold tabular-nums text-warning">
                      {alert.stock}/{alert.minStock}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
