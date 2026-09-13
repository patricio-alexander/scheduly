"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import ArrowUp from "@gravity-ui/icons/ArrowUp";
import ArrowDown from "@gravity-ui/icons/ArrowDown";
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

const SLIDE_MS = 6000;

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

type MetricCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  tone?: Tone;
  primary?: boolean;
  className?: string;
  footer?: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone = "accent",
  primary = false,
  className = "",
  footer,
  onMouseEnter,
  onMouseLeave,
}: MetricCardProps) {
  return (
    <div
      className={`dashboard-metric ${
        primary ? "dashboard-metric--primary" : ""
      } ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="dashboard-metric__row">
        <p className="dashboard-metric__label truncate">{title}</p>
        <span className={`dashboard-metric__icon ${toneBg[tone]}`}>{icon}</span>
      </div>
      <p
        className={`dashboard-metric__value ${
          primary ? "dashboard-metric__value--xl" : ""
        } ${toneClass[tone]}`}
      >
        {value}
      </p>
      <p className="dashboard-metric__hint">{subtitle}</p>
      {footer}
    </div>
  );
}

type Slide = Omit<MetricCardProps, "footer" | "primary" | "className"> & {
  id: string;
};

function RotatingMetricCard({
  slides,
  label,
}: {
  slides: Slide[];
  label: string;
}) {
  const [index, setIndex] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (pinned || hovered || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [pinned, hovered, slides.length]);

  const current = slides[index] ?? slides[0];
  if (!current) return null;

  const { id, ...card } = current;

  return (
    <MetricCard
      {...card}
      key={id}
      className="dashboard-metric__slide"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      footer={
        <div className="dashboard-metric__dots" role="group" aria-label={label}>
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              aria-label={slide.title}
              aria-pressed={slideIndex === index}
              className={`dashboard-metric__dot ${
                slideIndex === index ? "dashboard-metric__dot--active" : ""
              }`}
              onClick={() => {
                setIndex(slideIndex);
                setPinned(true);
              }}
            >
              <span />
            </button>
          ))}
        </div>
      }
    />
  );
}

type FinanceHeroCardsProps = {
  summary: FinanceHeroSummary;
  loading?: boolean;
};

export function FinanceHeroCards({ summary, loading }: FinanceHeroCardsProps) {
  const marginSlides = useMemo<Slide[]>(
    () => [
      {
        id: "margin",
        title: "Margen",
        value: formatPct(summary.marginPct),
        subtitle: `Ganancia % · ${summary.periodLabel}`,
        icon: <Percent width={16} height={16} />,
        tone: summary.marginPct >= 0 ? "success" : "danger",
      },
      {
        id: "vs",
        title: "Vs anterior",
        value:
          summary.vsPreviousPct == null
            ? "—"
            : formatPct(summary.vsPreviousPct),
        subtitle:
          summary.vsPreviousPct == null
            ? "Sin base de comparación"
            : "Balance neto vs período previo",
        icon: <CrownDiamond width={16} height={16} />,
        tone:
          summary.vsPreviousPct == null
            ? "muted"
            : summary.vsPreviousPct >= 0
              ? "success"
              : "danger",
      },
    ],
    [summary],
  );

  const pendingSlides = useMemo<Slide[]>(
    () => [
      {
        id: "with-pending",
        title: "Margen + cobros",
        value: formatPct(summary.marginWithPendingPct),
        subtitle: `Caja + por cobrar · ${summary.periodLabel}`,
        icon: <Receipt width={16} height={16} />,
        tone: summary.marginWithPendingPct >= 0 ? "success" : "danger",
      },
      {
        id: "expected",
        title: "Balance + cobros",
        value: formatCurrency(summary.balanceWithPending),
        subtitle: `Incluye ${formatCurrency(summary.pendingReceivable)} por cobrar`,
        icon: <CircleDollar width={16} height={16} />,
        tone: "info",
      },
    ],
    [summary],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
        <Skeleton className="col-span-2 h-24 rounded-xl" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const overload = summary.purchases + summary.commissions;

  return (
    <div
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5"
      data-onboarding="dash-finance-hero"
    >
      <MetricCard
        primary
        className="col-span-2"
        title="Total dinero"
        value={formatCurrency(summary.balance)}
        subtitle={`Ingresos − gastos · ${summary.periodLabel}`}
        icon={<CircleDollar width={18} height={18} />}
        tone="accent"
        footer={
          <p className="dashboard-metric__formula">
            <span aria-hidden>+</span>
            <span>por cobrar {formatCurrency(summary.pendingReceivable)}</span>
            <span aria-hidden>=</span>
            <span className={`font-semibold ${toneClass.info}`}>
              esperado {formatCurrency(summary.projectedBalance)}
            </span>
          </p>
        }
      />
      <MetricCard
        title="Ingresos"
        value={formatCurrency(summary.totalIncome)}
        subtitle="Ventas e ingresos cobrados"
        icon={<ArrowUp width={16} height={16} />}
        tone="success"
      />
      <MetricCard
        title="Gastos"
        value={formatCurrency(summary.totalExpense)}
        subtitle="Gastos + compras + nómina"
        icon={<ArrowDown width={16} height={16} />}
        tone="danger"
      />
      <RotatingMetricCard slides={marginSlides} label="Alternar margen" />

      <RotatingMetricCard
        slides={pendingSlides}
        label="Alternar cobros pendientes"
      />
      <MetricCard
        title="Por cobrar"
        value={formatCurrency(summary.pendingReceivable)}
        subtitle="Pendiente de cobro"
        icon={<Clock width={16} height={16} />}
        tone="warning"
      />
      <MetricCard
        title="Compras"
        value={formatCurrency(summary.purchases)}
        subtitle="Compras del período"
        icon={<ShoppingCart width={16} height={16} />}
        tone="danger"
      />
      <MetricCard
        title="Comisiones"
        value={formatCurrency(summary.commissions)}
        subtitle="Comisiones del período"
        icon={<Persons width={16} height={16} />}
        tone="info"
      />
      <MetricCard
        title="Carga operativa"
        value={formatCurrency(overload)}
        subtitle="Compras + comisiones"
        icon={<CreditCard width={16} height={16} />}
        tone={overload > summary.totalIncome ? "danger" : "warning"}
      />
    </div>
  );
}
