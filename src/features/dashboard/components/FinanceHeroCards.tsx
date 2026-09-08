"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import ArrowUp from "@gravity-ui/icons/ArrowUp";
import ArrowDown from "@gravity-ui/icons/ArrowDown";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import Receipt from "@gravity-ui/icons/Receipt";
import CreditCard from "@gravity-ui/icons/CreditCard";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";
import Persons from "@gravity-ui/icons/Persons";
import Percent from "@gravity-ui/icons/Percent";
import CrownDiamond from "@gravity-ui/icons/CrownDiamond";
import Clock from "@gravity-ui/icons/Clock";
import CircleDollar from "@gravity-ui/icons/CircleDollar";
import type { FinanceHeroSummary } from "@/shared/utils/dashboard-finance-hero";
import { Skeleton } from "@/shared/components/ui";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(n: number) {
  return `${n.toFixed(1)}%`;
}

type Tone = "accent" | "success" | "danger" | "warning" | "info" | "muted";

const toneClass: Record<Tone, string> = {
  accent: "text-accent",
  success: "text-emerald-600 dark:text-emerald-400",
  danger: "text-danger",
  warning: "text-warning",
  info: "text-sky-600 dark:text-sky-400",
  muted: "text-muted",
};

const toneBg: Record<Tone, string> = {
  accent: "bg-accent/10 text-accent",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/15 text-warning",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  muted: "bg-surface-secondary text-muted",
};

type HeroCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  tone?: Tone;
  footer?: ReactNode;
};

function HeroCard({
  title,
  value,
  subtitle,
  icon,
  tone = "accent",
  footer,
}: HeroCardProps) {
  return (
    <div className="flex min-h-[7.5rem] flex-col rounded-2xl border border-separator bg-surface p-3.5 md:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-muted">{title}</p>
          <p
            className={`mt-1 text-xl font-extrabold tracking-tight tabular-nums md:text-2xl ${toneClass[tone]}`}
          >
            {value}
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted">
            {subtitle}
          </p>
          {footer}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneBg[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function RotatingHeroCard({
  slides,
}: {
  slides: Array<Omit<HeroCardProps, "footer"> & { id: string }>;
}) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % slides.length);
        setVisible(true);
      }, 160);
    }, 3000);
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  const current = slides[index] ?? slides[0];
  if (!current) return null;

  const { id: slideId, title, value, subtitle, icon, tone } = current;

  return (
    <div
      className={`transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <HeroCard
        key={slideId}
        title={title}
        value={value}
        subtitle={subtitle}
        icon={icon}
        tone={tone}
        footer={
          <div className="mt-2 flex gap-1">
            {slides.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-3.5 bg-foreground/70"
                    : "w-1.5 bg-foreground/25"
                }`}
              />
            ))}
          </div>
        }
      />
    </div>
  );
}

type FinanceHeroCardsProps = {
  summary: FinanceHeroSummary;
  loading?: boolean;
};

