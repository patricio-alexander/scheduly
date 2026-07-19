import {
  getStatusTone,
  statusLabel,
  statusLabelShort,
} from "@/shared/utils/appointment-status";

interface Props {
  status: string;
  size?: "sm" | "md" | "lg";
  /** Usa etiquetas cortas (ej. "Por pagar") */
  compact?: boolean;
  showDot?: boolean;
  className?: string;
}

const sizeClass = {
  sm: "px-2 py-0.5 text-[11px] gap-1.5",
  md: "px-2.5 py-1 text-xs gap-1.5",
  lg: "px-3 py-1.5 text-sm gap-2",
} as const;

const dotSizeClass = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
} as const;

export function StatusChip({
  status,
  size = "sm",
  compact = false,
  showDot = true,
  className = "",
}: Props) {
  const fullLabel = statusLabel[status] ?? status;
  const label = compact
    ? (statusLabelShort[status] ?? fullLabel)
    : fullLabel;
  const tone = getStatusTone(status);

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full font-semibold tracking-tight ring-1 ring-inset ${sizeClass[size]} ${tone.pill} ${className}`}
      title={fullLabel}
    >
      {showDot ? (
        <span
          className={`shrink-0 rounded-full ${dotSizeClass[size]} ${tone.dot}`}
          aria-hidden
        />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
