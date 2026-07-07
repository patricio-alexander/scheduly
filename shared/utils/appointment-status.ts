export const statusLabel: Record<string, string> = {
  scheduled: "Agendado",
  rescheduled: "Reagendado",
  paid_pending: "Pagado",
  pending_payment: "Pendiente de pago",
  completed: "Completado",
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

/** HeroUI Chip color cuando aplica; `null` usa estilo custom */
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

const chipBase =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";

export const statusChipClass: Record<string, string> = {
  scheduled: `${chipBase} bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30`,
  paid_pending: `${chipBase} bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30`,
  pending_payment: `${chipBase} bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30`,
  completed: `${chipBase} bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30`,
  cancelled: `${chipBase} bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30`,
  rescheduled: `${chipBase} bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-500/30`,
};

export const statusCalendarClass: Record<string, string> = {
  scheduled: "apt-status-scheduled",
  rescheduled: "apt-status-rescheduled",
  paid_pending: "apt-status-paid-pending",
  pending_payment: "apt-status-pending-payment",
  completed: "apt-status-completed",
  cancelled: "apt-status-cancelled",
};
