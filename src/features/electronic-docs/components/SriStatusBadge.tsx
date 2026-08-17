import {
  sriStatusBadgeClass,
  sriStatusLabel,
} from "../lib/sri-status";

export function SriStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${sriStatusBadgeClass(status)}`}
    >
      {sriStatusLabel(status)}
    </span>
  );
}
