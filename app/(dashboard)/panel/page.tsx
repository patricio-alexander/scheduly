"use client";

import { apiUrl } from "@/shared/utils/api";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Modal, useOverlayState } from "@heroui/react";
import { StatusChip } from "@/shared/components/StatusChip";
import {
  getStatusTone,
  statusChartColor,
  statusLabel,
} from "@/shared/utils/appointment-status";
import { BranchSelector, useBranches } from "@/src/features/branches";
import { useAuth } from "@/src/features/auth";
import { canViewRevenue, isOwnerRole, isPureEmployeeRole } from "@/shared/utils/roles";
import { branchDisplayLabel } from "@/shared/utils/auth-user";
import { appRoutes } from "@/shared/utils/app-routes";
import { useDashboardSocket, OwnerInsightsPanel } from "@/src/features/dashboard";
import type { OwnerInsights } from "@/shared/utils/dashboard-owner-insights";
import Person from "@gravity-ui/icons/Person";
import Gear from "@gravity-ui/icons/Gear";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import Check from "@gravity-ui/icons/Check";
import Calendar from "@gravity-ui/icons/Calendar";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import Plus from "@gravity-ui/icons/Plus";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import ArrowUp from "@gravity-ui/icons/ArrowUp";
import ArrowDown from "@gravity-ui/icons/ArrowDown";
import Receipt from "@gravity-ui/icons/Receipt";
import CrownDiamond from "@gravity-ui/icons/CrownDiamond";
import Eye from "@gravity-ui/icons/Eye";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "@/shared/components/ui";
import { StatCard } from "@/shared/components/StatCard";
import {
  dashboardPeriodLabel,
  dashboardPeriodOptions,
  getDashboardComparisonLabel,
  getDashboardPeriodDescription,
  type DashboardPeriod,
} from "@/shared/utils/dashboard-period";

interface ComparisonMetric {
  previous: number;
  changePct: number | null;
}

interface TopMarginService {
  id: number;
  name: string;
  revenue: number;
  count: number;
  sharePct: number;
}

interface DashboardData {
  period: DashboardPeriod;
  totalCustomers: number;
  totalServices: number;
  totalAppointments: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  rescheduled: number;
  pending_payment: number;
  paid_pending: number;
  pendingPaymentAmount: number;
  revenue: number;
  completionRate: number;
  appointmentsByDay: { date: string; count: number }[];
  revenueByDay: { date: string; amount: number }[];
  topMarginService: TopMarginService | null;
  topMarginServices: TopMarginService[];
  recentAppointments: Array<{
    id: number;
    title: string;
    customer: string;
    date: string;
    status: string;
  }>;
  comparison: {
    revenue: ComparisonMetric;
    appointments: ComparisonMetric;
    completionRate: ComparisonMetric;
  };
  ownerInsights?: OwnerInsights | null;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function getActivityBarSizing(pointCount: number, period: DashboardPeriod) {
  if (period === "today" || pointCount > 20) {
    return { barCategoryGap: "8%", maxBarSize: 32, radius: 6 };
  }
  if (period === "week" || pointCount > 10) {
    return { barCategoryGap: "6%", maxBarSize: 28, radius: 6 };
  }
  return { barCategoryGap: "4%", maxBarSize: 36, radius: 6 };
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  const isToday = new Date().toDateString() === date.toDateString();
  return {
    date: isToday
      ? "Hoy"
      : date.toLocaleDateString("es-CL", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
    time: date.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
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
        up
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-danger"
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

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-5 lg:gap-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl md:h-28" />
        ))}
      </div>
      <Skeleton className="h-52 rounded-2xl md:h-56" />
      <Skeleton className="h-52 rounded-2xl md:h-56" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function QuickActions({ showSales = true }: { showSales?: boolean }) {
  const actions = showSales
    ? quickActions
    : quickActions.filter((a) => a.href !== appRoutes.sales.history);

  return (
    <div
      className={`grid grid-cols-2 gap-2 ${showSales ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}
      data-onboarding="dash-actions"
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="group flex min-w-0 items-center gap-2.5 rounded-2xl border border-separator bg-surface px-3 py-3 transition-colors hover:border-accent/40 hover:bg-accent/5 md:gap-3 md:px-3.5"
          >
            <span className="shrink-0 rounded-xl bg-accent/10 p-2 text-accent transition-colors group-hover:bg-accent/15">
              <Icon width={16} height={16} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {action.label}
              </span>
              <span className="block truncate text-[11px] text-muted">
                {action.hint}
              </span>
            </span>
            <ArrowRight
              width={14}
              height={14}
              className="ml-auto hidden shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100 md:block"
            />
          </Link>
        );
      })}
    </div>
  );
}

function PeriodFilter({
  value,
  onChange,
}: {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
}) {
  return (
    <div className="inline-flex w-full max-w-full overflow-x-auto rounded-xl border border-separator bg-surface p-1 sm:w-auto">
      {dashboardPeriodOptions.map((periodOption) => {
        const selected = value === periodOption;
        return (
          <button
            key={periodOption}
            type="button"
            onClick={() => onChange(periodOption)}
            className={`flex-1 shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none sm:px-3.5 ${
              selected
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {dashboardPeriodLabel[periodOption]}
          </button>
        );
      })}
    </div>
  );
}

