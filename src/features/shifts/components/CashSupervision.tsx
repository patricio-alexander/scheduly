"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import ArrowChevronLeft from "@gravity-ui/icons/ArrowChevronLeft";
import ArrowChevronRight from "@gravity-ui/icons/ArrowChevronRight";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { useAuth } from "@/src/features/auth";
import { isManagementRole } from "@/shared/utils/roles";
import { BranchSelect, useBranches } from "@/src/features/branches";
import { EmployeeProductionPanel } from "./EmployeeProductionPanel";
import { ShiftDesk } from "./ShiftDesk";
import { CashClosePanel } from "./CashClosePanel";
import { ClosedShiftsRecap } from "./ClosedShiftsRecap";
import type {
  EmployeeProduction,
  EmployeeProductionTotals,
} from "./EmployeeProductionPanel";

type DeskSection = "apertura" | "cierre" | "cuadre";

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
  openingTransferTotal?: number;
  openingTotal?: number;
  closingCashTotal: number;
  salesTotal: number;
  salesCash?: number;
  salesTransfer?: number;
  salesCard?: number;
  servicesTotal?: number;
  productsTotal?: number;
  servicesCount?: number;
  productsCount?: number;
  cashOutTotal: number;
  cashInMovementsTotal?: number;
  ordersCount: number;
  paymentMedia?: PaymentMediumTotal[];
  openingMedia?: PaymentMediumTotal[];
  closeMedia?: PaymentMediumTotal[];
  openingByMedium?: Array<{ id: number; amount: number }>;
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
    openedAt?: string;
    closedAt?: string | null;
    openingCashOnDay: number | null;
    openingTransferOnDay?: number | null;
    closingCashOnDay: number;
    expectedCashOnDay?: number;
    countedCashOnDay?: number | null;
    salesCashDay?: number;
    salesTotalDay: number;
    cashOutDay: number;
    cashInDay?: number;
    ordersCountDay: number;
    cashDifference?: number | null;
    closingNotes?: string | null;
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
  const { branches } = useBranches();
  const activeBranches = branches.filter((b) => b.isActive);
  const canPickBranch = canView && activeBranches.length > 0;

  const [section, setSection] = useState<DeskSection>("apertura");
  const [weekAnchor, setWeekAnchor] = useState(todayKey);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [fallbackWeekly, setFallbackWeekly] = useState<WeeklyReport | null>(
    null,
  );
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [loadingDay, setLoadingDay] = useState(true);
  const [weekError, setWeekError] = useState<string | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);
  const [tab, setTab] = useState<DailyTab>("empleados");
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  useEffect(() => {
    if (branchId) return;
    const main = activeBranches.find((b) => b.isMain);
    const first = main ?? activeBranches[0];
    if (first) setBranchId(first.id);
  }, [activeBranches, branchId]);

  const loadWeekly = useCallback(
    async (anchor: string, keepDate?: string) => {
      setLoadingWeek(true);
      setWeekError(null);
      try {
        const qs = new URLSearchParams({ date: anchor });
        if (branchId) qs.set("branchId", String(branchId));
        const res = await fetch(apiUrl(`/api/shifts/reports/weekly?${qs}`));
        if (!res.ok) throw new Error("No se pudo cargar la semana");
        const data = (await res.json()) as WeeklyReport;
        setWeekly(data);
        if ((data.employees?.length ?? 0) > 0) {
          setFallbackWeekly(null);
        } else {
          const prevQs = new URLSearchParams({
            date: addDays(data.weekStart, -1),
          });
          if (branchId) prevQs.set("branchId", String(branchId));
          const prevRes = await fetch(
            apiUrl(`/api/shifts/reports/weekly?${prevQs}`),
          );
          setFallbackWeekly(
            prevRes.ok ? ((await prevRes.json()) as WeeklyReport) : null,
          );
        }
        const keep = keepDate && data.days.some((day) => day.date === keepDate);
        if (!keep) {
          const today = todayKey();
          const todayInWeek = data.days.some((day) => day.date === today);
          setSelectedDate(todayInWeek ? today : (data.days[0]?.date ?? anchor));
        }
      } catch (err) {
        setWeekError(
          err instanceof Error ? err.message : "No se pudo cargar la semana",
        );
        setWeekly(null);
        setFallbackWeekly(null);
      } finally {
        setLoadingWeek(false);
      }
    },
    [branchId],
  );

  const loadDaily = useCallback(
    async (date: string, keep = false) => {
      if (!keep) setLoadingDay(true);
      setDayError(null);
      try {
        const qs = new URLSearchParams({ date });
        if (branchId) qs.set("branchId", String(branchId));
        const res = await fetch(apiUrl(`/api/shifts/reports/daily?${qs}`));
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
    },
    [branchId],
  );

  useEffect(() => {
    if (!canView) return;
    if (activeBranches.length > 0 && !branchId) return;
    void loadWeekly(weekAnchor, selectedDateRef.current);
  }, [canView, weekAnchor, loadWeekly, activeBranches.length, branchId]);

  useEffect(() => {
    if (!canView || !selectedDate) return;
    if (activeBranches.length > 0 && !branchId) return;
    void loadDaily(selectedDate);
  }, [canView, selectedDate, loadDaily, activeBranches.length, branchId]);

  const openDay = useCallback(
    (date: string) => {
      setSelectedDate(date);
      if (weekly && !weekly.days.some((day) => day.date === date)) {
        setWeekAnchor(date);
      }
    },
    [weekly],
  );

  const shiftPeriod = (delta: number) => {
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

  const showingToday = selectedDate === todayKey();
  const commissionWeek =
    (weekly?.employees?.length ?? 0) > 0 ? weekly : fallbackWeekly;
  const commissionFromDay = (daily?.employees?.length ?? 0) > 0;
  const commissionEmployees = commissionFromDay
    ? (daily?.employees ?? [])
    : (commissionWeek?.employees ?? []);
  const commissionSummary = commissionFromDay
    ? (daily?.employeeSummary ?? null)
    : (commissionWeek?.employeeSummary ?? null);
  const commissionLabel =
    commissionFromDay || !commissionWeek
      ? null
      : `Semana ${formatWeekRange(commissionWeek.weekStart, commissionWeek.weekEnd)}`;

  if (!user) return null;

  if (!canView) {
    return <ShiftDesk />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight">Caja</h1>
          <p className="text-[11px] text-muted">
            Apertura, cierre de caja y cuadre por día
          </p>
        </div>

        {canPickBranch && activeBranches.length > 0 ? (
          <BranchSelect
            branches={activeBranches}
            value={branchId}
            onChange={(id) => {
              if (id) setBranchId(id);
            }}
            label="Sucursal"
            className="w-48"
          />
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="secondary"
            aria-label="Día anterior"
            onPress={() => shiftPeriod(-1)}
          >
            <ArrowChevronLeft width={14} height={14} />
          </Button>
          <p
            aria-live="polite"
            className="min-w-[8.5rem] text-center text-xs font-semibold capitalize"
          >
            {formatDayTitle(selectedDate)}
          </p>
          <Button
            isIconOnly
            size="sm"
            variant="secondary"
            aria-label="Día siguiente"
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

      {loadingWeek ? (
        <div className="cash-day-strip">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="cash-skeleton h-10" />
          ))}
        </div>
      ) : weekError ? (
        <ErrorState
          message={weekError}
          onRetry={() => void loadWeekly(weekAnchor, selectedDateRef.current)}
        />
      ) : weekly?.days?.length ? (
        <DayStrip
          days={weekly.days}
          selectedDate={selectedDate}
          onOpenDay={openDay}
          showAmounts
        />
      ) : null}

      {loadingDay ? (
        <div className="flex flex-col gap-1.5">
          <div className="cash-metrics cash-metrics--kpis">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`kpi-${index}`}
                className={`cash-skeleton h-[5.75rem] ${
                  index === 2 ? "cash-metric--primary" : ""
                }`}
              />
            ))}
          </div>
          <div className="cash-metrics">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="cash-skeleton h-9" />
            ))}
          </div>
        </div>
      ) : dayError ? (
        <ErrorState
          message={dayError}
          onRetry={() => void loadDaily(selectedDate)}
        />
      ) : daily ? (
        <>
          <MetricsBar
            summary={daily.summary}
            commissions={
              commissionSummary?.total ?? daily.employeeSummary?.total ?? 0
            }
            tickets={
              commissionSummary?.ticketsCount ??
              daily.employeeSummary?.ticketsCount
            }
          />
          <p className="cash-formula">
            <span>Efectivo {formatMoney(daily.summary.openingCashTotal)}</span>
            <span aria-hidden>+</span>
            <span>
              ventas efec. {formatMoney(daily.summary.salesCash ?? 0)}
            </span>
            <span aria-hidden>−</span>
            <span>gastos {formatMoney(daily.summary.cashOutTotal)}</span>
            {(daily.summary.cashInMovementsTotal ?? 0) > 0 ? (
              <>
                <span aria-hidden>+</span>
                <span>
                  entradas{" "}
                  {formatMoney(daily.summary.cashInMovementsTotal ?? 0)}
                </span>
              </>
            ) : null}
            <span aria-hidden>=</span>
            <span className="font-semibold text-warning">
              esperado {formatMoney(daily.summary.closingCashTotal)}
            </span>
          </p>
          <div className="mt-1.5 border-t border-separator pt-2">
            {commissionLabel ? (
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {commissionLabel}
              </p>
            ) : null}
            <EmployeeProductionPanel
              key={
                commissionFromDay
                  ? daily.date
                  : (commissionWeek?.weekStart ?? "commissions")
              }
              employees={commissionEmployees}
              summary={commissionSummary}
              showTickets={commissionFromDay}
            />
          </div>
        </>
      ) : null}

      <div
        className="dashboard-period w-full"
        role="tablist"
        aria-label="Sección del día"
      >
        {(
          [
            ["apertura", "Apertura"],
            ["cierre", "Cierre de caja"],
            ["cuadre", "Cuadre"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            className={`dashboard-period__btn !px-3 !py-1 ${
              section === id ? "dashboard-period__btn--active" : ""
            }`}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {section === "apertura" ? (
        <AperturaDay date={selectedDate} daily={daily} storeId={branchId} />
      ) : null}
      {section === "cierre" ? (
        <DailyView
          daily={daily}
          loading={loadingDay}
          selectedDate={selectedDate}
          tab={tab}
          onTab={setTab}
          onRetry={() => void loadDaily(selectedDate, true)}
          storeId={branchId}
          fallbackEmployees={commissionFromDay ? [] : commissionEmployees}
          fallbackSummary={commissionFromDay ? null : commissionSummary}
        />
      ) : null}
      {section === "cuadre" ? (
        <CashClosePanel
          date={selectedDate}
          branchId={branchId}
          suggestedLines={
            daily?.summary.closeMedia ?? daily?.summary.paymentMedia
          }
          suggestedExpenses={daily?.summary.cashOutTotal ?? 0}
          openingCash={daily?.summary.openingCashTotal ?? 0}
          salesCash={daily?.summary.salesCash ?? 0}
          cashIn={daily?.summary.cashInMovementsTotal ?? 0}
          expectedCash={daily?.summary.closingCashTotal}
          countedCash={
            daily?.shifts.length &&
            daily.shifts.every((shift) => shift.status !== "open")
              ? daily.shifts.reduce(
                  (sum, shift) => sum + Number(shift.countedCashOnDay ?? 0),
                  0,
                )
              : null
          }
        />
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
  primary = false,
  kpi = false,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "accent" | "success" | "danger" | "warning";
  primary?: boolean;
  kpi?: boolean;
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
    <div
      className={[
        "cash-metric",
        primary ? "cash-metric--primary" : "",
        kpi ? "cash-metric--kpi" : "",
        tone ? `cash-metric--${tone}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="cash-metric__heading">
        <span className="cash-metric__label">{label}</span>
      </span>
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

function fallbackOpeningMedia(summary: CashSummary): PaymentMediumTotal[] {
  return [
    {
      id: -1,
      name: "Efectivo",
      kind: "cash",
      amount: Number(summary.openingCashTotal ?? 0),
      count: 0,
    },
    ...(Number(summary.openingTransferTotal ?? 0) > 0
      ? [
          {
            id: -3,
            name: "Transferencia",
            kind: "transfer",
            amount: Number(summary.openingTransferTotal ?? 0),
            count: 0,
          },
        ]
      : []),
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
  const cobros = (
    summary.paymentMedia && summary.paymentMedia.length > 0
      ? summary.paymentMedia
      : fallbackMedia(summary)
  ).filter(
    (medium) =>
      isMoneyMedium(medium.kind) &&
      (medium.amount > 0 || String(medium.kind).toLowerCase() === "cash"),
  );
  const apertura = (
    summary.openingMedia && summary.openingMedia.length > 0
      ? summary.openingMedia
      : fallbackOpeningMedia(summary)
  ).filter((medium) => isMoneyMedium(medium.kind));
  const cobrosTotal = cobros.reduce((sum, item) => sum + item.amount, 0);
  const services = Number(summary.servicesTotal ?? 0);
  const products = Number(summary.productsTotal ?? 0);
  const opening =
    Number(summary.openingTotal ?? 0) ||
    Number(summary.openingCashTotal) +
      Number(summary.openingTransferTotal ?? 0);
  const totalCaja = Number((opening + sales).toFixed(2));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="cash-metrics cash-metrics--kpis">
        <Metric
          kpi
          label="Total servicios"
          value={services}
          hint={
            summary.servicesCount
              ? `${summary.servicesCount} cobro${summary.servicesCount === 1 ? "" : "s"}`
              : "Sin servicios"
          }
        />
        <Metric
          kpi
          label="Total productos"
          value={products}
          hint={
            summary.productsCount
              ? `${summary.productsCount} cobro${summary.productsCount === 1 ? "" : "s"}`
              : "Sin productos"
          }
        />
        <Metric
          kpi
          primary
          label="Total caja"
          value={totalCaja}
          hint={`Inicial ${formatMoney(opening)} + ventas ${formatMoney(sales)}`}
          tone="accent"
        />
      </div>
      <div className="cash-metrics">
        <Metric
          label="Caja inicial"
          value={opening}
          hint={`Efectivo ${formatMoney(summary.openingCashTotal)}${
            summary.openingTransferTotal
              ? ` · transfer. ${formatMoney(summary.openingTransferTotal)}`
              : ""
          }`}
        />
        <Metric
          label="Ventas"
          value={sales}
          hint={
            orders ? `${orders} cobro${orders === 1 ? "" : "s"}` : undefined
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
            tickets ? `${tickets} ticket${tickets === 1 ? "" : "s"}` : undefined
          }
          tone="warning"
        />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        Apertura
      </p>
      <div className="cash-methods">
        {apertura.map((medium) => (
          <Metric
            key={`open-${medium.id}`}
            label={medium.name}
            value={medium.amount}
            hint={
              String(medium.kind).toLowerCase() === "cash"
                ? "Efectivo al abrir"
                : "Saldo al abrir"
            }
            tone={medium.amount > 0 ? "accent" : undefined}
          />
        ))}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        Cobros del día
      </p>
      <div className="cash-methods">
        {cobros.map((medium) => {
          const share =
            cobrosTotal > 0
              ? Math.round((medium.amount / cobrosTotal) * 100)
              : 0;
          return (
            <Metric
              key={`pay-${medium.id}`}
              label={medium.name}
              value={medium.amount}
              hint={
                medium.count > 0
                  ? `${medium.count} cobro${medium.count === 1 ? "" : "s"} · ${share}%`
                  : cobrosTotal > 0
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

function AperturaDay({
  date,
  daily,
  storeId,
}: {
  date: string;
  daily: DailyReport | null;
  storeId: number | null;
}) {
  if (date === todayKey()) {
    return <ShiftDesk embedded storeId={storeId} panel="apertura" />;
  }
  if (!daily?.shifts.length) {
    return (
      <section className="cash-card">
        <p className="py-6 text-center text-xs text-muted">
          No hubo apertura ese día.
        </p>
      </section>
    );
  }
  return (
    <section className="cash-card">
      <ul className="flex flex-col gap-1.5 text-sm">
        {daily.shifts.map((shift) => (
          <li
            key={shift.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-separator py-1.5 last:border-0"
          >
            <span>
              {shift.operatorName}
              {shift.status === "open" ? (
                <span className="ml-1 text-[11px] text-success">abierta</span>
              ) : null}
            </span>
            <span className="tabular-nums text-muted">
              Caja inicial{" "}
              {formatMoney(
                Number(shift.openingCashOnDay ?? 0) +
                  Number(shift.openingTransferOnDay ?? 0),
              )}
              {` · efectivo ${formatMoney(shift.openingCashOnDay ?? 0)}`}
              {shift.status !== "open"
                ? ` · esperado ${formatMoney(
                    shift.expectedCashOnDay ?? shift.closingCashOnDay,
                  )}`
                : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
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
            {isToday ? (
              <span className="cash-day-chip__today" aria-hidden />
            ) : null}
            <p className="text-[9px] font-semibold uppercase leading-none text-muted">
              {day.weekdayShort}
            </p>
            <p className="mt-0.5 text-sm font-bold leading-none tabular-nums">
              {dayNumber(day.date)}
            </p>
            {showAmounts ? (
              <p className="mt-1 truncate text-[11px] font-bold leading-none tabular-nums text-warning">
                {formatMoney(day.salesTotal)}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function PanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="cash-skeleton h-5" />
      ))}
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
        <PanelSkeleton rows={6} />
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
  daily,
  loading,
  selectedDate,
  tab,
  onTab,
  onRetry,
  storeId,
  fallbackEmployees = [],
  fallbackSummary = null,
}: {
  daily: DailyReport | null;
  loading: boolean;
  selectedDate: string;
  tab: DailyTab;
  onTab: (tab: DailyTab) => void;
  onRetry: () => void;
  storeId: number | null;
  fallbackEmployees?: EmployeeProduction[];
  fallbackSummary?: EmployeeProductionTotals | null;
}) {
  if (loading) {
    return (
      <section className="cash-card">
        <PanelSkeleton rows={5} />
      </section>
    );
  }
  if (!daily) return null;
  const isToday = selectedDate === todayKey();
  const closedShifts = daily.shifts.filter((shift) => shift.status !== "open");
  return (
    <section className="cash-card">
      {isToday ? (
        <div className="mt-2">
          <ShiftDesk
            embedded
            storeId={storeId}
            panel="cierre"
            closedShifts={closedShifts}
            onChanged={onRetry}
          />
        </div>
      ) : closedShifts.length > 0 ? (
        <div className="mt-2">
          <ClosedShiftsRecap shifts={closedShifts} />
        </div>
      ) : (
        <p className="py-3 text-center text-xs text-muted">
          Ese día no se cerró caja.
        </p>
      )}

      <div
        className="dashboard-period mt-2 w-full"
        role="tablist"
        aria-label="Detalle del día"
      >
        <TabButton
          label="Empleados"
          tab="empleados"
            count={
              (daily.employees?.length ?? 0) > 0
                ? (daily.employees?.length ?? 0)
                : fallbackEmployees.length
            }
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
            employees={
              (daily.employees?.length ?? 0) > 0
                ? (daily.employees ?? [])
                : fallbackEmployees
            }
            summary={
              (daily.employees?.length ?? 0) > 0
                ? (daily.employeeSummary ?? null)
                : fallbackSummary
            }
            showTickets={(daily.employees?.length ?? 0) > 0}
          />
        ) : (
          <OutflowsTable outflows={daily.outflows} />
        )}
      </div>

      {daily.shifts.length > 0 ? (
        <p className="mt-2 border-t border-separator pt-2 text-[11px] text-muted">
          Cajas:{" "}
          {daily.shifts
            .map((shift) => {
              const opening = formatMoney(
                Number(shift.openingCashOnDay ?? 0) +
                  Number(shift.openingTransferOnDay ?? 0),
              );
              if (shift.status === "open") {
                return `${shift.operatorName} ${opening} (abierta)`;
              }
              const counted =
                shift.countedCashOnDay != null
                  ? ` · cerró ${formatMoney(shift.countedCashOnDay)}`
                  : "";
              return `${shift.operatorName} ${opening}${counted}`;
            })
            .join(" · ")}
        </p>
      ) : null}
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
