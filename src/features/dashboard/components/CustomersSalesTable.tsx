"use client";

import Persons from "@gravity-ui/icons/Persons";
import { Button, Modal, useOverlayState } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { Skeleton } from "@/shared/components/ui";
import { useChartThemeColors } from "../hooks/useChartThemeColors";

type CustomerLineItem = {
  kind: "service" | "product";
  id: number;
  name: string;
  totalQuantity: number;
  totalAmount: number;
  pendingQuantity: number;
  pendingAmount: number;
};

type CustomerRow = {
  customerId: number;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  ordersCount: number;
  revenueTotal: number;
  cobrable: number;
  liquidado?: number;
  abonado: number;
  debe: number;
  lastOrderAt: string | null;
  productSummary: Array<{
    productId: number;
    name: string;
    totalQuantity: number;
    totalAmount: number;
    pendingQuantity: number;
    pendingAmount: number;
  }>;
  itemsSummary?: CustomerLineItem[];
};

type CustomersResponse = {
  customers: CustomerRow[];
};

type CustomersSalesTableProps = {
  branchId?: number | null;
};

const CHART_TOP_N = 10;

const SEGMENT_COLORS = {
  // Verde = pagado · Azul = abonado · Rojo = no pagado
  liquidado: "#22c55e",
  abonado: "#3b82f6",
  deuda: "#ef4444",
} as const;