const quickActions = [
  {
    href: appRoutes.operation.agenda,
    label: "Nuevo turno",
    hint: "Agenda",
    icon: Plus,
  },
  {
    href: appRoutes.sales.customers,
    label: "Clientes",
    hint: "Cartera",
    icon: Person,
  },
  {
    href: appRoutes.inventory.products,
    label: "Inventario",
    hint: "Stock",
    icon: Boxes3,
  },
  {
    href: appRoutes.sales.history,
    label: "Ingresos",
    hint: "Servicios y productos",
    icon: Receipt,
  },
] as const;

type StatusChartEntry = {
  key: string;
  name: string;
  value: number;
  color: string;
};

function StatusDistributionCard({
  periodDescription,
  statusChartData,
  totalStatus,
  activeStatusKey,
  onActiveStatusKeyChange,
  activeStatusEntry,
  activeStatusPct,
}: {
  periodDescription: string;
  statusChartData: StatusChartEntry[];
  totalStatus: number;
  activeStatusKey: string | null;
  onActiveStatusKeyChange: (key: string | null) => void;
  activeStatusEntry: StatusChartEntry | null;
  activeStatusPct: number;
}) {
  return (
    <div
      className="flex min-w-0 flex-col self-start rounded-2xl border border-separator bg-surface p-4 md:p-5"
      data-onboarding="dash-status"
    >
      <div className="mb-4 min-w-0">
        <h2 className="text-base font-semibold">Distribución por estado</h2>
        <p className="text-xs text-muted">{periodDescription}</p>
      </div>
      {statusChartData.length > 0 ? (
        <div className="flex flex-col items-center gap-5 xl:flex-row xl:items-center">
          <div className="relative h-40 w-40 shrink-0 md:h-44 md:w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  onMouseEnter={(_, index) =>
                    onActiveStatusKeyChange(statusChartData[index]?.key ?? null)
                  }
                  onMouseLeave={() => onActiveStatusKeyChange(null)}
                >
                  {statusChartData.map((entry) => {
                    const dimmed =
                      activeStatusKey != null && activeStatusKey !== entry.key;
                    const active = activeStatusKey === entry.key;
                    return (
                      <Cell
                        key={entry.key}
                        fill={entry.color}
                        fillOpacity={dimmed ? 0.35 : 1}
                        stroke={active ? "var(--surface)" : "none"}
                        strokeWidth={active ? 3 : 0}
                        style={{
                          outline: "none",
                          cursor: "pointer",
                          transition: "fill-opacity 150ms ease",
                        }}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
              {activeStatusEntry ? (
                <>
                  <span className="text-3xl font-bold tabular-nums leading-none">
                    {activeStatusPct}%
                  </span>
                  <span className="mt-1 max-w-[5.5rem] truncate text-[10px] font-medium text-muted">
                    {activeStatusEntry.name}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted">
                    {activeStatusEntry.value} turnos
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold tabular-nums leading-none">
                    {totalStatus}
                  </span>
                  <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                    turnos
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {statusChartData.map((entry) => {
              const pct =
                totalStatus > 0
                  ? Math.round((entry.value / totalStatus) * 100)
                  : 0;
              const active = activeStatusKey === entry.key;
              const dimmed = activeStatusKey != null && !active;
              return (
                <div
                  key={entry.key}
                  onMouseEnter={() => onActiveStatusKeyChange(entry.key)}
                  onMouseLeave={() => onActiveStatusKeyChange(null)}
                  className={`flex min-w-0 cursor-default items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-colors ${
                    active
                      ? "bg-surface-secondary ring-1 ring-separator"
                      : dimmed
                        ? "bg-surface-secondary/40 opacity-55"
                        : "bg-surface-secondary/70 hover:bg-surface-secondary"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: entry.color }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {entry.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">{pct}%</span>
                  <span className="shrink-0 font-bold tabular-nums">
                    {entry.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Gear width={28} height={28} className="mb-2 text-muted opacity-40" />
          <p className="text-xs text-muted">Sin datos de turnos aún</p>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { branches } = useBranches();
  const [period, setPeriod] = useState<DashboardPeriod>("week");
  const [branchFilter, setBranchFilter] = useState<number | "all">("all");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeStatusKey, setActiveStatusKey] = useState<string | null>(null);
  const marginDetailModal = useOverlayState();

  const showRevenue = canViewRevenue(user?.role);
  const isOwner = isOwnerRole(user?.role);
  const isEmployee = isPureEmployeeRole(user?.role);
  const userBranchLabel = branchDisplayLabel(user?.branch, user?.role);

  const loadDashboard = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user) return;
      const silent = opts?.silent === true;
      if (!silent) {
        setLoading(true);
        setLoadError(false);
      }
      try {
        const branchQuery =
          branchFilter === "all" ? "" : `&branchId=${branchFilter}`;
        const res = await fetch(
          apiUrl(`/api/dashboard?userId=${user.id}&period=${period}${branchQuery}`),
          { credentials: "include" },
        );
        if (!res.ok) {
          if (!silent) {
            setData(null);
            setLoadError(true);
          }
          return;
        }
        const json: unknown = await res.json();
        if (json && typeof json === "object") {
          setData(json as DashboardData);
          if (!silent) setLoadError(false);
        } else if (!silent) {
          setData(null);
          setLoadError(true);
        }
      } catch {
        if (!silent) {
          setData(null);
          setLoadError(true);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user, period, branchFilter],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useDashboardSocket({
    enabled: Boolean(user),
    onInvalidate: () => {
      void loadDashboard({ silent: true });
    },
  });

  if (!user) return null;

  const todayLabel = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const totalStatus =
    (data?.scheduled ?? 0) +
    (data?.completed ?? 0) +
    (data?.cancelled ?? 0) +
    (data?.rescheduled ?? 0) +
    (data?.pending_payment ?? 0) +
    (data?.paid_pending ?? 0);

  const completionRate = data?.completionRate ?? 0;

  const statusChartData = data
    ? [
        {
          key: "scheduled",
          name: statusLabel.scheduled,
          value: data.scheduled,
          color: statusChartColor.scheduled,
        },
        {
          key: "paid_pending",
          name: statusLabel.paid_pending,
          value: data.paid_pending,
          color: statusChartColor.paid_pending,
        },
        {
          key: "pending_payment",
          name: statusLabel.pending_payment,
          value: data.pending_payment,
          color: statusChartColor.pending_payment,
        },
        {
          key: "completed",
          name: statusLabel.completed,
          value: data.completed,
          color: statusChartColor.completed,
        },
        {
          key: "cancelled",
          name: statusLabel.cancelled,
          value: data.cancelled,
          color: statusChartColor.cancelled,
        },
        {
          key: "rescheduled",
          name: statusLabel.rescheduled,
          value: data.rescheduled,
          color: statusChartColor.rescheduled,
        },
      ].filter((item) => item.value > 0)
    : [];

  const periodDescription = getDashboardPeriodDescription(period);
  const comparisonLabel = getDashboardComparisonLabel(period);
  const chartTotal =
    data?.appointmentsByDay?.reduce((sum, d) => sum + d.count, 0) ?? 0;
  const revenueChartTotal =
    data?.revenueByDay?.reduce((sum, d) => sum + d.amount, 0) ?? 0;
  const activityBarCount = data?.appointmentsByDay?.length ?? 0;
  const activityBarSizing = getActivityBarSizing(activityBarCount, period);
  const activeStatusEntry = activeStatusKey
    ? statusChartData.find((e) => e.key === activeStatusKey) ?? null
    : null;
  const activeStatusPct =
    activeStatusEntry && totalStatus > 0
      ? Math.round((activeStatusEntry.value / totalStatus) * 100)
      : 0;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4 overflow-x-hidden pb-2 md:gap-5 lg:gap-6">
      <section className="relative overflow-hidden rounded-2xl border border-separator bg-surface">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 0% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 55%)",
          }}
        />
        <div className="relative flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between md:p-5 lg:p-6">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-accent">
              {todayLabel}
            </p>
            <h1 className="mt-1 truncate text-2xl font-bold tracking-tight lg:text-3xl">
              {getGreeting()}, {user.name.split(" ")[0]}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              {isOwner
                ? "Panel ejecutivo · "
                : isEmployee
                  ? "Tus turnos · "
                  : "Tu sucursal · "}
              {periodDescription.toLowerCase()}
              {userBranchLabel ? (
                <>
                  {" "}
                  · <span className="font-medium text-foreground">{userBranchLabel}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="w-full shrink-0 md:w-auto flex flex-col gap-2 sm:flex-row sm:items-center">
            {isOwnerRole(user?.role) ? (
              <BranchSelector
                branches={branches}
                value={branchFilter}
                onChange={setBranchFilter}
              />
            ) : null}
            <div data-onboarding="dash-period">
              <PeriodFilter value={period} onChange={setPeriod} />
            </div>
          </div>
        </div>
      </section>

      <QuickActions showSales={showRevenue} />

      {loadError && (
        <div className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            No se pudo cargar el resumen. Intenta de nuevo.
          </p>
          <Button size="sm" variant="secondary" onPress={() => void loadDashboard()}>
            Reintentar
          </Button>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div
            className={`grid grid-cols-2 gap-3 ${
              showRevenue ? "xl:grid-cols-3 2xl:grid-cols-5" : "xl:grid-cols-3"
            }`}
            data-onboarding="dash-kpis"
          >
            {showRevenue ? (
              <StatCard
                label="Ingresos"
                value={formatCurrency(data?.revenue ?? 0)}
                icon={<ChartColumn width={20} height={20} />}
                delta={
                  <DeltaBadge
                    changePct={data?.comparison?.revenue?.changePct}
                    label={comparisonLabel}
                  />
                }
                subtitle={
                  (data?.pending_payment ?? 0) > 0
                    ? `${formatCurrency(data?.pendingPaymentAmount ?? 0)} por cobrar`
                    : "Turnos completados"
                }
              />
            ) : null}
            {showRevenue ? (
              <StatCard
                label="Mayor margen"
                value={data?.topMarginService?.name ?? "—"}
                valueVariant="text"
                icon={<CrownDiamond width={20} height={20} />}
                headerAction={
                  data?.topMarginService ? (
                    <button
                      type="button"
                      onClick={marginDetailModal.open}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
                      aria-label="Ver detalle del servicio"
                    >
                      <Eye width={14} height={14} />
                    </button>
                  ) : null
                }
                subtitle={
                  data?.topMarginService
                    ? `${formatCurrency(data.topMarginService.revenue)} · ${data.topMarginService.count} ${data.topMarginService.count === 1 ? "vez" : "veces"} · ${data.topMarginService.sharePct}%`
                    : "Sin servicios completados en el período"
                }
              />
            ) : null}
            <StatCard
              label="Turnos"
              value={data?.totalAppointments ?? 0}
              icon={<Calendar width={20} height={20} />}
              delta={
                <DeltaBadge
                  changePct={data?.comparison?.appointments?.changePct}
                  label={comparisonLabel}
                />
              }
              subtitle={`${data?.scheduled ?? 0} agendados · ${data?.pending_payment ?? 0} por pagar`}
            />
            <StatCard
              label="Tasa de cierre"
              value={`${completionRate}%`}
              icon={<Check width={20} height={20} />}
              variant="success"
              delta={
                <DeltaBadge
                  changePct={data?.comparison?.completionRate?.changePct}
                  label={comparisonLabel}
                />
              }
              subtitle={`${data?.completed ?? 0} de ${totalStatus} en el período`}
            />
            <StatCard
              label={isEmployee ? "Mis clientes" : "Clientes"}
              value={data?.totalCustomers ?? 0}
              icon={<Person width={20} height={20} />}
              variant="success"
              subtitle={
                isEmployee
                  ? `${data?.totalServices ?? 0} servicios realizados`
                  : `${data?.totalServices ?? 0} servicios activos`
              }
            />
          </div>

          {isOwner && data?.ownerInsights ? (
            <OwnerInsightsPanel
              insights={data.ownerInsights}
              comparisonLabel={comparisonLabel}
              periodDescription={periodDescription}
              showBranchComparison={branchFilter === "all"}
            />
          ) : null}

          {showRevenue ? (
            <div className="flex flex-col gap-4">
              <div
                className="min-w-0 rounded-2xl border border-separator bg-surface p-4 md:p-5"
                data-onboarding="dash-revenue"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">
                      Ingresos del período
                    </h2>
                    <p className="text-xs text-muted">
                      Turnos completados · {periodDescription}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(revenueChartTotal)}
                    </p>
                    <p className="text-[10px] font-medium text-muted">
                      acumulado
                    </p>
                  </div>
                </div>
                {data ? (
                  <div className="h-[200px] w-full min-w-0 md:h-[240px] lg:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={data.revenueByDay ?? []}
                        margin={{
                          top: 8,
                          right: 4,
                          left: -8,
                          bottom: data.period === "month" ? 8 : 0,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--separator)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{
                            fill: "var(--muted)",
                            fontSize: data.period === "month" ? 10 : 12,
                          }}
                          axisLine={{ stroke: "var(--separator)" }}
                          tickLine={false}
                          interval={
                            data.period === "month" ? "preserveStartEnd" : 0
                          }
                          angle={data.period === "month" ? -30 : 0}
                          textAnchor={
                            data.period === "month" ? "end" : "middle"
                          }
                          height={data.period === "month" ? 40 : 28}
                        />
                        <YAxis
                          tick={{ fill: "var(--muted)", fontSize: 11 }}
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
                        <Tooltip
                          cursor={{
                            stroke: "var(--success)",
                            strokeWidth: 1,
                            strokeDasharray: "4 4",
                          }}
                          contentStyle={{
                            background: "var(--surface)",
                            border: "1px solid var(--separator)",
                            borderRadius: "12px",
                            fontSize: 13,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                          formatter={(value) => [
                            formatCurrency(Number(value)),
                            "Ingresos",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke="var(--success)"
                          strokeWidth={2.5}
                          dot={{
                            fill: "var(--surface)",
                            stroke: "var(--success)",
                            strokeWidth: 2,
                            r: 3,
                          }}
                          activeDot={{
                            fill: "var(--success)",
                            stroke: "var(--surface)",
                            strokeWidth: 2,
                            r: 5,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="flex min-w-0 flex-col rounded-2xl border border-separator bg-surface p-4 md:p-5" id="dash-margin-services">
                <div className="mb-3 shrink-0">
                  <h2 className="text-base font-semibold">
                    Servicios por margen
                  </h2>
                  <p className="text-xs text-muted">
                    Aporte por precio de catálogo en turnos completados ·{" "}
                    {periodDescription}
                  </p>
                </div>
                {(data?.topMarginServices?.length ?? 0) > 0 ? (
                  <ul className="min-h-0 flex-1 divide-y divide-separator overflow-y-auto">
                    {(data?.topMarginServices ?? []).map((service, index) => (
                      <li
                        key={service.id}
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            index === 0
                              ? "bg-accent text-accent-foreground"
                              : "bg-surface-secondary text-muted"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {service.name}
                          </p>
                          <p className="text-[11px] text-muted">
                            {service.count}{" "}
                            {service.count === 1 ? "venta" : "ventas"} ·{" "}
                            {service.sharePct}% del margen
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatCurrency(service.revenue)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                    <CrownDiamond
                      width={28}
                      height={28}
                      className="mb-2 text-muted opacity-40"
                    />
                    <p className="text-xs text-muted">
                      Sin servicios completados en el período
                    </p>
                  </div>
                )}
              </div>

              <StatusDistributionCard
                periodDescription={periodDescription}
                statusChartData={statusChartData}
                totalStatus={totalStatus}
                activeStatusKey={activeStatusKey}
                onActiveStatusKeyChange={setActiveStatusKey}
                activeStatusEntry={activeStatusEntry}
                activeStatusPct={activeStatusPct}
              />
              </div>
            </div>
          ) : null}

          <div
            className="min-w-0 rounded-2xl border border-separator bg-surface p-4 md:p-5"
            data-onboarding="dash-activity"
          >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">
                    Actividad del período
                  </h2>
                  <p className="text-xs text-muted">
                    Turnos registrados · {periodDescription}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-bold tabular-nums text-accent">
                    {chartTotal}
                  </p>
                  <p className="text-[10px] font-medium text-muted">turnos</p>
                </div>
              </div>
              {data ? (
                <div className="h-[200px] w-full min-w-0 md:h-[240px] lg:h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.appointmentsByDay ?? []}
                      barCategoryGap={activityBarSizing.barCategoryGap}
                      margin={{
                        top: 8,
                        right: 8,
                        left: -12,
                        bottom:
                          data.period === "month" || data.period === "week"
                            ? 16
                            : 0,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="barGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--accent)"
                            stopOpacity={1}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--accent)"
                            stopOpacity={0.45}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--separator)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{
                          fill: "var(--muted)",
                          fontSize:
                            data.period === "month"
                              ? 10
                              : data.period === "week"
                                ? 9
                                : 10,
                        }}
                        axisLine={{ stroke: "var(--separator)" }}
                        tickLine={false}
                        interval={
                          data.period === "month"
                            ? "preserveStartEnd"
                            : data.period === "week"
                              ? 3
                              : data.period === "today"
                                ? 2
                                : 0
                        }
                        angle={
                          data.period === "month" || data.period === "week"
                            ? -35
                            : 0
                        }
                        textAnchor={
                          data.period === "month" || data.period === "week"
                            ? "end"
                            : "middle"
                        }
                        height={
                          data.period === "month" || data.period === "week"
                            ? 48
                            : 28
                        }
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "var(--muted)", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip
                        cursor={{
                          fill: "color-mix(in srgb, var(--accent) 8%, transparent)",
                        }}
                        contentStyle={{
                          background: "var(--surface)",
                          border: "1px solid var(--separator)",
                          borderRadius: "12px",
                          fontSize: 13,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}
                        formatter={(value) => [`${value} turnos`, "Cantidad"]}
                      />
                      <Bar
                        dataKey="count"
                        fill="url(#barGradient)"
                        radius={[
                          activityBarSizing.radius,
                          activityBarSizing.radius,
                          0,
                          0,
                        ]}
                        maxBarSize={activityBarSizing.maxBarSize}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </div>

          <div
            className={`grid grid-cols-1 items-start gap-4 ${showRevenue ? "" : "lg:grid-cols-2"}`}
          >
            {!showRevenue ? (
              <StatusDistributionCard
                periodDescription={periodDescription}
                statusChartData={statusChartData}
                totalStatus={totalStatus}
                activeStatusKey={activeStatusKey}
                onActiveStatusKeyChange={setActiveStatusKey}
                activeStatusEntry={activeStatusEntry}
                activeStatusPct={activeStatusPct}
              />
            ) : null}

            <div
              className="flex max-h-[24rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-separator bg-surface md:max-h-[28rem] lg:max-h-[32rem]"
              data-onboarding="dash-recent"
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-separator px-4 py-3.5 md:px-5">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">Últimos turnos</h2>
                  <p className="text-xs text-muted">
                    Actividad reciente · {periodDescription}
                  </p>
                </div>
                <Link
                  href={appRoutes.operation.agenda}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:underline"
                >
                  Ver agenda
                  <ArrowRight width={12} height={12} />
                </Link>
              </div>

              {(data?.recentAppointments?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                  <Calendar
                    width={28}
                    height={28}
                    className="mb-2 text-muted opacity-40"
                  />
                  <p className="text-sm font-medium">Sin turnos recientes</p>
                  <Link
                    href={appRoutes.operation.agenda}
                    className="mt-2 text-xs font-semibold text-accent hover:underline"
                  >
                    Crear turno
                  </Link>
                </div>
              ) : (
                <ul className="min-h-0 flex-1 divide-y divide-separator overflow-y-auto">
                  {data?.recentAppointments.map((apt) => {
                    const { date, time } = formatDateTime(apt.date);
                    return (
                      <li key={apt.id}>
                        <Link
                          href={`${appRoutes.operation.agenda}?appointmentId=${apt.id}`}
                          className="flex min-w-0 items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-surface-secondary/50 md:gap-3 md:px-5"
                        >
                          <div
                            className={`h-8 w-1 shrink-0 rounded-full ${getStatusTone(apt.status).dot}`}
                            aria-hidden
                          />
                          <div className="w-14 shrink-0 text-right md:w-20">
                            <p className="text-xs font-semibold tabular-nums">
                              {time}
                            </p>
                            <p className="truncate text-[10px] text-muted">
                              {date}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {apt.customer}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {apt.title}
                            </p>
                          </div>
                          <span className="hidden shrink-0 sm:inline-flex">
                            <StatusChip
                              status={apt.status}
                              size="sm"
                              compact
                              className="max-w-[7rem]"
                            />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      <Modal state={marginDetailModal}>
        <Modal.Backdrop isDismissable>
          <Modal.Container placement="center" size="md" scroll="inside">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon>
                  <CrownDiamond width={20} height={20} />
                </Modal.Icon>
                <Modal.Heading>Servicios por margen</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {data?.topMarginService ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        Mayor margen · {periodDescription}
                      </p>
                      <p className="mt-2 text-lg font-bold leading-snug break-words">
                        {data.topMarginService.name}
                      </p>
                      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-muted">Ingresos</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums">
                            {formatCurrency(data.topMarginService.revenue)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Ventas</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums">
                            {data.topMarginService.count}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Participación</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums">
                            {data.topMarginService.sharePct}%
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {(data.topMarginServices?.length ?? 0) > 1 ? (
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                          Ranking del período
                        </p>
                        <ul className="divide-y divide-separator rounded-xl border border-separator">
                          {(data?.topMarginServices ?? []).map((service, index) => (
                            <li
                              key={service.id}
                              className="flex items-start gap-3 px-3 py-2.5"
                            >
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                  index === 0
                                    ? "bg-accent text-accent-foreground"
                                    : "bg-surface-secondary text-muted"
                                }`}
                              >
                                {index + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium leading-snug break-words">
                                  {service.name}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted">
                                  {service.count}{" "}
                                  {service.count === 1 ? "venta" : "ventas"} ·{" "}
                                  {service.sharePct}%
                                </p>
                              </div>
                              <p className="shrink-0 text-sm font-semibold tabular-nums">
                                {formatCurrency(service.revenue)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    Sin servicios completados en el período.
                  </p>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onPress={() => {
                    marginDetailModal.close();
                    document
                      .getElementById("dash-margin-services")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Ver en panel
                </Button>
                <Button variant="primary" onPress={marginDetailModal.close}>
                  Cerrar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
