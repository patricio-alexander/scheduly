import { StatusChip } from "@/shared/components/StatusChip";
import { statusLegendItems } from "@/shared/utils/appointment-status";

interface Props {
  className?: string;
  title?: string;
}

export function StatusLegend({ className = "", title = "Estados de turnos" }: Props) {
  return (
    <div className={className}>
      {title ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
          {title}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {statusLegendItems.map((status) => (
          <StatusChip key={status} status={status} size="sm" />
        ))}
      </div>
    </div>
  );
}
