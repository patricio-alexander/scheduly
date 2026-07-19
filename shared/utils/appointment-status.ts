export const statusLabel: Record<string, string> = {
  scheduled: "Agendado",
  rescheduled: "Reagendado",
  paid_pending: "Pagado",
  pending_payment: "Pendiente de pago",
  completed: "Completado",
  cancelled: "Cancelado",
};

/** Etiquetas cortas para espacios estrechos (tabla / cards) */
export const statusLabelShort: Record<string, string> = {
  scheduled: "Agendado",
  rescheduled: "Reagendado",
  paid_pending: "Pagado",
  pending_payment: "Por pagar",
  completed: "Hecho",
  cancelled: "Cancelado",
};

/** Orden sugerido en selectores de estado */
export const appointmentStatusOptions = [
  "scheduled",
  "paid_pending",
  "pending_payment",
  "completed",
  "cancelled",
  "rescheduled",
] as const;

export type AppointmentStatusOption = (typeof appointmentStatusOptions)[number];

export const statusChartColor: Record<string, string> = {
  scheduled: "#f97316",
  rescheduled: "#a3a3a3",
  paid_pending: "#3b82f6",
  pending_payment: "#eab308",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

/** Estados visibles en leyenda de colores (mismo orden que selectores) */
export const statusLegendItems = [
  "scheduled",
  "paid_pending",
  "pending_payment",
  "completed",
  "cancelled",
  "rescheduled",
] as const;

/** Tonos para badges de estado (pill + punto) */
export const statusToneClass: Record<
  string,
  { pill: string; dot: string; text: string }
> = {
  scheduled: {
    pill: "bg-orange-500/12 text-orange-700 dark:text-orange-300 ring-orange-500/25",
    dot: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
  },
  paid_pending: {
    pill: "bg-blue-500/12 text-blue-700 dark:text-blue-300 ring-blue-500/25",
    dot: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
  },
  pending_payment: {
    pill: "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-500/30",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
  },
  completed: {
    pill: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  cancelled: {
    pill: "bg-danger/12 text-danger ring-danger/25",
    dot: "bg-danger",
    text: "text-danger",
  },
  rescheduled: {
    pill: "bg-neutral-500/12 text-neutral-700 dark:text-neutral-300 ring-neutral-500/25",
    dot: "bg-neutral-400",
    text: "text-neutral-600 dark:text-neutral-400",
  },
};

/** @deprecated Prefer statusToneClass — se mantiene por compatibilidad */
export const statusChipColor: Record<
  string,
  "accent" | "warning" | "success" | "danger" | "default" | null
> = {
  scheduled: null,
  rescheduled: null,
  paid_pending: null,
  pending_payment: null,
  completed: null,
  cancelled: null,
};

/** @deprecated Prefer statusToneClass */
export const statusChipClass: Record<string, string> = Object.fromEntries(
  Object.entries(statusToneClass).map(([key, tone]) => [
    key,
    `inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tone.pill}`,
  ]),
);

export const statusCalendarClass: Record<string, string> = {
  scheduled: "apt-status-scheduled",
  rescheduled: "apt-status-rescheduled",
  paid_pending: "apt-status-paid-pending",
  pending_payment: "apt-status-pending-payment",
  completed: "apt-status-completed",
  cancelled: "apt-status-cancelled",
};

export function getStatusTone(status: string) {
  return (
    statusToneClass[status] ?? {
      pill: "bg-surface-secondary text-muted ring-separator",
      dot: "bg-muted",
      text: "text-muted",
    }
  );
}
