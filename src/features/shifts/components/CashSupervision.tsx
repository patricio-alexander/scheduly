"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@heroui/react";
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

type DailyTab = "empleados" | "gastos";

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

type PaymentMediumTotal = {
  id: number;
  name: string;
  kind?: string;
  amount: number;
  count: number;
};

type CashSummary = {
  openingCashTotal: number;
  closingCashTotal: number;
  salesTotal: number;
  salesCash?: number;
  salesTransfer?: number;
  salesCard?: number;
  cashOutTotal: number;
  ordersCount: number;
  paymentMedia?: PaymentMediumTotal[];
};

type WeeklyReport = {
  weekStart: string;
  weekEnd: string;
  days: WeekDay[];
  summary: CashSummary;
  employees?: EmployeeProduction[];
  employeeSummary?: EmployeeProductionTotals;
};

type DailyReport = {
  date: string;
  summary: CashSummary;
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

function shortTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
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
  const [weekError, setWeekError] = useState<string | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);
  const [tab, setTab] = useState<DailyTab>("empleados");
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const loadWeekly = useCallback(async (anchor: string, keepDate?: string) => {
    setLoadingWeek(true);
    setWeekError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/shifts/reports/weekly?date=${encodeURIComponent(anchor)}`),
      );
      if (!res.ok) throw new Error("No se pudo cargar la semana");
      const data = (await res.json()) as WeeklyReport;
      setWeekly(data);
      const keep = keepDate && data.days.some((day) => day.date === keepDate);
      if (!keep) {
        const today = todayKey();
        const todayInWeek = data.days.some((day) => day.date === today);
        setSelectedDate(todayInWeek ? today : data.days[0]?.date ?? anchor);
      }
    } catch (err) {
      setWeekError(
        err instanceof Error ? err.message : "No se pudo cargar la semana",
      );
      setWeekly(null);
    } finally {
      setLoadingWeek(false);
    }
  }, []);

  const loadDaily = useCallback(async (date: string) => {
    setLoadingDay(true);
    setDayError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/shifts/reports/daily?date=${encodeURIComponent(date)}`),
      );
      if (!res.ok) throw new Error("No se pudo cargar el día");
      setDaily((await res.json()) as DailyReport);
    } catch (err) {
      setDayError(
        err instanceof Error ? err.message : "No se pudo cargar el día",
      );
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
      <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
        Solo dueño/administración pueden ver la supervisión de caja.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight">
            Supervisión de caja
          </h1>
          <p className="text-[11px] text-muted">
            Ventas, gastos y comisiones del local
          </p>
        </div>

        <div className="dashboard-period" role="group" aria-label="Periodo">
          <button
            type="button"
            aria-pressed={view === "week"}
            className={`dashboard-period__btn !px-3 !py-1 ${
              view === "week" ? "dashboard-period__btn--active" : ""
            }`}
            onClick={() => setView("week")}
          >
            Semana
          </button>
          <button
            type="button"
            aria-pressed={view === "day"}
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
          <p
            aria-live="polite"
            className="min-w-[8.5rem] text-center text-xs font-semibold capitalize"
          >
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
          error={weekError}
          selectedDate={selectedDate}
          onOpenDay={openDay}
          onRetry={() => void loadWeekly(weekAnchor, selectedDateRef.current)}
        />
      ) : (
        <DailyView
          weekly={weekly}
          daily={daily}
          loading={loadingDay}
          error={dayError}
          selectedDate={selectedDate}
          tab={tab}
          onTab={setTab}
          onOpenDay={openDay}
          onRetry={() => void loadDaily(selectedDate)}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
  primary = false,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "accent" | "success" | "danger" | "warning";
  primary?: boolean;
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-danger"
          : tone === "warning"
            ? "text-warning"
            : "";
  return (
    <div className={`cash-metric ${primary ? "cash-metric--primary" : ""}`}>
      <span className="cash-metric__label">{label}</span>
      <span
        className={`cash-metric__value ${
          primary ? "cash-metric__value--xl" : ""
        } ${toneClass}`}
      >
        {formatMoney(value)}
      </span>
      {hint ? <span className="cash-metric__hint">{hint}</span> : null}
    </div>
  );
}

function fallbackMedia(summary: CashSummary): PaymentMediumTotal[] {
  return [
    {
      id: -1,
      name: "Efectivo",
      kind: "cash",
      amount: Number(summary.salesCash ?? 0),
      count: 0,
    },
    {
      id: -2,
      name: "Tarjeta",
      kind: "card",
      amount: Number(summary.salesCard ?? 0),
      count: 0,
    },
    {
      id: -3,
      name: "Transferencia",
      kind: "transfer",
      amount: Number(summary.salesTransfer ?? 0),
      count: 0,
    },
  ];
}

