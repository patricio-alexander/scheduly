"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Label,
  SearchField,
  toast,
  useOverlayState,
} from "@heroui/react";
import ArrowChevronLeft from "@gravity-ui/icons/ArrowChevronLeft";
import ArrowChevronRight from "@gravity-ui/icons/ArrowChevronRight";
import ArrowChevronDown from "@gravity-ui/icons/ArrowChevronDown";
import ListCheck from "@gravity-ui/icons/ListCheck";
import Plus from "@gravity-ui/icons/Plus";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import {
  ORDER_SEVERITY_META,
  type OrderSeverity,
} from "@/shared/utils/order-status";
import { CustomerOrderDialog } from "./CustomerOrderDialog";
import { SupplierOrderDialog } from "./SupplierOrderDialog";

type CalendarOrder = {
  id: number;
  orderKind: "customer" | "supplier";
  date: string;
  dateKey: string;
  status: string;
  severity: OrderSeverity;
  hasCreditDue: boolean;
  partyName: string;
  total: number;
  itemsSummary: string;
  paidPct?: number;
  deliveredPct?: number;
  statusLabel?: string;
  notes?: string | null;
  invoiceNumber?: string | null;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    paidAt?: string | null;
    deliveredAt?: string | null;
  }>;
};

type FilterKind = "all" | "customer" | "supplier";

type GridCell = { date: Date | null; key: string };

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const SEVERITIES = [0, 1, 2, 3] as const;

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("es-EC", {
    month: "long",
    year: "numeric",
  });
}

