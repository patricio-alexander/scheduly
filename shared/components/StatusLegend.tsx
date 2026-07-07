import {
  statusChartColor,
  statusLabel,
  statusLegendItems,
} from "@/shared/utils/appointment-status";

interface Props {
  className?: string;
  title?: string;
}

export function StatusLegend({ className = "", title = "Estados de turnos" }: Props) {
  return (
    <div className={className}>
      {title ? (
        <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
          {title}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {statusLegendItems.map((status) => (
          <div key={status} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-sm shrink-0 ring-1 ring-black/10 dark:ring-white/10"
              style={{ backgroundColor: statusChartColor[status] }}
              aria-hidden
            />
            <span>{statusLabel[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