function isMoneyMedium(kind?: string) {
  const value = String(kind || "").toLowerCase();
  return value === "cash" || value === "card" || value === "transfer";
}

function MetricsBar({
  summary,
  commissions,
  tickets,
}: {
  summary: CashSummary;
  commissions: number;
  tickets?: number;
}) {
  const sales = summary.salesTotal;
  const expenses = summary.cashOutTotal;
  const net = sales - expenses;
  const orders = tickets ?? summary.ordersCount;
  const media = (
    summary.paymentMedia && summary.paymentMedia.length > 0
      ? summary.paymentMedia
      : fallbackMedia(summary)
  ).filter((medium) => isMoneyMedium(medium.kind));
  const mediaTotal = media.reduce((sum, item) => sum + item.amount, 0);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="cash-metrics">
        <Metric
          primary
          label="Ventas"
          value={sales}
          hint={
            orders
              ? `${orders} venta${orders === 1 ? "" : "s"}`
              : undefined
          }
          tone="accent"
        />
        <Metric
          label="Gastos"
          value={expenses}
          hint={expenses > 0 ? "Salidas de caja" : "Sin egresos"}
          tone="danger"
        />
        <Metric
          label="Neto"
          value={net}
          hint="Ventas − gastos"
          tone={net >= 0 ? "success" : "danger"}
        />
        <Metric
          label="Comisiones"
          value={commissions}
          hint={
            tickets
              ? `${tickets} ticket${tickets === 1 ? "" : "s"}`
              : undefined
          }
          tone="warning"
        />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        Medios de pago
      </p>
      <div className="cash-methods">
        {media.map((medium) => {
          const share =
            mediaTotal > 0 ? Math.round((medium.amount / mediaTotal) * 100) : 0;
          return (
            <Metric
              key={medium.id}
              label={medium.name}
              value={medium.amount}
              hint={
                medium.count > 0
                  ? `${medium.count} cobro${medium.count === 1 ? "" : "s"} · ${share}%`
                  : mediaTotal > 0
                    ? `${share}%`
                    : "Sin cobros"
              }
              tone={medium.amount > 0 ? "accent" : undefined}
            />
          );
        })}
      </div>
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
        const future = day.date > todayKey();
        return (
          <button
            key={day.date}
            type="button"
            aria-current={selected ? "date" : undefined}
            title={`${day.weekday} ${day.dateLabel} · ventas ${formatMoney(day.salesTotal)}`}
            className={`cash-day-chip ${selected ? "cash-day-chip--active" : ""} ${
              future && !selected ? "cash-day-chip--empty" : ""
            }`}
            onClick={() => onOpenDay(day.date)}
          >
            {isToday ? <span className="cash-day-chip__today" aria-hidden /> : null}
            <p className="text-[9px] font-semibold uppercase leading-none text-muted">
              {day.weekdayShort}
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

function PanelSkeleton({
  rows = 5,
  showStrip = false,
}: {
  rows?: number;
  showStrip?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        <div className="cash-metrics">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="cash-skeleton h-9" />
          ))}
        </div>
        <div className="cash-methods">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="cash-skeleton h-9" />
          ))}
        </div>
      </div>
      {showStrip ? (
        <div className="cash-day-strip">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="cash-skeleton h-10" />
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5 pt-1">

        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="cash-skeleton h-5" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <p className="text-xs text-danger">{message}</p>
      <Button size="sm" variant="secondary" onPress={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

function TabButton({
  active,
  count,
  label,
  tab,
  onPress,
}: {
  active: boolean;
  count: number;
  label: string;
  tab: DailyTab;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`cash-tab-${tab}`}
      aria-selected={active}
      aria-controls="cash-tabpanel"
      className={`dashboard-period__btn !px-2.5 !py-1 ${
        active ? "dashboard-period__btn--active" : ""
      }`}
      onClick={onPress}
    >
      {label}
      <span className="ml-1 text-[10px] text-muted">{count}</span>
    </button>
  );
}

function WeeklyView({
  weekly,
  loading,
  error,
  selectedDate,
  onOpenDay,
  onRetry,
}: {
  weekly: WeeklyReport | null;
  loading: boolean;
  error: string | null;
  selectedDate: string;
  onOpenDay: (date: string) => void;
  onRetry: () => void;
}) {
  return (
    <section className="cash-card">
      {loading ? (
        <PanelSkeleton rows={6} showStrip />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : !weekly ? (
        <p className="py-6 text-center text-xs text-muted">Sin datos</p>
      ) : (
        <>
          <MetricsBar
            summary={weekly.summary}
            commissions={weekly.employeeSummary?.total ?? 0}
            tickets={weekly.employeeSummary?.ticketsCount}
          />
          <p className="cash-formula mt-1.5">
            <span>Ventas {formatMoney(weekly.summary.salesTotal)}</span>
            <span aria-hidden>−</span>
            <span>gastos {formatMoney(weekly.summary.cashOutTotal)}</span>
            <span aria-hidden>=</span>
            <span className="font-semibold text-success">
              neto{" "}
              {formatMoney(
                weekly.summary.salesTotal - weekly.summary.cashOutTotal,
              )}
            </span>
          </p>
          <div className="mt-2">
            <DayStrip
              days={weekly.days}
              selectedDate={selectedDate}
              onOpenDay={onOpenDay}
              showAmounts
            />
            <p className="mt-1 text-[10px] text-muted">
              Ventas por día · tocá un día para ver el detalle
            </p>
          </div>
          <div className="mt-2 border-t border-separator pt-2">
            <EmployeeProductionPanel
              key={weekly.weekStart}
              employees={weekly.employees ?? []}
              summary={weekly.employeeSummary ?? null}
            />
          </div>
        </>
      )}
    </section>
  );
}

function DailyView({
  weekly,
  daily,
  loading,
  error,
  selectedDate,
  tab,
  onTab,
  onOpenDay,
  onRetry,
}: {
  weekly: WeeklyReport | null;
  daily: DailyReport | null;
  loading: boolean;
  error: string | null;
  selectedDate: string;
  tab: DailyTab;
  onTab: (tab: DailyTab) => void;
  onOpenDay: (date: string) => void;
  onRetry: () => void;
}) {
  return (
    <section className="cash-card">
      {weekly?.days?.length ? (
        <DayStrip
          days={weekly.days}
          selectedDate={selectedDate}
          onOpenDay={onOpenDay}
        />
      ) : null}

      {loading ? (
        <div className="mt-2">
          <PanelSkeleton rows={5} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : !daily ? (
        <p className="py-6 text-center text-xs text-muted">Sin datos del día</p>
      ) : (
        <>
          <div className="mt-2">
            <MetricsBar
              summary={daily.summary}
              commissions={daily.employeeSummary?.total ?? 0}
              tickets={daily.employeeSummary?.ticketsCount}
            />
          </div>

          <p className="cash-formula mt-1.5">
            <span>
              Caja inicial {formatMoney(daily.summary.openingCashTotal)}
            </span>
            <span aria-hidden>+</span>
            <span>ventas {formatMoney(daily.summary.salesTotal)}</span>
            <span aria-hidden>=</span>
            <span className="font-semibold text-warning">
              cierre {formatMoney(daily.summary.closingCashTotal)}
            </span>
          </p>

          <div
            className="dashboard-period mt-2 w-full"
            role="tablist"
            aria-label="Detalle del día"
          >
            <TabButton
              label="Empleados"
              tab="empleados"
              count={daily.employees?.length ?? 0}
              active={tab === "empleados"}
              onPress={() => onTab("empleados")}
            />
            <TabButton
              label="Gastos"
              tab="gastos"
              count={daily.outflows.length}
              active={tab === "gastos"}
              onPress={() => onTab("gastos")}
            />
          </div>

          <div
            className="mt-2"
            role="tabpanel"
            id="cash-tabpanel"
            aria-labelledby={`cash-tab-${tab}`}
          >
            {tab === "empleados" ? (
              <EmployeeProductionPanel
                key={daily.date}
                employees={daily.employees ?? []}
                summary={daily.employeeSummary ?? null}
                showTickets
              />
            ) : (
              <OutflowsTable outflows={daily.outflows} />
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

function OutflowsTable({
  outflows,
}: {
  outflows: NonNullable<DailyReport["outflows"]>;
}) {
  if (outflows.length === 0) {
    return <p className="py-5 text-center text-xs text-muted">Sin gastos</p>;
  }

  const total = outflows.reduce((sum, movement) => sum + movement.amount, 0);

  return (
    <div className="cash-scroll">
      <table className="cash-table">
        <thead>
          <tr>
            <th className="w-12">Hora</th>
            <th>Concepto</th>
            <th className="text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {outflows.map((movement) => (
            <tr key={movement.id} className="cash-row">
              <td className="whitespace-nowrap tabular-nums text-muted">
                {shortTime(movement.createdAt)}
              </td>
              <td>
                {movement.categoryLabel}
                {movement.concept ? ` · ${movement.concept}` : ""}
                <span className="ml-1 text-muted">{movement.operatorName}</span>
              </td>
              <td className="text-right font-semibold tabular-nums text-danger">
                −{formatMoney(movement.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Total gastos</td>
            <td className="text-right tabular-nums text-danger">
              −{formatMoney(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

