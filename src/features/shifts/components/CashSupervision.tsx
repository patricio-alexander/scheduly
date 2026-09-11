"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, toast } from "@heroui/react";
import ArrowChevronLeft from "@gravity-ui/icons/ArrowChevronLeft";
import ArrowChevronRight from "@gravity-ui/icons/ArrowChevronRight";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { useAuth } from "@/src/features/auth";
import { isManagementRole } from "@/shared/utils/roles";
import { EmployeeProductionPanel } from "./EmployeeProductionPanel";
import type {
  EmployeeProduction,
  EmployeeProductionTotals,
} from "./EmployeeProductionPanel";

type PeriodView = "week" | "day";

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
  employees?: EmployeeProduction[];
  employeeSummary?: EmployeeProductionTotals;
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
  employeeSummary?: EmployeeProductionTotals;
  employees?: EmployeeProduction[];
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
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

function dayNumber(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).getDate();
}

export function CashSupervision() {
  const { user } = useAuth();
  const canView = user ? isManagementRole(user.role) : false;

  const [view, setView] = useState<PeriodView>("day");
  const [weekAnchor, setWeekAnchor] = useState(todayKey);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [loadingDay, setLoadingDay] = useState(true);
  const [tab, setTab] = useState<"empleados" | "gastos" | "ventas">(
    "empleados",
  );
  const [expandedSale, setExpandedSale] = useState<number | null>(null);
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const loadWeekly = useCallback(async (anchor: string, keepDate?: string) => {
    setLoadingWeek(true);
    try {
      const res = await fetch(
        apiUrl(`/api/shifts/reports/weekly?date=${encodeURIComponent(anchor)}`),
      );
      if (!res.ok) throw new Error("No se pudo cargar la semana");
      const data = (await res.json()) as WeeklyReport;
      setWeekly(data);
      const keep =
        keepDate && data.days.some((day) => day.date === keepDate);
      if (!keep) {
        const today = todayKey();
        const todayInWeek = data.days.some((day) => day.date === today);
        setSelectedDate(todayInWeek ? today : data.days[0]?.date ?? anchor);
      }
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
    void loadWeekly(weekAnchor, selectedDateRef.current);
  }, [canView, weekAnchor, loadWeekly]);

  useEffect(() => {
    if (!canView || view !== "day" || !selectedDate) return;
    void loadDaily(selectedDate);
  }, [canView, view, selectedDate, loadDaily]);

  const weekLabel = useMemo(() => {
    if (!weekly) return "—";
    return formatWeekRange(weekly.weekStart, weekly.weekEnd);
  }, [weekly]);

  const openDay = useCallback(
    (date: string) => {
      setSelectedDate(date);
      if (weekly && !weekly.days.some((day) => day.date === date)) {
        setWeekAnchor(date);
      }
      setView("day");
    },
    [weekly],
  );

  const shiftPeriod = (delta: number) => {
    if (view === "week") {
      setWeekAnchor((date) => addDays(date, delta * 7));
      return;
    }
    const next = addDays(selectedDate, delta);
    setSelectedDate(next);
    if (weekly && !weekly.days.some((day) => day.date === next)) {
      setWeekAnchor(next);
    }
  };

  const goToday = () => {
    const today = todayKey();
    setSelectedDate(today);
    setWeekAnchor(today);
  };

  const showingToday =
    view === "day"
      ? selectedDate === todayKey()
      : Boolean(weekly?.days.some((day) => day.date === todayKey()));

  if (!user) return null;

  if (!canView) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
        Solo dueño/administración pueden ver la supervisión de caja.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg font-bold tracking-tight">
          Supervisión de caja
        </h1>
        <div className="dashboard-period">
          <button
            type="button"
            className={`dashboard-period__btn !px-3 !py-1 ${
              view === "week" ? "dashboard-period__btn--active" : ""
            }`}
            onClick={() => setView("week")}
          >
            Semana
          </button>
          <button
            type="button"
            className={`dashboard-period__btn !px-3 !py-1 ${
              view === "day" ? "dashboard-period__btn--active" : ""
            }`}
            onClick={() => setView("day")}
          >
            Día
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="secondary"
            aria-label={view === "week" ? "Semana anterior" : "Día anterior"}
            onPress={() => shiftPeriod(-1)}
          >
            <ArrowChevronLeft width={14} height={14} />
          </Button>
          <p className="min-w-[7.5rem] text-center text-xs font-semibold capitalize">
            {view === "week" ? weekLabel : formatDayTitle(selectedDate)}
          </p>
          <Button
            isIconOnly
            size="sm"
            variant="secondary"
            aria-label={view === "week" ? "Semana siguiente" : "Día siguiente"}
            onPress={() => shiftPeriod(1)}
          >
            <ArrowChevronRight width={14} height={14} />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            isDisabled={showingToday}
            onPress={goToday}
          >
            Hoy
          </Button>
        </div>
      </div>

      {view === "week" ? (
        <WeeklyView
          weekly={weekly}
          loading={loadingWeek}
          selectedDate={selectedDate}
          onOpenDay={openDay}
        />
      ) : (
        <DailyView
          weekly={weekly}
          daily={daily}
          loading={loadingDay}
          selectedDate={selectedDate}
          tab={tab}
          onTab={setTab}
          onOpenDay={openDay}
          expandedSale={expandedSale}
          onExpandSale={setExpandedSale}
        />
      )}
    </div>
  );
}

