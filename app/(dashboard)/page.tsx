"use client";

import { apiUrl } from "@/shared/utils/api";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, Table } from "@heroui/react";
import { StatusChip } from "@/shared/components/StatusChip";
import { StatusLegend } from "@/shared/components/StatusLegend";
import { statusChartColor, statusLabel } from "@/shared/utils/appointment-status";
import { useAuth } from "@/src/features/auth";
import Person from "@gravity-ui/icons/Person";
import Gear from "@gravity-ui/icons/Gear";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import Check from "@gravity-ui/icons/Check";
import Xmark from "@gravity-ui/icons/Xmark";
import Clock from "@gravity-ui/icons/Clock";
import Bell from "@gravity-ui/icons/Bell";
import Calendar from "@gravity-ui/icons/Calendar";
import {
  useReactTable,
  getCoreRowModel,
} from "@tanstack/react-table";
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

interface DashboardData {
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
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(n);
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
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
    <div className="relative overflow-hidden rounded-xl border border-separator bg-surface p-4 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${styles.bar}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-0.5 text-xl font-bold tracking-tight truncate">{value}</p>
          {subtitle && <p className="mt-0.5 text-[11px] text-muted truncate">{subtitle}</p>}
        </div>
        <div className={`shrink-0 rounded-lg p-2 ${styles.bg} ${styles.icon}`}>
          {icon}
        </div>
      </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-10" />
      <Skeleton className="h-52" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(apiUrl(`/api/dashboard?userId=${user.id}`));
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
  }, [user]);

  const columns = useMemo(
    () => [
      { accessorKey: "title" as const, header: "Título" },
      { accessorKey: "customer" as const, header: "Cliente" },
      { accessorKey: "date" as const, header: "Fecha" },
      { accessorKey: "status" as const, header: "Estado" },
    ],
    [],
  );

  const appointmentsTable = useReactTable({
    data: data?.recentAppointments ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (!user) return null;

  const todayLabel = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const totalStatus =
    (data?.scheduled ?? 0) +
    (data?.completed ?? 0) +
    (data?.cancelled ?? 0) +
    (data?.rescheduled ?? 0) +
    (data?.pending_payment ?? 0) +
    (data?.paid_pending ?? 0);

  const completionRate =
    totalStatus > 0 ? Math.round(((data?.completed ?? 0) / totalStatus) * 100) : 0;

  const statusChartData = data
    ? [
        { name: statusLabel.scheduled, value: data.scheduled, color: statusChartColor.scheduled },
        { name: statusLabel.paid_pending, value: data.paid_pending, color: statusChartColor.paid_pending },
        { name: statusLabel.pending_payment, value: data.pending_payment, color: statusChartColor.pending_payment },
        { name: statusLabel.completed, value: data.completed, color: statusChartColor.completed },
        { name: statusLabel.cancelled, value: data.cancelled, color: statusChartColor.cancelled },
        { name: statusLabel.rescheduled, value: data.rescheduled, color: statusChartColor.rescheduled },
      ].filter((item) => item.value > 0)
    : [];

  const weekTotal = data?.appointmentsByDay?.reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-accent capitalize">{todayLabel}</p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">
            {getGreeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="text-muted text-xs mt-0.5">
            Resumen de actividad y rendimiento de tu negocio
          </p>
        </div>
        {(data?.unreadNotifications ?? 0) > 0 && (
          <Link
            href="/notifications"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-separator bg-surface px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-surface-secondary"
          >
            <Bell width={16} height={16} />
            {data?.unreadNotifications} notificación{data?.unreadNotifications === 1 ? "" : "es"} sin leer
          </Link>
        )}
      </div>

      {loadError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm">
            No se pudo cargar el resumen del dashboard. Recarga la página o intenta de nuevo.
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Ingresos"
              value={formatCurrency(data?.revenue ?? 0)}
              icon={<ChartColumn width={22} height={22} />}
              subtitle="Turnos completados"
            />
            <StatCard
              label="Turnos totales"
              value={data?.totalAppointments ?? 0}
              icon={<Calendar width={22} height={22} />}
              subtitle={`${data?.scheduled ?? 0} agendados`}
            />
            <StatCard
              label="Clientes"
              value={data?.totalCustomers ?? 0}
              icon={<Person width={22} height={22} />}
              variant="success"
              subtitle={`${data?.totalServices ?? 0} servicios activos`}
            />
            <StatCard
              label="Tasa de completado"
              value={`${completionRate}%`}
              icon={<Check width={22} height={22} />}
              variant="success"
              subtitle={`${data?.completed ?? 0} de ${totalStatus} turnos`}
            />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: statusLabel.scheduled, value: data?.scheduled ?? 0, icon: Clock, color: "text-orange-500" },
              { label: statusLabel.paid_pending, value: data?.paid_pending ?? 0, icon: Calendar, color: "text-blue-500" },
              { label: statusLabel.pending_payment, value: data?.pending_payment ?? 0, icon: Bell, color: "text-yellow-500" },
              { label: statusLabel.completed, value: data?.completed ?? 0, icon: Check, color: "text-green-500" },
              { label: statusLabel.rescheduled, value: data?.rescheduled ?? 0, icon: Calendar, color: "text-muted" },
              { label: statusLabel.cancelled, value: data?.cancelled ?? 0, icon: Xmark, color: "text-danger" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-lg border border-separator bg-surface-secondary/60 px-2.5 py-2 flex items-center gap-2"
                >
                  <Icon width={16} height={16} className={item.color} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted truncate">{item.label}</p>
                    <p className="text-base font-semibold leading-tight">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <StatusLegend title="" className="rounded-lg border border-separator bg-surface-secondary/40 px-3 py-2 [&_span]:text-xs" />

          <div className="bg-surface rounded-xl border border-separator p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold">Actividad semanal</h2>
                <p className="text-xs text-muted">Últimos 7 días</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{weekTotal}</p>
                <p className="text-[10px] text-muted">esta semana</p>
              </div>
            </div>
            {data && (
              <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.appointmentsByDay ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "var(--muted)", fontSize: 12 }}
                      axisLine={{ stroke: "var(--separator)" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "var(--muted)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "color-mix(in srgb, var(--accent) 8%, transparent)" }}
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--separator)",
                        borderRadius: "12px",
                        fontSize: 13,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                      formatter={(value) => [`${value} turnos`, "Cantidad"]}
                    />
                    <Bar dataKey="count" fill="url(#barGradient)" radius={[8, 8, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
            <div className="bg-surface rounded-xl border border-separator p-4 shadow-sm flex flex-col">
              <div className="mb-3">
                <h2 className="text-base font-semibold">Distribución por estado</h2>
                <p className="text-xs text-muted">Proporción por categoría</p>
              </div>
              {data && statusChartData.length > 0 ? (
                <div className="flex flex-1 flex-col sm:flex-row items-center gap-4">
                  <div className="relative shrink-0">
                    <ResponsiveContainer width={160} height={160}>
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
                          {statusChartData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold">{totalStatus}</span>
                      <span className="text-[10px] text-muted">turnos</span>
                    </div>
                  </div>
                  <div className="w-full flex-1 grid grid-cols-1 gap-1.5">
                    {statusChartData.map((entry) => (
                      <div
                        key={entry.name}
                        className="flex items-center gap-2 rounded-md bg-surface-secondary/60 px-2.5 py-1.5 text-xs"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: entry.color }}
                        />
                        <span className="text-muted truncate">{entry.name}</span>
                        <span className="font-semibold ml-auto tabular-nums">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                  <Gear width={28} height={28} className="text-muted mb-2 opacity-40" />
                  <p className="text-xs text-muted">Sin datos de turnos aún</p>
                </div>
              )}
            </div>

            <div className="bg-surface rounded-xl border border-separator shadow-sm overflow-hidden flex flex-col min-h-[280px]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-separator shrink-0">
                <div>
                  <h2 className="text-base font-semibold">Últimos turnos</h2>
                  <p className="text-xs text-muted">Actividad reciente</p>
                </div>
                <Link href="/agenda" className="text-xs font-medium text-accent hover:underline">
                  Ver agenda
                </Link>
              </div>

              {(data?.recentAppointments?.length ?? 0) === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-10 px-4 text-center">
                  <Calendar width={28} height={28} className="text-muted mb-2 opacity-40" />
                  <p className="text-sm font-medium">Sin turnos recientes</p>
                  <Link href="/agenda" className="mt-2 text-xs font-medium text-accent hover:underline">
                    Crear turno
                  </Link>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-auto">
                  <Table>
                    <Table.Content aria-label="Últimos turnos" className="min-w-full text-sm">
                      <Table.Header>
                        <Table.Column isRowHeader>Título</Table.Column>
                        <Table.Column>Cliente</Table.Column>
                        <Table.Column>Fecha</Table.Column>
                        <Table.Column>Estado</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {appointmentsTable.getRowModel().rows.map((row) => {
                          const apt = row.original;
                          const { date, time } = formatDateTime(apt.date);
                          return (
                            <Table.Row key={apt.id}>
                              <Table.Cell>
                                <span className="font-medium text-sm truncate block max-w-[140px]">
                                  {apt.title}
                                </span>
                              </Table.Cell>
                              <Table.Cell>
                                <span className="text-muted text-xs truncate block max-w-[120px]">
                                  {apt.customer}
                                </span>
                              </Table.Cell>
                              <Table.Cell>
                                <span className="text-xs whitespace-nowrap">
                                  {date} · {time}
                                </span>
                              </Table.Cell>
                              <Table.Cell>
                                <StatusChip status={apt.status} />
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Content>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
