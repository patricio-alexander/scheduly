"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Wallet from "@gravity-ui/icons/Wallet";
import ArrowUp from "@gravity-ui/icons/ArrowUp";
import ArrowDown from "@gravity-ui/icons/ArrowDown";
import Clock from "@gravity-ui/icons/Clock";
import CircleDollar from "@gravity-ui/icons/CircleDollar";
import Persons from "@gravity-ui/icons/Persons";
import CreditCard from "@gravity-ui/icons/CreditCard";
import Percent from "@gravity-ui/icons/Percent";
import Medal from "@gravity-ui/icons/Medal";
import ScalesUnbalanced from "@gravity-ui/icons/ScalesUnbalanced";
import Receipt from "@gravity-ui/icons/Receipt";
import { formatMoney } from "@/shared/utils/money";

export type FinanceSummaryData = {
  totalIncome?: number;
  totalExpense?: number;
  balance?: number;
  futureIncome?: number;
  projectedBalance?: number;
  loansReceivable?: number;
  debtsPayable?: number;
  monthIncome?: number;
  monthExpense?: number;
  monthBalance?: number;
  monthMarginPct?: number;
  monthBalanceWithPending?: number;
  monthMarginWithPendingPct?: number;
  bestMonthBalance?: number;
  bestMonthLabel?: string;
  vsRecordPct?: number;
  isRecordMonth?: boolean;
  monthLabel?: string;
};

type Tone = "accent" | "success" | "danger" | "warning" | "muted" | "info";

const ROTATE_MS = 3000;

const toneText: Record<Tone, string> = {
  accent: "text-accent",
  success: "text-success",
  danger: "text-danger",
  warning: "text-[var(--warning)]",
  muted: "text-muted",
  info: "text-accent",
};

const toneBg: Record<Tone, string> = {
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  warning: "bg-warning/15 text-[var(--warning)]",
  muted: "bg-surface-secondary text-muted",
  info: "bg-accent/15 text-accent",
};

