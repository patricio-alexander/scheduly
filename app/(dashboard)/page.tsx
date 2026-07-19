"use client";

import { apiUrl } from "@/shared/utils/api";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { StatusChip } from "@/shared/components/StatusChip";
import {
  getStatusTone,
  statusChartColor,
  statusLabel,
  statusLabelShort,
} from "@/shared/utils/appointment-status";
import { useAuth } from "@/src/features/auth";
import Person from "@gravity-ui/icons/Person";
import Gear from "@gravity-ui/icons/Gear";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import Check from "@gravity-ui/icons/Check";
import Xmark from "@gravity-ui/icons/Xmark";
import Clock from "@gravity-ui/icons/Clock";
import Bell from "@gravity-ui/icons/Bell";
import Calendar from "@gravity-ui/icons/Calendar";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import TriangleExclamation from "@gravity-ui/icons/TriangleExclamation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "@/shared/components/ui";
import {
  dashboardPeriodLabel,
  dashboardPeriodOptions,
  getDashboardPeriodDescription,
  type DashboardPeriod,
} from "@/shared/utils/dashboard-period";
import { stockAlertLabel } from "@/shared/utils/stock";

interface DashboardData {
  period: DashboardPeriod;
  unreadNotifications: number;
  totalCustomers: number;
  totalServices: number;
  totalAppointments: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  rescheduled: number;
  pending_payment: number;
  paid_pending: number;
  revenue: number;
  lowStockThreshold: number;
  lowStockCount: number;
  lowStockProducts: Array<{
    id: number;
    name: string;
    stock: number;
  }>;
  appointmentsByDay: { date: string; count: number }[];
  recentAppointments: Array<{
    id: number;
    title: string;
    customer: string;
    date: string;
    status: string;
  }>;
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

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
    }),
    time: date.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function StatCard({
  label,
  value,
  icon,
  variant = "accent",
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  variant?: "accent" | "success";
  subtitle?: string;
}) {
  const styles = {
    accent: { bar: "bg-accent", icon: "text-accent", bg: "bg-accent/10" },
    success: { bar: "bg-success", icon: "text-success", bg: "bg-success/10" },
  }[variant];

  return (
    <div className="relative min-w-0 overflow-hidden rounded-xl border border-separator bg-surface p-3.5 shadow-sm sm:p-4">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${styles.bar}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{label}</p>
          <p className="mt-0.5 truncate text-lg font-bold tracking-tight sm:text-xl">
            {value}
          </p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[11px] text-muted">{subtitle}</p>
          ) : null}
        </div>
        <div className={`shrink-0 rounded-lg p-2 ${styles.bg} ${styles.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusCountCard({
  status,
  value,
}: {
  status: string;
  value: number;
}) {
  const tone = getStatusTone(status);
  const label = statusLabelShort[status] ?? statusLabel[status] ?? status;

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-separator bg-surface px-3 py-2.5 shadow-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
        <p className={`min-w-0 flex-1 truncate text-[11px] font-medium ${tone.text}`}>
          {label}
        </p>
      </div>
      <p className="mt-1.5 text-xl font-bold tabular-nums leading-none">{value}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <Skeleton className="h-52" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
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
    <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-separator bg-surface-secondary/60 p-1">
      {dashboardPeriodOptions.map((periodOption) => {
        const selected = value === periodOption;
        return (
          <button
            key={periodOption}
            type="button"
            onClick={() => onChange(periodOption)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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

export default function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>("week");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(
        apiUrl(`/api/dashboard?userId=${user.id}&period=${period}`),
      );
      if (!res.ok) {
        setData(null);
        setLoadError(true);
        return;
      }
      const json: unknown = await res.json();
      if (json && typeof json === "object") {
        setData(json as DashboardData);
      } else {
        setData(null);
        setLoadError(true);
      }
    } catch {
      setData(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user, period]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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

  const completionRate =
    totalStatus > 0
      ? Math.round(((data?.completed ?? 0) / totalStatus) * 100)
      : 0;

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
  const chartTotal =
    data?.appointmentsByDay?.reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-5 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium capitalize text-accent">
            {todayLabel}
          </p>
          <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight">
            {getGreeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            Resumen de actividad y rendimiento
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:items-end">
          <PeriodFilter value={period} onChange={setPeriod} />
          {(data?.unreadNotifications ?? 0) > 0 && (
            <Link
              href="/sistema/notificaciones"
              className="inline-flex max-w-full items-center gap-2 self-start truncate rounded-xl border border-separator bg-surface px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-surface-secondary sm:self-end"
            >
              <Bell width={16} height={16} className="shrink-0" />
              <span className="truncate">
                {data?.unreadNotifications} sin leer
              </span>
            </Link>
          )}
        </div>
      </div>

      {loadError && (
        <div className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            No se pudo cargar el resumen. Intenta de nuevo.
          </p>
          <Button size="sm" variant="secondary" onPress={loadDashboard}>
            Reintentar
          </Button>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {(data?.lowStockProducts?.length ?? 0) > 0 && (
            <div className="overflow-hidden rounded-xl border border-warning/35 bg-warning/10 shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-warning/20 px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="shrink-0 rounded-lg bg-warning/20 p-2 text-warning">
                    <TriangleExclamation width={18} height={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">
                      Alertas de inventario
                    </h2>
                    <p className="text-xs text-muted">
                      {data?.lowStockCount === 1
                        ? "1 producto en stock mínimo o sin unidades"
                        : `${data?.lowStockCount} productos en stock mínimo o sin unidades`}
                      {data?.lowStockThreshold != null
                        ? ` (≤ ${data.lowStockThreshold})`
                        : ""}
                      . También se generó una notificación.
                    </p>
                  </div>
                </div>
                <Link
                  href="/inventario/productos"
                  className="shrink-0 text-xs font-medium text-accent hover:underline"
                >
                  Ver inventario
                </Link>
              </div>
              <ul className="divide-y divide-warning/15">
                {data?.lowStockProducts.map((product) => {
                  const label = stockAlertLabel(product.stock) ?? "Stock bajo";
                  const out = product.stock <= 0;
                  return (
                    <li
                      key={product.id}
                      className="flex min-w-0 items-center gap-3 px-4 py-2.5"
                    >
                      <Boxes3
                        width={16}
                        height={16}
                        className="shrink-0 text-muted opacity-70"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {product.name}
                        </p>
                        <p className="text-[11px] text-muted">
                          Stock actual:{" "}
                          <span
                            className={`font-semibold tabular-nums ${
                              out ? "text-danger" : "text-warning"
                            }`}
                          >
                            {product.stock}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                          out
                            ? "bg-danger/15 text-danger ring-danger/25"
                            : "bg-warning/20 text-warning ring-warning/30"
                        }`}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Ingresos"
              value={formatCurrency(data?.revenue ?? 0)}
              icon={<ChartColumn width={20} height={20} />}
              subtitle={`${periodDescription} · completados`}
            />
            <StatCard
              label="Turnos"
              value={data?.totalAppointments ?? 0}
              icon={<Calendar width={20} height={20} />}
              subtitle={`${data?.scheduled ?? 0} agendados`}
            />
            <StatCard
              label="Clientes"
              value={data?.totalCustomers ?? 0}
              icon={<Person width={20} height={20} />}
              variant="success"
              subtitle={`${data?.totalServices ?? 0} servicios`}
            />
            <StatCard
              label="Completado"
              value={`${completionRate}%`}
              icon={<Check width={20} height={20} />}
              variant="success"
              subtitle={`${data?.completed ?? 0} de ${totalStatus}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <StatusCountCard status="scheduled" value={data?.scheduled ?? 0} />
            <StatusCountCard status="paid_pending" value={data?.paid_pending ?? 0} />
            <StatusCountCard
              status="pending_payment"
              value={data?.pending_payment ?? 0}
            />
            <StatusCountCard status="completed" value={data?.completed ?? 0} />
            <StatusCountCard
              status="rescheduled"
              value={data?.rescheduled ?? 0}
            />
            <StatusCountCard status="cancelled" value={data?.cancelled ?? 0} />
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-separator bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold">Actividad</h2>
                <p className="text-xs text-muted">{periodDescription}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xl font-bold tabular-nums">{chartTotal}</p>
                <p className="text-[10px] text-muted">en el período</p>
              </div>
            </div>
            {data ? (
              <div className="h-[200px] w-full min-w-0 sm:h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.appointmentsByDay ?? []}
                    margin={{
                      top: 8,
                      right: 4,
                      left: -20,
                      bottom: data.period === "month" ? 8 : 0,
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
                          stopOpacity={0.5}
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
                        fontSize: data.period === "month" ? 10 : 12,
                      }}
                      axisLine={{ stroke: "var(--separator)" }}
                      tickLine={false}
                      interval={
                        data.period === "month" ? "preserveStartEnd" : 0
                      }
                      angle={data.period === "month" ? -30 : 0}
                      textAnchor={data.period === "month" ? "end" : "middle"}
                      height={data.period === "month" ? 40 : 28}
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
                      radius={[8, 8, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
            <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-separator bg-surface p-4 shadow-sm">
              <div className="mb-3 min-w-0">
                <h2 className="text-base font-semibold">
                  Distribución por estado
                </h2>
                <p className="text-xs text-muted">{periodDescription}</p>
              </div>
              {data && statusChartData.length > 0 ? (
                <div className="flex flex-1 flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <div className="relative h-40 w-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={68}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {statusChartData.map((entry) => (
                            <Cell key={entry.key} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "var(--surface)",
                            border: "1px solid var(--separator)",
                            borderRadius: "12px",
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold tabular-nums">
                        {totalStatus}
                      </span>
                      <span className="text-[10px] text-muted">turnos</span>
                    </div>
                  </div>
                  <div className="grid w-full min-w-0 flex-1 grid-cols-1 gap-1.5">
                    {statusChartData.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex min-w-0 items-center gap-2 rounded-lg bg-surface-secondary/60 px-2.5 py-1.5 text-xs"
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: entry.color }}
                        />
                        <span className="min-w-0 flex-1 truncate text-muted">
                          {entry.name}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                  <Gear
                    width={28}
                    height={28}
                    className="mb-2 text-muted opacity-40"
                  />
                  <p className="text-xs text-muted">Sin datos de turnos aún</p>
                </div>
              )}
            </div>

            <div className="flex min-h-[280px] min-w-0 flex-col overflow-hidden rounded-xl border border-separator bg-surface shadow-sm">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-separator px-4 py-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">Últimos turnos</h2>
                  <p className="text-xs text-muted">{periodDescription}</p>
                </div>
                <Link
                  href="/operacion/agenda"
                  className="shrink-0 text-xs font-medium text-accent hover:underline"
                >
                  Ver agenda
                </Link>
              </div>

              {(data?.recentAppointments?.length ?? 0) === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
                  <Calendar
                    width={28}
                    height={28}
                    className="mb-2 text-muted opacity-40"
                  />
                  <p className="text-sm font-medium">Sin turnos recientes</p>
                  <Link
                    href="/operacion/agenda"
                    className="mt-2 text-xs font-medium text-accent hover:underline"
                  >
                    Crear turno
                  </Link>
                </div>
              ) : (
                <ul className="min-h-0 flex-1 divide-y divide-separator overflow-y-auto">
                  {data?.recentAppointments.map((apt) => {
                    const { date, time } = formatDateTime(apt.date);
                    return (
                      <li
                        key={apt.id}
                        className="flex min-w-0 items-start gap-3 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {apt.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {apt.customer}
                          </p>
                          <p className="mt-1 text-[11px] text-muted">
                            {date} · {time}
                          </p>
                        </div>
                        <StatusChip
                          status={apt.status}
                          size="sm"
                          compact
                          className="max-w-[7.5rem] shrink-0"
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
