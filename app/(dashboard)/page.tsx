"use client";

import { apiUrl } from "@/shared/utils/api";
import { useEffect, useMemo, useState } from "react";
import { Table, Pagination, Chip } from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import Person from "@gravity-ui/icons/Person";
import Gear from "@gravity-ui/icons/Gear";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import Check from "@gravity-ui/icons/Check";
import Xmark from "@gravity-ui/icons/Xmark";
import Clock from "@gravity-ui/icons/Clock";
import Bell from "@gravity-ui/icons/Bell";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

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

const statusChartData = (data: DashboardData) => [
  { name: "Agendados", value: data.scheduled, color: "var(--accent)" },
  { name: "Completados", value: data.completed, color: "var(--success)" },
  { name: "Cancelados", value: data.cancelled, color: "var(--danger)" },
  { name: "Reagendados", value: data.rescheduled, color: "var(--warning)" },
];

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
    []
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

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(n);

  const cards = [
    { label: "Clientes", value: data?.totalCustomers ?? 0, icon: Person, color: "text-accent" },
    { label: "Servicios", value: data?.totalServices ?? 0, icon: Gear, color: "text-warning" },
    { label: "Agendados", value: data?.scheduled ?? 0, icon: Clock, color: "text-accent" },
    { label: "Completados", value: data?.completed ?? 0, icon: Check, color: "text-success" },
    { label: "Cancelados", value: data?.cancelled ?? 0, icon: Xmark, color: "text-danger" },
    { label: "Ingresos", value: formatCurrency(data?.revenue ?? 0), icon: ChartColumn, color: "text-accent" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted text-sm">Bienvenido, {user.name}</p>
      </div>

      {loading ? (
        <p className="text-muted">Cargando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-surface rounded-xl border border-separator p-5 flex items-center gap-4"
                >
                  <div className={`${card.color} bg-surface-secondary rounded-xl p-3`}>
                    <Icon width={24} height={24} />
                  </div>
                  <div>
                    <p className="text-sm text-muted">{card.label}</p>
                    <p className="text-xl font-semibold">{card.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-surface rounded-xl border border-separator p-5">
              <h2 className="text-lg font-semibold mb-4">Turnos por día</h2>
              {data && (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.appointmentsByDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--separator)",
                        borderRadius: "var(--field-radius)",
                        fontSize: 13,
                      }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {data.appointmentsByDay.map((_, i) => (
                        <Cell key={i} fill="var(--accent)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-surface rounded-xl border border-separator p-5">
              <h2 className="text-lg font-semibold mb-4">Estado de turnos</h2>
              {data && (
                <div className="flex items-center justify-center gap-8">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={statusChartData(data)}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusChartData(data).map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface)",
                          border: "1px solid var(--separator)",
                          borderRadius: "var(--field-radius)",
                          fontSize: 13,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 text-sm">
                    {statusChartData(data).map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ background: entry.color }}
                        />
                        <span className="text-muted">{entry.name}</span>
                        <span className="font-semibold">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-separator p-5">
            <h2 className="text-lg font-semibold mb-4">Últimos turnos</h2>
            {data?.recentAppointments.length === 0 ? (
              <p className="text-muted text-sm">Sin turnos recientes</p>
            ) : (
              <div className="flex flex-col gap-4">
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Últimos turnos" className="min-w-[500px]">
                      <Table.Header>
                        <Table.Column isRowHeader>Título</Table.Column>
                        <Table.Column>Cliente</Table.Column>
                        <Table.Column>Fecha</Table.Column>
                        <Table.Column>Estado</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {appointmentsTable.getRowModel().rows.map((row) => {
                          const apt = row.original;
                          return (
                            <Table.Row key={apt.id}>
                              <Table.Cell>{apt.title}</Table.Cell>
                              <Table.Cell>{apt.customer}</Table.Cell>
                              <Table.Cell>{new Date(apt.date).toLocaleDateString("es-CL")}</Table.Cell>
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
                <Table.Footer>
                  <Pagination size="sm">
                    <Pagination.Summary>
                      {appointmentsTable.getState().pagination.pageIndex * PAGE_SIZE + 1} a{" "}
                      {Math.min(
                        (appointmentsTable.getState().pagination.pageIndex + 1) * PAGE_SIZE,
                        data?.recentAppointments.length ?? 0
                      )}{" "}
                      de {data?.recentAppointments.length ?? 0} resultados
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
                      {Array.from(
                        { length: appointmentsTable.getPageCount() },
                        (_, i) => i + 1
                      ).map((p) => (
                        <Pagination.Item key={p}>
                          <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>
                            {p}
                          </Pagination.Link>
                        </Pagination.Item>
                      ))}
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
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
