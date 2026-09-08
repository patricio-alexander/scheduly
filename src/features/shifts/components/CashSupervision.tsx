"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, toast } from "@heroui/react";
import ArrowChevronLeft from "@gravity-ui/icons/ArrowChevronLeft";
import ArrowChevronRight from "@gravity-ui/icons/ArrowChevronRight";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { useAuth } from "@/src/features/auth";
import { isManagementRole } from "@/shared/utils/roles";

type WeekDay = {
  date: string;
  weekday: string;
  weekdayShort: string;
  dateLabel: string;
  openingCashTotal: number;
  closingCashTotal: number;
  salesTotal: number;
  cashOutTotal: number;
  ordersCount: number;
};

type WeeklyReport = {
  weekStart: string;
  weekEnd: string;
  days: WeekDay[];
  summary: {
    openingCashTotal: number;
    closingCashTotal: number;
    salesTotal: number;
    cashOutTotal: number;
    ordersCount: number;
  };
};

type DailyReport = {
  date: string;
  summary: {
    openingCashTotal: number;
    closingCashTotal: number;
    salesTotal: number;
    cashOutTotal: number;
    ordersCount: number;
  };
  shifts: Array<{
    id: number;
    status: string;
    operatorName: string;
    openingCashOnDay: number | null;
    closingCashOnDay: number;
    salesTotalDay: number;
    cashOutDay: number;
    ordersCountDay: number;
  }>;
  outflows: Array<{
    id: number;
    shiftId: number;
    createdAt: string;
    categoryLabel: string;
    concept: string | null;
    amount: number;
    operatorName: string;
  }>;
  sales: Array<{
    id: number;
    shiftId: number | null;
    paidAt: string;
    paymentMethod: string | null;
    documentType: string | null;
    customerName: string;
    operatorName: string;
    total: number;
    items: Array<{
      id: number;
      name: string;
      quantity: number;
      price: number;
      lineTotal: number;
    }>;
  }>;
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatWeekRange(start: string, end: string) {
  try {
    const s = new Date(`${start}T12:00:00`).toLocaleDateString("es-EC", {
      day: "numeric",
      month: "short",
    });
    const e = new Date(`${end}T12:00:00`).toLocaleDateString("es-EC", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${s} – ${e}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function formatDayTitle(dateStr: string) {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString("es-EC", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "blue" | "green" | "red" | "yellow";
}) {
  const color =
    tone === "blue"
      ? "text-sky-500"
      : tone === "green"
        ? "text-success"
        : tone === "red"
          ? "text-danger"
          : tone === "yellow"
            ? "text-warning"
            : "";
  return (
    <div className="min-w-[7rem] flex-1 rounded-xl border border-separator px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`text-sm font-extrabold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

export function CashSupervision() {
  const { user } = useAuth();
  const canView = user ? isManagementRole(user.role) : false;

  const [weekAnchor, setWeekAnchor] = useState(todayKey);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [loadingDay, setLoadingDay] = useState(true);
  const [tab, setTab] = useState<"gastos" | "ventas">("gastos");
  const [expandedSale, setExpandedSale] = useState<number | null>(null);

  const loadWeekly = useCallback(async (anchor: string) => {
    setLoadingWeek(true);
    try {
      const res = await fetch(
        apiUrl(`/api/shifts/reports/weekly?date=${encodeURIComponent(anchor)}`),
      );
      if (!res.ok) throw new Error("No se pudo cargar la semana");
      const data = (await res.json()) as WeeklyReport;
      setWeekly(data);
      const today = todayKey();
      const inWeek = data.days.some((d) => d.date === today);
      setSelectedDate(inWeek ? today : data.days[0]?.date ?? anchor);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error semanal");
      setWeekly(null);
    } finally {
      setLoadingWeek(false);
    }
  }, []);

  const loadDaily = useCallback(async (date: string) => {
    setLoadingDay(true);
    setExpandedSale(null);
    try {
      const res = await fetch(
        apiUrl(`/api/shifts/reports/daily?date=${encodeURIComponent(date)}`),
      );
      if (!res.ok) throw new Error("No se pudo cargar el día");
      setDaily((await res.json()) as DailyReport);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error diario");
      setDaily(null);
    } finally {
      setLoadingDay(false);
    }
  }, []);

  useEffect(() => {
    if (!canView) return;
    void loadWeekly(weekAnchor);
  }, [canView, weekAnchor, loadWeekly]);

  useEffect(() => {
    if (!canView || !selectedDate) return;
    void loadDaily(selectedDate);
  }, [canView, selectedDate, loadDaily]);

  const weekLabel = useMemo(() => {
    if (!weekly) return "—";
    return formatWeekRange(weekly.weekStart, weekly.weekEnd);
  }, [weekly]);

  if (!user) return null;

  if (!canView) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
        Solo dueño/administración pueden ver la supervisión de caja.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <ChartColumn width={22} height={22} />
          <h1 className="text-xl font-bold tracking-tight">Supervisión de caja</h1>
        </div>
        <p className="mt-1 text-sm text-muted">
          Revisá la semana, tocá un día y mirá salidas, ventas y turnos.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          isIconOnly
          size="sm"
          variant="secondary"
          aria-label="Semana anterior"
          onPress={() => setWeekAnchor((d) => addDays(d, -7))}
        >
          <ArrowChevronLeft width={16} height={16} />
        </Button>
        <p className="min-w-[10rem] text-center text-sm font-semibold">{weekLabel}</p>
        <Button
          isIconOnly
          size="sm"
          variant="secondary"
          aria-label="Semana siguiente"
          onPress={() => setWeekAnchor((d) => addDays(d, 7))}
        >
          <ArrowChevronRight width={16} height={16} />
        </Button>
      </div>

      <section className="rounded-2xl border border-separator bg-surface p-3">
        <h2 className="mb-2 text-sm font-bold">Ganancias semanales</h2>
        {loadingWeek ? (
          <p className="py-6 text-center text-sm text-muted">Cargando semana…</p>
        ) : !weekly ? (
          <p className="py-6 text-center text-sm text-muted">Sin datos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-separator text-xs">
                <tr>
                  <th className="px-2 py-2 font-medium text-muted">Día</th>
                  <th className="px-2 py-2 font-medium text-muted">Fecha</th>
                  <th className="px-2 py-2 text-right font-semibold text-sky-500">
                    Inicial
                  </th>
                  <th className="px-2 py-2 text-right font-semibold text-success">
                    Ventas tienda
                  </th>
                  <th className="px-2 py-2 text-right font-semibold text-danger">
                    Gastos
                  </th>
                  <th className="px-2 py-2 text-right font-semibold text-warning">
                    Cierre
                  </th>
                </tr>
              </thead>
              <tbody>
                {weekly.days.map((day) => {
                  const selected = day.date === selectedDate;
                  const isToday = day.date === todayKey();
                  return (
                    <tr
                      key={day.date}
                      className={`cursor-pointer border-b border-separator/50 last:border-0 ${
                        selected ? "bg-accent/10" : "hover:bg-surface-secondary/50"
                      }`}
                      onClick={() => setSelectedDate(day.date)}
                    >
                      <td className="px-2 py-2 capitalize">
                        {day.weekdayShort}
                        {isToday ? (
                          <span className="ml-1 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                            Hoy
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-muted">{day.dateLabel}</td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums text-sky-500">
                        {formatMoney(day.openingCashTotal)}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums text-success">
                        {formatMoney(day.salesTotal)}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums text-danger">
                        {formatMoney(day.cashOutTotal)}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums text-warning">
                        {formatMoney(day.closingCashTotal)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-separator bg-surface-secondary/40 font-bold">
                  <td className="px-2 py-2" colSpan={2}>
                    Total semana
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-sky-500">
                    {formatMoney(weekly.summary.openingCashTotal)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-success">
                    {formatMoney(weekly.summary.salesTotal)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-danger">
                    {formatMoney(weekly.summary.cashOutTotal)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-warning">
                    {formatMoney(weekly.summary.closingCashTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted">
          Cierre = inicial + ventas tienda (no es el arqueo físico del cierre).
        </p>
      </section>

      <section className="rounded-2xl border border-separator bg-surface p-4">
        <h2 className="mb-1 text-sm font-bold capitalize">
          {formatDayTitle(selectedDate)}
        </h2>

        {loadingDay ? (
          <p className="py-6 text-center text-sm text-muted">Cargando día…</p>
        ) : !daily ? (
          <p className="py-6 text-center text-sm text-muted">Sin datos del día</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <SummaryChip
                label="Inicial"
                value={formatMoney(daily.summary.openingCashTotal)}
                tone="blue"
              />
              <SummaryChip
                label="Ventas tienda"
                value={formatMoney(daily.summary.salesTotal)}
                tone="green"
              />
              <SummaryChip
                label="Gastos"
                value={formatMoney(daily.summary.cashOutTotal)}
                tone="red"
              />
              <SummaryChip
                label="Cierre"
                value={formatMoney(daily.summary.closingCashTotal)}
                tone="yellow"
              />
              <SummaryChip
                label="Tickets"
                value={String(daily.summary.ordersCount)}
              />
            </div>

            <div className="mb-3 inline-flex overflow-hidden rounded-xl border border-separator">
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-semibold ${
                  tab === "gastos"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:bg-surface-secondary"
                }`}
                onClick={() => setTab("gastos")}
              >
                Gastos ({daily.outflows.length})
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-semibold ${
                  tab === "ventas"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:bg-surface-secondary"
                }`}
                onClick={() => setTab("ventas")}
              >
                Ventas ({daily.sales.length})
              </button>
            </div>

            {tab === "gastos" ? (
              <div className="mb-4 overflow-x-auto rounded-xl border border-separator">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="border-b border-separator bg-surface-secondary/40 text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Hora</th>
                      <th className="px-3 py-2 font-medium">Operador</th>
                      <th className="px-3 py-2 font-medium">Categoría</th>
                      <th className="px-3 py-2 font-medium">Concepto</th>
                      <th className="px-3 py-2 text-right font-medium">Monto</th>
                      <th className="px-3 py-2 font-medium">Turno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.outflows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-muted"
                        >
                          Sin gastos este día
                        </td>
                      </tr>
                    ) : (
                      daily.outflows.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-separator/50 last:border-0"
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleTimeString("es-EC", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="px-3 py-2">{m.operatorName}</td>
                          <td className="px-3 py-2">{m.categoryLabel}</td>
                          <td className="px-3 py-2">{m.concept || "—"}</td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums text-danger">
                            -{formatMoney(m.amount)}
                          </td>
                          <td className="px-3 py-2">#{m.shiftId}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mb-4 flex flex-col gap-2">
                {daily.sales.length === 0 ? (
                  <p className="rounded-xl border border-separator px-3 py-6 text-center text-sm text-muted">
                    Sin ventas este día
                  </p>
                ) : (
                  daily.sales.map((sale) => {
                    const open = expandedSale === sale.id;
                    return (
                      <div
                        key={sale.id}
                        className="rounded-xl border border-separator"
                      >
                        <button
                          type="button"
                          className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-secondary/40"
                          onClick={() =>
                            setExpandedSale(open ? null : sale.id)
                          }
                        >
                          <span className="font-semibold">
                            #{sale.id} ·{" "}
                            {new Date(sale.paidAt).toLocaleTimeString("es-EC", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                          <span className="text-xs text-muted">
                            {sale.documentType || "documento"} ·{" "}
                            {sale.customerName} · {sale.paymentMethod || "—"}
                          </span>
                          <span className="font-bold tabular-nums text-success">
                            {formatMoney(sale.total)}
                          </span>
                        </button>
                        {open ? (
                          <div className="border-t border-separator px-3 py-2">
                            <table className="w-full text-xs">
                              <thead className="text-muted">
                                <tr>
                                  <th className="py-1 text-left font-medium">
                                    Producto
                                  </th>
                                  <th className="py-1 text-right font-medium">
                                    Cant.
                                  </th>
                                  <th className="py-1 text-right font-medium">
                                    P. unit.
                                  </th>
                                  <th className="py-1 text-right font-medium">
                                    Subtotal
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {sale.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="py-1">{item.name}</td>
                                    <td className="py-1 text-right tabular-nums">
                                      {item.quantity}
                                    </td>
                                    <td className="py-1 text-right tabular-nums">
                                      {formatMoney(item.price)}
                                    </td>
                                    <td className="py-1 text-right tabular-nums">
                                      {formatMoney(item.lineTotal)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <h3 className="mb-2 text-sm font-bold">Turnos del día</h3>
            <div className="overflow-x-auto rounded-xl border border-separator">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="border-b border-separator bg-surface-secondary/40 text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Operador</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-3 py-2 text-right font-medium text-sky-500">
                      Inicial
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-success">
                      Ventas
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-danger">
                      Gastos
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-warning">
                      Cierre
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {daily.shifts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-center text-muted"
                      >
                        Sin turnos activos este día
                      </td>
                    </tr>
                  ) : (
                    daily.shifts.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-separator/50 last:border-0"
                      >
                        <td className="px-3 py-2">#{s.id}</td>
                        <td className="px-3 py-2">{s.operatorName}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              s.status === "open"
                                ? "bg-success/15 text-success"
                                : "bg-surface-secondary text-muted"
                            }`}
                          >
                            {s.status === "open" ? "Abierto" : "Cerrado"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-sky-500">
                          {s.openingCashOnDay == null
                            ? "—"
                            : formatMoney(s.openingCashOnDay)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-success">
                          {formatMoney(s.salesTotalDay)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-danger">
                          {formatMoney(s.cashOutDay)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-warning">
                          {formatMoney(s.closingCashOnDay)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