export function FinanceHeroCards({ summary, loading }: FinanceHeroCardsProps) {
  const marginSlides = useMemo(
    () => [
      {
        id: "margin",
        title: "Margen del período",
        value: formatPct(summary.marginPct),
        subtitle: `Ganancia % · ${summary.periodLabel}`,
        icon: <Percent width={18} height={18} />,
        tone: (summary.marginPct >= 0 ? "success" : "danger") as Tone,
      },
      {
        id: "vs",
        title: "Vs período anterior",
        value:
          summary.vsPreviousPct == null
            ? "—"
            : formatPct(summary.vsPreviousPct),
        subtitle:
          summary.vsPreviousPct == null
            ? "Sin base de comparación"
            : `Balance neto vs período previo`,
        icon: <CrownDiamond width={18} height={18} />,
        tone: (
          summary.vsPreviousPct == null
            ? "muted"
            : summary.vsPreviousPct >= 0
              ? "success"
              : "danger"
        ) as Tone,
      },
    ],
    [summary],
  );

  const pendingSlides = useMemo(
    () => [
      {
        id: "with-pending",
        title: "Con por cobrar",
        value: formatPct(summary.marginWithPendingPct),
        subtitle: `Caja + pedidos · ${formatCurrency(summary.pendingReceivable)} · ${summary.periodLabel}`,
        icon: <Receipt width={18} height={18} />,
        tone: (summary.marginWithPendingPct >= 0 ? "success" : "danger") as Tone,
      },
      {
        id: "expected",
        title: "Balance + cobros",
        value: formatCurrency(summary.balanceWithPending),
        subtitle: `Incluye ${formatCurrency(summary.pendingReceivable)} por cobrar`,
        icon: <CircleDollar width={18} height={18} />,
        tone: "info" as Tone,
      },
    ],
    [summary],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[7.5rem] rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 md:gap-4" data-onboarding="dash-finance-hero">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
        <HeroCard
          title="Total dinero"
          value={formatCurrency(summary.balance)}
          subtitle="Ingresos − gastos del período"
          icon={<CircleDollar width={18} height={18} />}
          tone="accent"
        />
        <HeroCard
          title="Ingresos"
          value={formatCurrency(summary.totalIncome)}
          subtitle="Ventas e ingresos cobrados"
          icon={<ArrowUp width={18} height={18} />}
          tone="success"
        />
        <HeroCard
          title="Gastos"
          value={formatCurrency(summary.totalExpense)}
          subtitle="Gastos + compras + comisiones"
          icon={<ArrowDown width={18} height={18} />}
          tone="danger"
        />
        <RotatingHeroCard slides={marginSlides} />
        <RotatingHeroCard slides={pendingSlides} />

        <HeroCard
          title="Por cobrar (pedidos)"
          value={formatCurrency(summary.pendingReceivable)}
          subtitle="Pendiente de cobro"
          icon={<Clock width={18} height={18} />}
          tone="warning"
        />
        <HeroCard
          title="Compras"
          value={formatCurrency(summary.purchases)}
          subtitle="Compras a proveedores"
          icon={<ShoppingCart width={18} height={18} />}
          tone="danger"
        />
        <HeroCard
          title="Comisiones"
          value={formatCurrency(summary.commissions)}
          subtitle="Comisiones del período"
          icon={<Persons width={18} height={18} />}
          tone="info"
        />
        <HeroCard
          title="Carga operativa"
          value={formatCurrency(summary.purchases + summary.commissions)}
          subtitle="Compras + comisiones"
          icon={<CreditCard width={18} height={18} />}
          tone={
            summary.purchases + summary.commissions > summary.totalIncome
              ? "danger"
              : "warning"
          }
        />
        <HeroCard
          title="Dinero esperado"
          value={formatCurrency(summary.projectedBalance)}
          subtitle="Balance + por cobrar"
          icon={<ChartColumn width={18} height={18} />}
          tone="info"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-separator bg-surface px-3 py-3 md:gap-3 md:px-4">
        <FormulaChip
          label="Balance"
          value={formatCurrency(summary.balance)}
          tone="accent"
        />
        <Op>+</Op>
        <FormulaChip
          label="Por cobrar"
          value={formatCurrency(summary.pendingReceivable)}
          tone="warning"
        />
        <Op>=</Op>
        <FormulaChip
          label="Esperado"
          value={formatCurrency(summary.projectedBalance)}
          tone="info"
          solid
        />
      </div>
    </div>
  );
}

function Op({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-semibold text-muted shrink-0">{children}</span>
  );
}

function FormulaChip({
  label,
  value,
  tone,
  solid,
}: {
  label: string;
  value: string;
  tone: Tone;
  solid?: boolean;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
        solid
          ? `${toneBg[tone]} border border-transparent`
          : `border ${toneClass[tone]} border-current/30 bg-transparent`
      }`}
    >
      <span className="opacity-80">{label}:</span>
      <span>{value}</span>
    </span>
  );
}