function buildGrid(year: number, month: number): GridCell[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const cells: GridCell[] = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ date: null, key: `pad-${i}` });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(year, month, d);
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date, key });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, key: `pad-end-${cells.length}` });
  }
  return cells;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ProgressBar({
  label,
  pct,
  tone,
}: {
  label: string;
  pct: number;
  tone: "accent" | "gold" | "success";
}) {
  const color =
    tone === "gold"
      ? "bg-[var(--warning)]"
      : tone === "success"
        ? "bg-success"
        : "bg-accent";
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-0.5 flex justify-between text-[10px] leading-none text-muted">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(pct)}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-black/25">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: CalendarOrder }) {
  const [open, setOpen] = useState(false);
  const meta = ORDER_SEVERITY_META[order.severity];
  const isSupplier = order.orderKind === "supplier";
  const title = isSupplier ? `Proveedor: ${order.partyName}` : order.partyName;
  const paidPct = order.paidPct ?? (order.severity >= 2 ? 100 : 0);
  const deliveredPct =
    order.deliveredPct ??
    (order.severity === 1 || order.severity === 3 ? 100 : 0);
  const unpaidAmount =
    paidPct >= 100 ? 0 : Math.max(0, order.total * (1 - paidPct / 100));
  const deliveredCount = order.items.filter((item) => item.deliveredAt).length;
  const itemCount = order.items.length;
  const cobroLabel =
    unpaidAmount <= 0
      ? "Liquidado"
      : unpaidAmount < order.total
        ? `Parcial (${formatMoney(unpaidAmount)} pendiente)`
        : "Pendiente";

  return (
    <article className={`overflow-hidden rounded-xl border ${meta.cardClass}`}>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="truncate text-[13px] font-bold leading-tight">{title}</p>
            <span
              className={`shrink-0 rounded px-1.5 py-px text-[10px] font-semibold ${meta.colorClass}`}
            >
              {order.statusLabel ?? meta.label}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted">
            Pedido #{order.id} · Total {formatMoney(order.total)}
            {unpaidAmount > 0 ? (
              <>
                {" "}
                · Por cobrar:{" "}
                <span className="font-bold text-[var(--warning)]">
                  {formatMoney(unpaidAmount)}
                </span>
              </>
            ) : (
              <span className="font-semibold text-success"> · Cobrado</span>
            )}
          </p>
          <div className="mt-1.5 flex max-w-sm gap-2">
            {isSupplier ? (
              <>
                <ProgressBar label="Pago" pct={paidPct} tone="gold" />
                <ProgressBar label="Recepción" pct={deliveredPct} tone="success" />
              </>
            ) : (
              <>
                <ProgressBar label="Cobro" pct={paidPct} tone="gold" />
                <ProgressBar label="Entrega" pct={deliveredPct} tone="accent" />
              </>
            )}
          </div>
        </div>
        <ArrowChevronDown
          width={16}
          height={16}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="border-t border-separator/50 bg-black/15 px-3 py-2">
          <div className="mb-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
            <span>
              {isSupplier ? "Pago" : "Cobro"}:{" "}
              <span className="text-foreground">{cobroLabel}</span>
            </span>
            <span>
              {isSupplier ? "Recepción" : "Entrega"}:{" "}
              <span className="text-foreground">
                {itemCount > 0
                  ? `${deliveredCount}/${itemCount}`
                  : `${Math.round(deliveredPct)}%`}
              </span>
            </span>
            {order.invoiceNumber ? (
              <span>
                Factura:{" "}
                <span className="text-foreground">{order.invoiceNumber}</span>
              </span>
            ) : null}
          </div>
          {order.notes ? (
            <p className="mb-1.5 text-[11px] text-muted">
              Notas: {order.notes.replace(/^\[PEDIDO\]\s*(\[CREDITO\]\s*)?/, "")}
            </p>
          ) : null}
          {order.items.length === 0 ? (
            <p className="text-[11px] text-muted">Sin detalle de productos</p>
          ) : (
            <>
              <ul className="space-y-0.5">
                {order.items.map((item) => {
                  const line = item.price * item.quantity;
                  return (
                    <li
                      key={item.id}
                      className="text-[12px] leading-snug text-foreground"
                    >
                      • {item.name} — {item.quantity} u. ×{" "}
                      {formatMoney(item.price)} = {formatMoney(line)}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-1.5 space-y-0.5 text-[12px]">
                <p className="font-bold">
                  Total pedido: {formatMoney(order.total)}
                </p>
                <p className="text-muted">
                  Por {isSupplier ? "pagar" : "cobrar"}:{" "}
                  {formatMoney(unpaidAmount)} ·{" "}
                  {isSupplier ? "Recepción" : "Entrega"}{" "}
                  {itemCount > 0
                    ? `${deliveredCount}/${itemCount}`
                    : `${Math.round(deliveredPct)}%`}
                </p>
              </div>
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function OrdersCalendar() {
  const customerModal = useOverlayState();
  const supplierModal = useOverlayState();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [filter, setFilter] = useState<FilterKind>("all");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<CalendarOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthParam = `${year}-${String(month + 1).padStart(2, "0")}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/orders/calendar?month=${encodeURIComponent(monthParam)}`),
      );
      if (!res.ok) throw new Error("No se pudo cargar pedidos");
      const data = (await res.json()) as { orders: CalendarOrder[] };
      setOrders(data.orders ?? []);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [monthParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (
        order.orderKind === "customer" &&
        order.partyName.toLowerCase().includes("consumidor final")
      ) {
        return false;
      }
      if (filter === "customer" && order.orderKind !== "customer") return false;
      if (filter === "supplier" && order.orderKind !== "supplier") return false;
      if (!q) return true;
      return (
        order.partyName.toLowerCase().includes(q) ||
        order.itemsSummary.toLowerCase().includes(q) ||
        String(order.id).includes(q)
      );
    });
  }, [orders, filter, search]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarOrder[]>();
    for (const order of filtered) {
      if (!order.dateKey.startsWith(monthParam)) continue;
      const list = map.get(order.dateKey) ?? [];
      list.push(order);
      map.set(order.dateKey, list);
    }
    return map;
  }, [filtered, monthParam]);

  const dayOrders = selectedDay ? (byDay.get(selectedDay) ?? []) : [];
  const weeks = useMemo(() => {
    const grid = buildGrid(year, month);
    const rows: GridCell[][] = [];
    for (let i = 0; i < grid.length; i += 7) {
      rows.push(grid.slice(i, i + 7));
    }
    return rows;
  }, [year, month]);

  const goPrev = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
    setSelectedDay(null);
  };

  const goNext = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
    setSelectedDay(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <ListCheck width={24} height={24} className="text-accent" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Pedidos</h1>
            <p className="text-sm text-muted">
              Calendario de pedidos a clientes y compras a proveedores.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onPress={() => customerModal.open()}>
            <Plus width={14} height={14} />
            Pedido cliente
          </Button>
          <Button variant="secondary" onPress={() => supplierModal.open()}>
            <Plus width={14} height={14} />
            Pedido proveedor
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button isIconOnly size="sm" variant="secondary" onPress={goPrev}>
          <ArrowChevronLeft width={16} height={16} />
        </Button>
        <p className="min-w-[9rem] text-center text-sm font-semibold capitalize">
          {monthLabel(year, month)}
        </p>
        <Button isIconOnly size="sm" variant="secondary" onPress={goNext}>
          <ArrowChevronRight width={16} height={16} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => {
            const d = new Date();
            setYear(d.getFullYear());
            setMonth(d.getMonth());
            setSelectedDay(todayKey());
          }}
        >
          Hoy
        </Button>

        <div className="ml-auto inline-flex overflow-hidden rounded-xl border border-separator">
          {(
            [
              ["all", "Todos"],
              ["customer", "Clientes"],
              ["supplier", "Proveedores"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`px-3 py-1.5 text-xs font-semibold ${
                filter === id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:bg-surface-secondary"
              }`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <SearchField
        aria-label="Buscar pedidos"
        value={search}
        onChange={setSearch}
      >
        <Label>Buscar</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Buscar cliente, proveedor o producto..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        {SEVERITIES.map((sev) => (
          <span key={sev} className="inline-flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${ORDER_SEVERITY_META[sev].chipClass}`}
            />
            {ORDER_SEVERITY_META[sev].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]" />
          Cuota / crédito a pagar
        </span>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-separator bg-surface/80">
          <div className="grid grid-cols-7 border-b border-separator bg-surface-secondary/50">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-[11px] font-semibold text-muted"
              >
                {day}
              </div>
            ))}
          </div>
          {weeks.map((week, weekIndex) => {
            const weekHasSelected = Boolean(
              selectedDay && week.some((cell) => cell.key === selectedDay),
            );
            return (
              <div key={`week-${weekIndex}`}>
                <div className="grid grid-cols-7">
                  {week.map((cell) => {
                    if (!cell.date) {
                      return (
                        <div
                          key={cell.key}
                          className="min-h-[4.75rem] border-b border-r border-separator/40 bg-surface-secondary/10"
                        />
                      );
                    }
                    const dayList = byDay.get(cell.key) ?? [];
                    const customers = dayList.filter(
                      (o) => o.orderKind === "customer",
                    ).length;
                    const suppliers = dayList.filter(
                      (o) => o.orderKind === "supplier",
                    ).length;
                    const worst =
                      dayList.length > 0
                        ? (Math.min(
                            ...dayList.map((o) => o.severity),
                          ) as OrderSeverity)
                        : null;
                    const hasCredit = dayList.some((o) => o.hasCreditDue);
                    const selected = selectedDay === cell.key;
                    const isToday = cell.key === todayKey();
                    let pillText = "";
                    if (dayList.length) {
                      if (filter === "all" && customers && suppliers) {
                        pillText = `${customers} cli · ${suppliers} prov`;
                      } else {
                        pillText = `${dayList.length} ped.`;
                      }
                    }

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={() =>
                          setSelectedDay((prev) =>
                            prev === cell.key ? null : cell.key,
                          )
                        }
                        className={`min-h-[4.75rem] border-b border-r border-separator/40 p-1.5 text-left transition-colors hover:bg-accent/5 ${
                          selected
                            ? "bg-accent/12 ring-1 ring-inset ring-accent/40"
                            : ""
                        }`}
                      >
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            isToday
                              ? "bg-accent text-accent-foreground"
                              : "text-muted"
                          }`}
                        >
                          {cell.date.getDate()}
                        </span>
                        {pillText ? (
                          <span
                            className={`mt-1 block truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                              hasCredit
                                ? "bg-[var(--warning)] text-[var(--warning-foreground)]"
                                : worst != null
                                  ? ORDER_SEVERITY_META[worst].colorClass
                                  : "bg-surface-secondary"
                            }`}
                          >
                            {pillText}
                            {hasCredit ? " · cuota" : ""}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {weekHasSelected && selectedDay ? (
                  <section className="border-b border-separator bg-accent/5 px-3 py-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-bold capitalize">
                        {new Date(`${selectedDay}T12:00:00`).toLocaleDateString(
                          "es-EC",
                          {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          },
                        )}
                        <span className="ml-2 font-normal text-muted">
                          ({dayOrders.length} pedido
                          {dayOrders.length === 1 ? "" : "s"})
                        </span>
                      </h2>
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => setSelectedDay(null)}
                      >
                        Cerrar
                      </Button>
                    </div>
                    {dayOrders.length === 0 ? (
                      <p className="text-sm text-muted">Sin pedidos este día.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {dayOrders.map((order) => (
                          <OrderCard
                            key={`${order.orderKind}-${order.id}`}
                            order={order}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <CustomerOrderDialog
        state={customerModal}
        defaultDate={selectedDay ?? undefined}
        onSuccess={() => void load()}
      />
      <SupplierOrderDialog
        state={supplierModal}
        defaultDate={selectedDay ?? undefined}
        onSuccess={() => void load()}
      />
    </div>
  );
}