function fmtPct(n: number) {
  return `${Number(n).toFixed(1)}%`;
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  tone = "accent",
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex h-full min-h-[7.5rem] flex-col rounded-xl border border-separator bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-muted">{title}</p>
          <p
            className={`mt-1 text-lg font-extrabold tabular-nums leading-tight sm:text-xl ${toneText[tone]}`}
          >
            {value}
          </p>
          <p className="mt-1 line-clamp-2 min-h-[2rem] text-[11px] leading-snug text-muted">
            {subtitle || "\u00A0"}
          </p>
        </div>
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${toneBg[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function RotatingCard({
  slides,
}: {
  slides: Array<{
    title: string;
    value: string;
    subtitle?: string;
    icon: ReactNode;
    tone?: Tone;
  }>;
}) {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const id = window.setInterval(() => {
      setSlide((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  const current = slides[slide] ?? slides[0];
  if (!current) return null;

  return (
    <div
      className="h-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <SummaryCard {...current} />
      <div className="-mt-3 flex justify-center gap-1 pb-1">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === slide
                ? "w-3.5 bg-foreground/70"
                : "w-1.5 bg-foreground/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="min-h-[7.5rem] animate-pulse rounded-xl border border-separator bg-surface-secondary/40"
        />
      ))}
    </div>
  );
}

/** KPIs estilo EdDeli FinanceSummaryCards (grid 5 + fórmula). */
export function FinanceSummaryCards({
  summary,
  loading = false,
}: {
  summary: FinanceSummaryData | null;
  loading?: boolean;
}) {
  const balance = Number(summary?.balance ?? 0);
  const totalIncome = Number(summary?.totalIncome ?? 0);
  const totalExpense = Number(summary?.totalExpense ?? 0);
  const collectionsPending = Number(summary?.futureIncome ?? 0);
  const loansReceivable = Number(summary?.loansReceivable ?? 0);
  const debtsPayable = Number(summary?.debtsPayable ?? 0);
  const projectedBalance = Number(
    (
      summary?.projectedBalance ??
      balance + collectionsPending + loansReceivable - debtsPayable
    ).toFixed(2),
  );

  const monthLabel = summary?.monthLabel || "Mes actual";
  const monthMarginPct = Number(summary?.monthMarginPct ?? 0);
  const vsRecordPct = Number(summary?.vsRecordPct ?? 0);
  const bestMonthLabel = summary?.bestMonthLabel || null;
  const bestMonthBalance = Number(summary?.bestMonthBalance ?? 0);
  const isRecordMonth = Boolean(summary?.isRecordMonth);
  const monthMarginWithPendingPct = Number(
    summary?.monthMarginWithPendingPct ?? 0,
  );
  const monthBalanceWithPending = Number(
    summary?.monthBalanceWithPending ?? 0,
  );

  const vsRecordWithPendingPct =
    bestMonthBalance > 0
      ? Number(((monthBalanceWithPending / bestMonthBalance) * 100).toFixed(1))
      : bestMonthBalance === 0 && monthBalanceWithPending === 0
        ? 100
        : 0;

  const receivableBase = collectionsPending + loansReceivable;
  const debtVsReceivablePct =
    receivableBase > 0
      ? Number(((debtsPayable / receivableBase) * 100).toFixed(1))
      : debtsPayable > 0
        ? null
        : 0;

  const marginSlides = useMemo(
    () => [
      {
        title: "Margen mensual",
        value: fmtPct(monthMarginPct),
        subtitle: `Ganancia % · ${monthLabel}`,
        icon: <Percent width={18} height={18} />,
        tone: (monthMarginPct >= 0 ? "success" : "danger") as Tone,
      },
      {
        title: "Vs mes récord",
        value:
          bestMonthBalance > 0 || isRecordMonth ? fmtPct(vsRecordPct) : "—",
        subtitle: isRecordMonth
          ? `Eres el récord · ${monthLabel}`
          : bestMonthLabel
            ? `Del mejor mes · ${bestMonthLabel} (${formatMoney(bestMonthBalance)})`
            : "Sin historial de ganancias",
        icon: <Medal width={18} height={18} />,
        tone: (vsRecordPct >= 100
          ? "success"
          : vsRecordPct >= 70
            ? "warning"
            : "danger") as Tone,
      },
    ],
    [
      monthMarginPct,
      monthLabel,
      vsRecordPct,
      bestMonthLabel,
      bestMonthBalance,
      isRecordMonth,
    ],
  );

  const pendingSlides = useMemo(
    () => [
      {
        title: "Con por cobrar",
        value: fmtPct(monthMarginWithPendingPct),
        subtitle: `Caja + pedidos · ${formatMoney(collectionsPending)} · ${monthLabel}`,
        icon: <Receipt width={18} height={18} />,
        tone: (monthMarginWithPendingPct >= 0 ? "success" : "danger") as Tone,
      },
      {
        title: "Vs récord (c/ cobros)",
        value:
          bestMonthBalance > 0 || monthBalanceWithPending !== 0
            ? fmtPct(vsRecordWithPendingPct)
            : "—",
        subtitle: bestMonthLabel
          ? `Vs ${bestMonthLabel} (${formatMoney(bestMonthBalance)}) · +${formatMoney(collectionsPending)} pend.`
          : `Incluye ${formatMoney(collectionsPending)} por cobrar`,
        icon: <Medal width={18} height={18} />,
        tone: (vsRecordWithPendingPct >= 100
          ? "success"
          : vsRecordWithPendingPct >= 70
            ? "warning"
            : "danger") as Tone,
      },
    ],
    [
      monthMarginWithPendingPct,
      collectionsPending,
      monthLabel,
      bestMonthBalance,
      bestMonthLabel,
      monthBalanceWithPending,
      vsRecordWithPendingPct,
    ],
  );

  if (loading && !summary) {
    return (
      <div className="space-y-3">
        <CardsSkeleton />
        <div className="h-12 animate-pulse rounded-xl border border-separator bg-surface-secondary/40" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        <SummaryCard
          title="Total dinero"
          value={formatMoney(balance)}
          subtitle="Ingresos − gastos registrados"
          icon={<Wallet width={18} height={18} />}
          tone={balance >= 0 ? "accent" : "danger"}
        />
        <SummaryCard
          title="Ingresos"
          value={formatMoney(totalIncome)}
          subtitle="Suma histórica de ingresos"
          icon={<ArrowUp width={18} height={18} />}
          tone="success"
        />
        <SummaryCard
          title="Gastos"
          value={formatMoney(totalExpense)}
          subtitle="Suma histórica de gastos"
          icon={<ArrowDown width={18} height={18} />}
          tone="danger"
        />
        <RotatingCard slides={marginSlides} />
        <RotatingCard slides={pendingSlides} />
        <SummaryCard
          title="Por cobrar (pedidos)"
          value={formatMoney(collectionsPending)}
          subtitle="Pendiente en Cobranzas"
          icon={<Clock width={18} height={18} />}
          tone="warning"
        />
        <SummaryCard
          title="Préstamos por cobrar"
          value={formatMoney(loansReceivable)}
          subtitle="Módulo préstamos y deudas"
          icon={<Persons width={18} height={18} />}
          tone="info"
        />
        <SummaryCard
          title="Deudas por pagar"
          value={formatMoney(debtsPayable)}
          subtitle="Obligaciones abiertas"
          icon={<CreditCard width={18} height={18} />}
          tone="muted"
        />
        <SummaryCard
          title="Deudas vs por cobrar"
          value={
            debtVsReceivablePct == null ? "∞" : fmtPct(debtVsReceivablePct)
          }
          subtitle={
            debtVsReceivablePct == null
              ? "Hay deudas y nada por cobrar"
              : debtVsReceivablePct > 100
                ? "Debes más de lo que te deben"
                : `Deudas ÷ (pedidos + préstamos) · base ${formatMoney(receivableBase)}`
          }
          icon={<ScalesUnbalanced width={18} height={18} />}
          tone={
            debtVsReceivablePct == null || debtVsReceivablePct > 100
              ? "danger"
              : debtVsReceivablePct >= 70
                ? "warning"
                : "success"
          }
        />
        <SummaryCard
          title="Dinero esperado"
          value={formatMoney(projectedBalance)}
          subtitle="Balance + por cobrar − deudas"
          icon={<CircleDollar width={18} height={18} />}
          tone="info"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-separator bg-surface px-3 py-2.5 text-xs font-semibold">
        <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-accent">
          Balance: {formatMoney(balance)}
        </span>
        <span className="text-muted">+</span>
        <span className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[var(--warning)]">
          Por cobrar pedidos: {formatMoney(collectionsPending)}
        </span>
        <span className="text-muted">+</span>
        <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-accent">
          Préstamos: {formatMoney(loansReceivable)}
        </span>
        <span className="text-muted">−</span>
        <span className="rounded-full border border-separator bg-surface-secondary px-2.5 py-1 text-muted">
          Deudas: {formatMoney(debtsPayable)}
        </span>
        <span className="text-muted">=</span>
        <span className="rounded-full bg-accent px-2.5 py-1 font-extrabold text-accent-foreground">
          Esperado: {formatMoney(projectedBalance)}
        </span>
      </div>
    </div>
  );
}
