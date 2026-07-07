"use client";

import { apiUrl } from "@/shared/utils/api";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Table, Pagination, Chip } from "@heroui/react";
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
  getPaginationRowModel,
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

const statusLabel: Record<string, string> = {
  scheduled: "Agendado",
  rescheduled: "Reagendado",
  completed: "Completado",
  cancelled: "Cancelado",
};

const statusColor: Record<string, "accent" | "warning" | "success" | "danger"> = {
  scheduled: "accent",
  rescheduled: "warning",
  completed: "success",
  cancelled: "danger",
};

const CHART_COLORS = {
  scheduled: "var(--accent)",
  completed: "var(--success)",
  cancelled: "var(--danger)",
  rescheduled: "var(--warning)",
};

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
    <div className="relative overflow-hidden rounded-2xl border border-separator bg-surface p-5 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-1 ${styles.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight truncate">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        </div>
        <div className={`shrink-0 rounded-xl p-2.5 ${styles.bg} ${styles.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

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
    pageCount: Math.ceil((data?.recentAppointments.length ?? 0) / PAGE_SIZE),
    state: { pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE } },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: page - 1, pageSize: PAGE_SIZE })
          : updater;
      setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  useEffect(() => {
    fetch(apiUrl(`/api/dashboard?userId=${user?.id ?? ""}`))
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [user]);

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
    (data?.rescheduled ?? 0);

  const completionRate =
    totalStatus > 0 ? Math.round(((data?.completed ?? 0) / totalStatus) * 100) : 0;

  const statusChartData = data
    ? [
        { name: "Agendados", value: data.scheduled, color: CHART_COLORS.scheduled },
        { name: "Completados", value: data.completed, color: CHART_COLORS.completed },
        { name: "Cancelados", value: data.cancelled, color: CHART_COLORS.cancelled },
        { name: "Reagendados", value: data.rescheduled, color: CHART_COLORS.rescheduled },
      ].filter((item) => item.value > 0)
    : [];

  const weekTotal = data?.appointmentsByDay.reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent capitalize">{todayLabel}</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">
            {getGreeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="text-muted text-sm mt-1">
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

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Agendados", value: data?.scheduled ?? 0, icon: Clock, color: "text-accent" },
              { label: "Completados", value: data?.completed ?? 0, icon: Check, color: "text-success" },
              { label: "Reagendados", value: data?.rescheduled ?? 0, icon: Calendar, color: "text-warning" },
              { label: "Cancelados", value: data?.cancelled ?? 0, icon: Xmark, color: "text-danger" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-separator bg-surface-secondary/60 px-4 py-3 flex items-center gap-3"
                >
                  <Icon width={18} height={18} className={item.color} />
                  <div>
                    <p className="text-xs text-muted">{item.label}</p>
                    <p className="text-lg font-semibold leading-tight">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bg-surface rounded-2xl border border-separator p-6 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Actividad semanal</h2>
                  <p className="text-sm text-muted mt-0.5">
                    Turnos registrados en los últimos 7 días
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{weekTotal}</p>
                  <p className="text-xs text-muted">esta semana</p>
                </div>
              </div>
              {data && (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.appointmentsByDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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

            <div className="lg:col-span-2 bg-surface rounded-2xl border border-separator p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Distribución por estado</h2>
                <p className="text-sm text-muted mt-0.5">Proporción de turnos por categoría</p>
              </div>
              {data && statusChartData.length > 0 ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <ResponsiveContainer width={220} height={220}>
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={88}
                          paddingAngle={4}
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
                            fontSize: 13,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-bold">{totalStatus}</span>
                      <span className="text-xs text-muted">turnos</span>
                    </div>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-2">
                    {statusChartData.map((entry) => (
                      <div
                        key={entry.name}
                        className="flex items-center gap-2 rounded-lg bg-surface-secondary/60 px-3 py-2 text-sm"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: entry.color }}
                        />
                        <span className="text-muted truncate">{entry.name}</span>
                        <span className="font-semibold ml-auto">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-52 text-center">
                  <Gear width={32} height={32} className="text-muted mb-3 opacity-40" />
                  <p className="text-sm text-muted">Sin datos de turnos aún</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-separator shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-separator">
              <div>
                <h2 className="text-lg font-semibold">Últimos turnos</h2>
                <p className="text-sm text-muted mt-0.5">Actividad reciente en tu agenda</p>
              </div>
              <Link
                href="/agenda"
                className="text-sm font-medium text-accent hover:underline"
              >
                Ver agenda
              </Link>
            </div>

            {data?.recentAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <Calendar width={36} height={36} className="text-muted mb-3 opacity-40" />
                <p className="font-medium">Sin turnos recientes</p>
                <p className="text-sm text-muted mt-1">Los nuevos turnos aparecerán aquí</p>
                <Link
                  href="/agenda"
                  className="mt-4 text-sm font-medium text-accent hover:underline"
                >
                  Crear primer turno
                </Link>
              </div>
            ) : (
              <div className="px-2 pb-4">
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Últimos turnos" className="min-w-[560px]">
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
                                <span className="font-medium">{apt.title}</span>
                              </Table.Cell>
                              <Table.Cell className="text-muted">{apt.customer}</Table.Cell>
                              <Table.Cell>
                                <div className="flex flex-col">
                                  <span className="text-sm">{date}</span>
                                  <span className="text-xs text-muted">{time}</span>
                                </div>
                              </Table.Cell>
                              <Table.Cell>
                                <Chip color={statusColor[apt.status] ?? "default"} variant="soft" size="sm">
                                  {statusLabel[apt.status] ?? apt.status}
                                </Chip>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
                {(data?.recentAppointments.length ?? 0) > PAGE_SIZE && (
                  <Table.Footer className="px-4">
                    <Pagination size="sm">
                      <Pagination.Summary>
                        {appointmentsTable.getState().pagination.pageIndex * PAGE_SIZE + 1} a{" "}
                        {Math.min(
                          (appointmentsTable.getState().pagination.pageIndex + 1) * PAGE_SIZE,
                          data?.recentAppointments.length ?? 0,
                        )}{" "}
                        de {data?.recentAppointments.length ?? 0}
                      </Pagination.Summary>
                      <Pagination.Content>
                        <Pagination.Item>
                          <Pagination.Previous
                            isDisabled={!appointmentsTable.getCanPreviousPage()}
                            onPress={() => appointmentsTable.previousPage()}
                          >
                            <Pagination.PreviousIcon />
                          </Pagination.Previous>
                        </Pagination.Item>
                        {Array.from({ length: appointmentsTable.getPageCount() }, (_, i) => i + 1).map(
                          (p) => (
                            <Pagination.Item key={p}>
                              <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>
                                {p}
                              </Pagination.Link>
                            </Pagination.Item>
                          ),
                        )}
                        <Pagination.Item>
                          <Pagination.Next
                            isDisabled={!appointmentsTable.getCanNextPage()}
                            onPress={() => appointmentsTable.nextPage()}
                          >
                            <Pagination.NextIcon />
                          </Pagination.Next>
                        </Pagination.Item>
                      </Pagination.Content>
                    </Pagination>
                  </Table.Footer>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