function MetricsBar({
  commissions,
  services,
  products,
  expenses,
}: {
  commissions: number;
  services: number;
  products: number;
  expenses: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
      <span>
        <span className="text-muted">Comisiones </span>
        <span className="font-bold tabular-nums">{formatMoney(commissions)}</span>
      </span>
      <span className="text-accent">
        Se <span className="font-semibold tabular-nums">{formatMoney(services)}</span>
      </span>
      <span className="text-sky-500">
        Pr <span className="font-semibold tabular-nums">{formatMoney(products)}</span>
      </span>
      <span className="text-danger">
        Gastos{" "}
        <span className="font-semibold tabular-nums">{formatMoney(expenses)}</span>
      </span>
    </div>
  );
}

function DayStrip({
  days,
  selectedDate,
  onOpenDay,
  showAmounts,
}: {
  days: WeekDay[];
  selectedDate: string;
  onOpenDay: (date: string) => void;
  showAmounts?: boolean;
}) {
  return (
    <div className="cash-day-strip">
      {days.map((day) => {
        const selected = day.date === selectedDate;
        const isToday = day.date === todayKey();
        return (
          <button
            key={day.date}
            type="button"
            className={`cash-day-chip ${selected ? "cash-day-chip--active" : ""}`}
            onClick={() => onOpenDay(day.date)}
          >
            <p className="text-[9px] font-semibold uppercase leading-none text-muted">
              {day.weekdayShort}
              {isToday ? "*" : ""}
            </p>
            <p className="mt-0.5 text-sm font-bold leading-none tabular-nums">
              {dayNumber(day.date)}
            </p>
            {showAmounts ? (
              <p className="mt-0.5 truncate text-[9px] tabular-nums text-success">
                {formatMoney(day.salesTotal)}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function WeeklyView({
  weekly,
  loading,
  selectedDate,
  onOpenDay,
}: {
  weekly: WeeklyReport | null;
  loading: boolean;
  selectedDate: string;
  onOpenDay: (date: string) => void;
}) {
  if (loading) {
    return <p className="py-6 text-center text-xs text-muted">Cargando…</p>;
  }
  if (!weekly) {
    return <p className="py-6 text-center text-xs text-muted">Sin datos</p>;
  }

  const commissions = weekly.employeeSummary;

  return (
    <section className="rounded-xl border border-separator bg-surface p-3">
      <MetricsBar
        commissions={commissions?.total ?? 0}
        services={commissions?.servicesTotal ?? 0}
        products={commissions?.productsTotal ?? 0}
        expenses={weekly.summary.cashOutTotal}
      />
      <div className="mt-2">
        <DayStrip
          days={weekly.days}
          selectedDate={selectedDate}
          onOpenDay={onOpenDay}
          showAmounts
        />
      </div>
      <div className="mt-2 border-t border-separator pt-2">
        <EmployeeProductionPanel
          key={weekly.weekStart}
          employees={weekly.employees ?? []}
          summary={weekly.employeeSummary ?? null}
        />
      </div>
    </section>
  );
}

function DailyView({
  weekly,
  daily,
  loading,
  selectedDate,
  tab,
  onTab,
  onOpenDay,
  expandedSale,
  onExpandSale,
}: {
  weekly: WeeklyReport | null;
  daily: DailyReport | null;
  loading: boolean;
  selectedDate: string;
  tab: "empleados" | "gastos" | "ventas";
  onTab: (tab: "empleados" | "gastos" | "ventas") => void;
  onOpenDay: (date: string) => void;
  expandedSale: number | null;
  onExpandSale: (id: number | null) => void;
}) {
  return (
    <section className="rounded-xl border border-separator bg-surface p-3">
      {weekly?.days?.length ? (
        <DayStrip
          days={weekly.days}
          selectedDate={selectedDate}
          onOpenDay={onOpenDay}
        />
      ) : null}

      {loading ? (
        <p className="py-6 text-center text-xs text-muted">Cargando…</p>
      ) : !daily ? (
        <p className="py-6 text-center text-xs text-muted">Sin datos del día</p>
      ) : (
        <>
          <div className="mt-2">
            <MetricsBar
              commissions={daily.employeeSummary?.total ?? 0}
              services={daily.employeeSummary?.servicesTotal ?? 0}
              products={daily.employeeSummary?.productsTotal ?? 0}
              expenses={daily.summary.cashOutTotal}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Caja {formatMoney(daily.summary.openingCashTotal)} + ventas{" "}
            {formatMoney(daily.summary.salesTotal)} ≈{" "}
            <span className="font-semibold text-warning">
              {formatMoney(daily.summary.closingCashTotal)}
            </span>
          </p>

          <div className="dashboard-period mt-2 w-full">
            <button
              type="button"
              className={`dashboard-period__btn !px-2.5 !py-1 ${
                tab === "empleados" ? "dashboard-period__btn--active" : ""
              }`}
              onClick={() => onTab("empleados")}
            >
              Empleados ({daily.employees?.length ?? 0})
            </button>
            <button
              type="button"
              className={`dashboard-period__btn !px-2.5 !py-1 ${
                tab === "gastos" ? "dashboard-period__btn--active" : ""
              }`}
              onClick={() => onTab("gastos")}
            >
              Gastos ({daily.outflows.length})
            </button>
            <button
              type="button"
              className={`dashboard-period__btn !px-2.5 !py-1 ${
                tab === "ventas" ? "dashboard-period__btn--active" : ""
              }`}
              onClick={() => onTab("ventas")}
            >
              Tienda ({daily.sales.length})
            </button>
          </div>

          <div className="mt-2">
            {tab === "empleados" ? (
              <EmployeeProductionPanel
                key={daily.date}
                employees={daily.employees ?? []}
                summary={daily.employeeSummary ?? null}
                showTickets
              />
            ) : tab === "gastos" ? (
              daily.outflows.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">Sin gastos</p>
              ) : (
                <table className="w-full text-xs">
                  <tbody>
                    {daily.outflows.map((movement) => (
                      <tr
                        key={movement.id}
                        className="border-b border-separator/50 last:border-0"
                      >
                        <td className="whitespace-nowrap py-1.5 text-muted">
                          {new Date(movement.createdAt).toLocaleTimeString(
                            "es-EC",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </td>
                        <td className="py-1.5">
                          {movement.categoryLabel}
                          {movement.concept ? ` · ${movement.concept}` : ""}
                          <span className="ml-1 text-muted">
                            {movement.operatorName}
                          </span>
                        </td>
                        <td className="py-1.5 text-right font-semibold tabular-nums text-danger">
                          −{formatMoney(movement.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : daily.sales.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted">
                Sin ventas de tienda
              </p>
            ) : (
              <table className="w-full text-xs">
                <tbody>
                  {daily.sales.map((sale) => {
                    const open = expandedSale === sale.id;
                    return (
                      <Fragment key={sale.id}>
                        <tr
                          className="cursor-pointer border-b border-separator/50 hover:bg-surface-secondary/40"
                          onClick={() => onExpandSale(open ? null : sale.id)}
                        >
                          <td className="whitespace-nowrap py-1.5 text-muted">
                            {new Date(sale.paidAt).toLocaleTimeString("es-EC", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="max-w-[12rem] truncate py-1.5">
                            {sale.customerName || "Cliente"}
                            <span className="ml-1 text-muted">
                              {sale.operatorName}
                            </span>
                          </td>
                          <td className="py-1.5 text-right font-semibold tabular-nums text-success">
                            {formatMoney(sale.total)}
                          </td>
                        </tr>
                        {open
                          ? sale.items.map((item) => (
                              <tr
                                key={item.id}
                                className="border-b border-separator/40 bg-surface-secondary/30"
                              >
                                <td />
                                <td className="py-1 text-muted">
                                  {item.name}
                                  {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                                </td>
                                <td className="py-1 text-right tabular-nums">
                                  {formatMoney(item.lineTotal)}
                                </td>
                              </tr>
                            ))
                          : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {daily.shifts.length > 0 ? (
            <p className="mt-2 border-t border-separator pt-2 text-[11px] text-muted">
              Cajas:{" "}
              {daily.shifts
                .map(
                  (shift) =>
                    `${shift.operatorName} ${formatMoney(shift.closingCashOnDay)}${
                      shift.status === "open" ? " (abierta)" : ""
                    }`,
                )
                .join(" · ")}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
