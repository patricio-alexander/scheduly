"use client";

import Link from "next/link";
import Calendar from "@gravity-ui/icons/Calendar";
import Check from "@gravity-ui/icons/Check";
import Clock from "@gravity-ui/icons/Clock";
import Ban from "@gravity-ui/icons/Ban";
import ArrowRotateRight from "@gravity-ui/icons/ArrowRotateRight";
import CreditCard from "@gravity-ui/icons/CreditCard";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import { appRoutes } from "@/shared/utils/app-routes";
import type { AppointmentStatusOverviewItem } from "@/shared/utils/dashboard-finance-hero";

const toneStyles = {
  accent: {
    border: "border-accent/30",
    value: "text-accent",
    icon: "bg-accent/10 text-accent",
  },
  success: {
    border: "border-emerald-500/30",
    value: "text-emerald-600 dark:text-emerald-400",
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    border: "border-warning/40",
    value: "text-warning",
    icon: "bg-warning/15 text-warning",
  },
  danger: {
    border: "border-danger/30",
    value: "text-danger",
    icon: "bg-danger/10 text-danger",
  },
  muted: {
    border: "border-separator",
    value: "text-foreground",
    icon: "bg-surface-secondary text-muted",
  },
} as const;

const icons = {
  pending_payment: Clock,
  paid_pending: CreditCard,
  scheduled: Calendar,
  completed: Check,
  cancelled: Ban,
  rescheduled: ArrowRotateRight,
} as const;

type AppointmentStatusSummaryPanelProps = {
  items: AppointmentStatusOverviewItem[];
};

export function AppointmentStatusSummaryPanel({
  items,
}: AppointmentStatusSummaryPanelProps) {
  return (
    <div className="flex h-full min-h-[18rem] min-w-0 flex-col rounded-2xl border border-separator bg-surface p-4 md:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Resumen de estados</h2>
          <p className="text-xs text-muted">Turnos del período</p>
        </div>
        <Link
          href={appRoutes.operation.agenda}
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          Ver agenda
          <ArrowRight width={12} height={12} />
        </Link>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 content-start">
        {items.map((item) => {
          const styles = toneStyles[item.tone];
          const Icon =
            icons[item.id as keyof typeof icons] ?? Calendar;
          return (
            <div
              key={item.id}
              className={`rounded-xl border p-2.5 ${styles.border}`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {item.label}
                  </p>
                  <p className={`text-xl font-extrabold tabular-nums ${styles.value}`}>
                    {item.count}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-muted">
                    {item.subtitle}
                  </p>
                </div>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
                >
                  <Icon width={14} height={14} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