function formatDate(iso: string | null) {
  if (!iso) return "Sin registros";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function truncateLabel(name: string, max = 18) {
  const value = String(name || "");
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Segmentos: verde pagado · azul abonado · rojo no pagado. */
function buildChartSegments(row: CustomerRow) {
  const revenueTotal = Number(row.revenueTotal || 0);
  const deuda = Math.max(0, Number(row.debe || 0));
  const abonado = Math.max(0, Number(row.abonado || 0));
  const cobrable = Number(row.cobrable || revenueTotal);

  // Preferir liquidado del API (pagos en turnos sin deuda).
  // Fallback legacy: total − abono − deuda.
  const liquidado =
    row.liquidado != null
      ? Math.max(0, Number(row.liquidado || 0))
      : Math.max(0, Number((revenueTotal - abonado - deuda).toFixed(2)));

  return { liquidado, abonado, deuda, revenueTotal, cobrable };
}

function CustomerDetailModal({
  open,
  customer,
  onClose,
}: {
  open: boolean;
  customer: CustomerRow | null;
  onClose: () => void;
}) {
  const modal = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) onClose();
    },
  });

  if (!customer) return null;

  const segments = buildChartSegments(customer);
  const items: CustomerLineItem[] =
    customer.itemsSummary && customer.itemsSummary.length > 0
      ? customer.itemsSummary
      : customer.productSummary.map((product) => ({
          kind: "product" as const,
          id: product.productId,
          name: product.name,
          totalQuantity: product.totalQuantity,
          totalAmount: product.totalAmount,
          pendingQuantity: product.pendingQuantity,
          pendingAmount: product.pendingAmount,
        }));

  return (
    <Modal state={modal}>
      <Modal.Backdrop isDismissable>
        <Modal.Container placement="center" size="lg" scroll="inside">
          <Modal.Dialog className="!max-w-3xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon>
                <Persons width={20} height={20} />
              </Modal.Icon>
              <Modal.Heading>{customer.customer.name}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              <p className="text-sm text-muted">
                {customer.customer.phone || customer.customer.email || "Sin contacto"}{" "}
                · Último turno {formatDate(customer.lastOrderAt)}
              </p>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="rounded-2xl border border-separator bg-surface-secondary/25 p-3">
                  <p className="text-xs text-muted">Turnos</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{customer.ordersCount}</p>
                </div>
                <div className="rounded-2xl border border-separator bg-surface-secondary/25 p-3">
                  <p className="text-xs text-muted">Total</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    {formatMoney(segments.revenueTotal)}
                  </p>
                </div>
                <div className="rounded-2xl border border-separator bg-surface-secondary/25 p-3">
                  <p className="text-xs text-muted">Pagado</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatMoney(segments.liquidado)}
                  </p>
                </div>
                <div className="rounded-2xl border border-separator bg-surface-secondary/25 p-3">
                  <p className="text-xs text-muted">Abonado</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    {formatMoney(segments.abonado)}
                  </p>
                </div>
                <div className="rounded-2xl border border-separator bg-surface-secondary/25 p-3">
                  <p className="text-xs text-muted">No pagado</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-danger">
                    {formatMoney(segments.deuda)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-separator">
                <div className="border-b border-separator px-4 py-3">
                  <p className="text-sm font-semibold">Productos y servicios pedidos</p>
                  <p className="text-xs text-muted">
                    Lo que este cliente ha contratado o comprado
                  </p>
                </div>
                {items.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted">
                    Sin productos ni servicios asociados a este cliente.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead>
                        <tr className="border-b border-separator text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                          <th className="px-4 py-2.5">Tipo</th>
                          <th className="px-3 py-2.5">Ítem</th>
                          <th className="px-3 py-2.5 text-right">Cant</th>
                          <th className="px-3 py-2.5 text-right">Monto</th>
                          <th className="px-3 py-2.5 text-right">Cant pend.</th>
                          <th className="px-4 py-2.5 text-right">Monto pend.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-separator">
                        {items.map((item) => (
                          <tr key={`${item.kind}-${item.id}`}>
                            <td className="px-4 py-2.5">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                  item.kind === "service"
                                    ? "bg-accent/15 text-accent"
                                    : "bg-surface-secondary text-muted"
                                }`}
                              >
                                {item.kind === "service" ? "Servicio" : "Producto"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-medium">{item.name}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {item.totalQuantity}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {formatMoney(item.totalAmount)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {item.pendingQuantity}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-danger">
                              {formatMoney(item.pendingAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Cerrar
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export function CustomersSalesTable({ branchId = null }: CustomersSalesTableProps) {
  const theme = useChartThemeColors();
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (typeof branchId === "number") {
      params.set("branchId", String(branchId));
    }

    setLoading(true);
    setError(null);

    fetch(
      apiUrl(
        `/api/finance/customers-summary${params.toString() ? `?${params.toString()}` : ""}`,
      ),
      {
        credentials: "include",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message || "No se pudo cargar el resumen de clientes");
        }
        return (await response.json()) as CustomersResponse;
      })
      .then((payload) => setData(payload))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Error al cargar clientes");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [branchId]);

  const filtered = useMemo(() => {
    const rows = data?.customers ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.customer.name,
        row.customer.phone,
        row.customer.email,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, search]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const debtDiff = Number(b.debe || 0) - Number(a.debe || 0);
        if (debtDiff !== 0) return debtDiff;
        return Number(b.revenueTotal || 0) - Number(a.revenueTotal || 0);
      }),
    [filtered],
  );

  const totals = useMemo(() => {
    return sorted.reduce(
      (acc, customer) => {
        const segments = buildChartSegments(customer);
        return {
          clients: acc.clients + 1,
          total: acc.total + segments.revenueTotal,
          cobrable: acc.cobrable + segments.cobrable,
          abonado: acc.abonado + segments.abonado,
          debt: acc.debt + segments.deuda,
        };
      },
      { clients: 0, total: 0, cobrable: 0, abonado: 0, debt: 0 },
    );
  }, [sorted]);

  const chartData = useMemo(
    () =>
      sorted.slice(0, CHART_TOP_N).map((row) => {
        const segments = buildChartSegments(row);
        return {
          id: row.customerId,
          label: truncateLabel(row.customer.name),
          fullName: row.customer.name,
          liquidado: segments.liquidado,
          abonado: segments.abonado,
          deuda: segments.deuda,
          total: segments.revenueTotal,
        };
      }),
    [sorted],
  );

  const openCustomer = (customerId: number) => {
    const row = sorted.find((item) => item.customerId === customerId) ?? null;
    if (!row) return;
    setSelected(row);
    setDetailOpen(true);
  };

  const chartHeight = Math.max(220, 44 * Math.max(chartData.length, 1));

  return (
    <section className="rounded-2xl border border-separator bg-surface">
      <div className="border-b border-separator px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Persons width={18} height={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Clientes y ventas</h2>
              <p className="text-xs text-muted">
                Barras: verde pagado, azul abonado, rojo no pagado. Clic para ver
                productos y servicios.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
            <div className="rounded-xl border border-separator bg-surface-secondary/20 px-3 py-2">
              <p className="text-muted">Clientes</p>
              <p className="mt-1 font-semibold tabular-nums">{totals.clients}</p>
            </div>
            <div className="rounded-xl border border-separator bg-surface-secondary/20 px-3 py-2">
              <p className="text-muted">Total</p>
              <p className="mt-1 font-semibold tabular-nums">{formatMoney(totals.total)}</p>
            </div>
            <div className="rounded-xl border border-separator bg-surface-secondary/20 px-3 py-2">
              <p className="text-muted">Cobrable</p>
              <p className="mt-1 font-semibold tabular-nums">{formatMoney(totals.cobrable)}</p>
            </div>
            <div className="rounded-xl border border-separator bg-surface-secondary/20 px-3 py-2">
              <p className="text-muted">Abonado</p>
              <p className="mt-1 font-semibold tabular-nums">{formatMoney(totals.abonado)}</p>
            </div>
            <div className="rounded-xl border border-separator bg-surface-secondary/20 px-3 py-2">
              <p className="text-muted">No pagado</p>
              <p className="mt-1 font-semibold tabular-nums text-danger">
                {formatMoney(totals.debt)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente, teléfono o correo"
            className="w-full rounded-xl border border-separator bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-700 dark:text-emerald-300">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: SEGMENT_COLORS.liquidado }}
            />
            Pagado
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2.5 py-1 font-semibold text-blue-700 dark:text-blue-300">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: SEGMENT_COLORS.abonado }}
            />
            Abonado
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-1 font-semibold text-danger">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: SEGMENT_COLORS.deuda }}
            />
            No pagado
          </span>
        </div>
      </div>

      <div className="p-4 md:p-5">
        <p className="mb-2 text-xs text-muted">
          Estado de cuenta por cliente (top {CHART_TOP_N} por prioridad de cobro)
          {sorted.length > CHART_TOP_N ? ` · ${sorted.length} en total` : ""}
        </p>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            {error}
          </div>
        ) : chartData.length > 0 ? (
          <div className="rounded-2xl border border-separator bg-surface-secondary/10 p-2 md:p-3">
            <div style={{ height: chartHeight }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                >
                  <CartesianGrid
                    stroke={theme.separator}
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: theme.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      new Intl.NumberFormat("es-CL", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(Number(value))
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={120}
                    tick={{ fill: theme.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "color-mix(in srgb, var(--foreground) 6%, transparent)" }}
                    contentStyle={{
                      background: theme.surface,
                      border: `1px solid ${theme.separator}`,
                      borderRadius: "12px",
                      fontSize: 13,
                      color: theme.foreground,
                    }}
                    formatter={(value, name) => [
                      formatMoney(Number(value)),
                      name === "liquidado"
                        ? "Pagado"
                        : name === "abonado"
                          ? "Abonado"
                          : "No pagado",
                    ]}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as
                        | { fullName?: string }
                        | undefined;
                      return row?.fullName ?? "";
                    }}
                  />
                  <Bar
                    dataKey="liquidado"
                    name="liquidado"
                    stackId="cuenta"
                    fill={SEGMENT_COLORS.liquidado}
                    radius={[0, 0, 0, 0]}
                    cursor="pointer"
                    onClick={(item) => {
                      const id = Number(
                        (item as { payload?: { id?: number } })?.payload?.id,
                      );
                      if (Number.isFinite(id)) openCustomer(id);
                    }}
                  />
                  <Bar
                    dataKey="abonado"
                    name="abonado"
                    stackId="cuenta"
                    fill={SEGMENT_COLORS.abonado}
                    cursor="pointer"
                    onClick={(item) => {
                      const id = Number(
                        (item as { payload?: { id?: number } })?.payload?.id,
                      );
                      if (Number.isFinite(id)) openCustomer(id);
                    }}
                  />
                  <Bar
                    dataKey="deuda"
                    name="deuda"
                    stackId="cuenta"
                    fill={SEGMENT_COLORS.deuda}
                    radius={[0, 6, 6, 0]}
                    cursor="pointer"
                    onClick={(item) => {
                      const id = Number(
                        (item as { payload?: { id?: number } })?.payload?.id,
                      );
                      if (Number.isFinite(id)) openCustomer(id);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-separator bg-surface-secondary/15 p-6 text-sm text-muted">
            No hay clientes con ventas en el alcance actual.
          </div>
        )}
      </div>

      <CustomerDetailModal
        open={detailOpen}
        customer={selected}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
      />
    </section>
  );
}
