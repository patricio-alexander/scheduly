import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  icon,
  variant = "accent",
  subtitle,
  delta,
  valueVariant = "default",
  headerAction,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  variant?: "accent" | "success" | "warning";
  subtitle?: string;
  delta?: ReactNode;
  valueVariant?: "default" | "text";
  headerAction?: ReactNode;
}) {
  const styles = {
    accent: { icon: "text-accent", bg: "bg-accent/10" },
    success: {
      icon: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    warning: { icon: "text-warning", bg: "bg-warning/15" },
  }[variant];

  return (
    <div className="dashboard-stat-card p-3.5 md:p-4">
      <div className="flex items-start justify-between gap-2 md:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-muted">{label}</p>
            {headerAction}
          </div>
          <p
            className={
              valueVariant === "text"
                ? "mt-1 text-base font-bold leading-snug break-words md:text-lg"
                : "mt-1 truncate text-xl font-bold tracking-tight tabular-nums md:text-2xl"
            }
          >
            {value}
          </p>
          {delta ? <div className="mt-1.5 min-w-0">{delta}</div> : null}
          {subtitle ? (
            <p className="mt-1 line-clamp-2 text-[11px] text-muted md:truncate md:line-clamp-none">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div
          className={`shrink-0 rounded-xl p-2 md:p-2.5 ${styles.bg} ${styles.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
