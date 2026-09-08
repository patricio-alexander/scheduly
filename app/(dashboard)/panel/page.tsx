"use client";

import { apiUrl } from "@/shared/utils/api";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import {
  statusChartColor,
  statusLabel,
} from "@/shared/utils/appointment-status";
import { BranchSelector, useBranches } from "@/src/features/branches";
import { useAuth } from "@/src/features/auth";
import { canViewRevenue, isOwnerRole, isPureEmployeeRole } from "@/shared/utils/roles";
import { branchDisplayLabel } from "@/shared/utils/auth-user";
import { appRoutes } from "@/shared/utils/app-routes";
import { useDashboardSocket, TopEmployeesCard, RecentAppointmentsCard, FinanceHeroCards, StockAlertsPanel, AppointmentStatusSummaryPanel, DashboardFinanceCharts, AppointmentStatusPieCard } from "@/src/features/dashboard";
import type {
  DashboardPaymentBreakdownItem,
  DashboardRecentAppointment,
  DashboardTopEmployee,
} from "@/shared/utils/dashboard-widgets";
import type {
  AppointmentStatusOverviewItem,
  FinanceHeroSummary,
  StockAlertsBuckets,
} from "@/shared/utils/dashboard-finance-hero";
import Person from "@gravity-ui/icons/Person";
import Check from "@gravity-ui/icons/Check";
import Calendar from "@gravity-ui/icons/Calendar";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import Plus from "@gravity-ui/icons/Plus";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import ArrowUp from "@gravity-ui/icons/ArrowUp";
import ArrowDown from "@gravity-ui/icons/ArrowDown";
import Receipt from "@gravity-ui/icons/Receipt";
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

interface DashboardData {
  period: DashboardPeriod;
  metricsMode?: "pos" | "agenda";
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
  topEmployees: DashboardTopEmployee[];
  paymentBreakdown: DashboardPaymentBreakdownItem[];
  recentAppointments: DashboardRecentAppointment[];
  financeHero?: FinanceHeroSummary | null;
  stockAlerts?: StockAlertsBuckets | null;
  appointmentStatusOverview?: AppointmentStatusOverviewItem[];
  comparison: {
    revenue: ComparisonMetric;
    appointments: ComparisonMetric;
    completionRate: ComparisonMetric;
  };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[7.5rem] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-12 rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Skeleton className="h-72 rounded-2xl xl:col-span-8" />
        <Skeleton className="h-72 rounded-2xl xl:col-span-4" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

function QuickActions({ showSales = true }: { showSales?: boolean }) {
  const actions = showSales
    ? quickActions
    : quickActions.filter((a) => a.href !== appRoutes.sales.salesHub);

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
    href: appRoutes.sales.orders,
    label: "Nuevo pedido",
    hint: "Ventas",
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
    href: appRoutes.sales.salesHub,
    label: "Ventas",
    hint: "Productos",
    icon: Receipt,
  },
] as const;

type StatusChartEntry = {
  key: string;
  name: string;
  value: number;
  color: string;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { branches } = useBranches();
  const [period, setPeriod] = useState<DashboardPeriod>("all");
  const [branchFilter, setBranchFilter] = useState<number | "all">("all");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeStatusKey, setActiveStatusKey] = useState<string | null>(null);

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

  const posMode = data?.metricsMode === "pos";

  const statusChartData = data
    ? posMode && data.appointmentStatusOverview?.length
      ? data.appointmentStatusOverview
          .filter((item) => item.count > 0)
          .map((item) => ({
            key: item.id,
            name: item.label,
            value: item.count,
            color:
              item.id === "completed"
                ? statusChartColor.completed
                : item.id === "pending_payment"
                  ? statusChartColor.pending_payment
                  : item.id === "paid_pending"
                    ? statusChartColor.paid_pending
                    : statusChartColor.scheduled,
          }))
      : [
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
                ? "Todos los locales · "
                : isEmployee
                  ? "Tus ventas · "
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
          {showRevenue && data?.financeHero ? (
            <FinanceHeroCards summary={data.financeHero} />
          ) : (
            <div
              className="grid grid-cols-2 gap-3 xl:grid-cols-3"
              data-onboarding="dash-kpis"
            >
              <StatCard
                label="Pedidos"
                value={data?.totalAppointments ?? 0}
                icon={<Calendar width={20} height={20} />}
                delta={
                  <DeltaBadge
                    changePct={data?.comparison?.appointments?.changePct}
                    label={comparisonLabel}
                  />
                }
                subtitle={`${data?.pending_payment ?? 0} por cobrar · ${data?.completed ?? 0} pagados`}
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
                    : `${data?.totalServices ?? 0} productos activos`
                }
              />
            </div>
          )}

          {showRevenue ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="min-w-0 xl:col-span-8">
                {data?.stockAlerts ? (
                  <StockAlertsPanel alerts={data.stockAlerts} />
                ) : null}
              </div>
              <div className="min-w-0 xl:col-span-4">
                <AppointmentStatusSummaryPanel
                  items={data?.appointmentStatusOverview ?? []}
                  posMode={posMode}
                />
              </div>
            </div>
          ) : null}

          {showRevenue ? (
            <DashboardFinanceCharts
              branchId={branchFilter === "all" ? null : branchFilter}
              paymentBreakdown={data?.paymentBreakdown ?? []}
              periodDescription={periodDescription}
              statusChartData={statusChartData}
              totalStatus={totalStatus}
              activeStatusKey={activeStatusKey}
              onActiveStatusKeyChange={setActiveStatusKey}
              activeStatusEntry={activeStatusEntry}
              activeStatusPct={activeStatusPct}
              unitLabel={posMode ? "pedidos" : "turnos"}
            />
          ) : null}

          {showRevenue ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TopEmployeesCard
                employees={data?.topEmployees ?? []}
                periodDescription={periodDescription}
                posMode={posMode}
              />
              <RecentAppointmentsCard
                appointments={data?.recentAppointments ?? []}
                periodDescription={periodDescription}
                className="max-h-[20rem]"
                posMode={posMode}
              />
            </div>
          ) : null}

          {!showRevenue ? (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <AppointmentStatusPieCard
                statusChartData={statusChartData}
                totalStatus={totalStatus}
                activeStatusKey={activeStatusKey}
                onActiveStatusKeyChange={setActiveStatusKey}
                activeStatusEntry={activeStatusEntry}
                activeStatusPct={activeStatusPct}
                periodDescription={periodDescription}
                unitLabel={posMode ? "pedidos" : "turnos"}
              />
              <RecentAppointmentsCard
                appointments={data?.recentAppointments ?? []}
                periodDescription={periodDescription}
                posMode={posMode}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
