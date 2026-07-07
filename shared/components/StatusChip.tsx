import { Chip } from "@heroui/react";
import { statusChipClass, statusChipColor, statusLabel } from "@/shared/utils/appointment-status";

interface Props {
  status: string;
  size?: "sm" | "md" | "lg";
}

export function StatusChip({ status, size = "sm" }: Props) {
  const label = statusLabel[status] ?? status;
  const chipColor = statusChipColor[status];
  const customClass = statusChipClass[status];

  if (chipColor === null && customClass) {
    return <span className={customClass}>{label}</span>;
  }

  return (
    <Chip color={chipColor ?? "default"} variant="soft" size={size}>
      {label}
    </Chip>
  );
}
