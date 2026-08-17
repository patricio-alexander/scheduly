"use client";

import { SelectField } from "@/shared/components/SelectField";
import { formatBranchLabel } from "@/shared/utils/branches";
import type { BranchRecord } from "../hooks/useBranches";

export function BranchSelector({
  branches,
  value,
  onChange,
  className = "",
  label,
}: {
  branches: BranchRecord[];
  value: number | "all";
  onChange: (value: number | "all") => void;
  className?: string;
  label?: string;
}) {
  const options = [
    { id: "all", label: "Todas las sucursales" },
    ...branches
      .filter((b) => b.isActive)
      .sort((a, b) => {
        if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
        return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
      })
      .map((b) => ({
        id: String(b.id),
        label: formatBranchLabel(b.name, b.isMain),
      })),
  ];

  return (
    <SelectField
      label={label}
      className={className || "w-full"}
      placeholder="Todas las sucursales"
      selectedKey={value === "all" ? "all" : String(value)}
      onSelectionChange={(key) => {
        if (key == null || key === "all") onChange("all");
        else onChange(Number(key));
      }}
      options={options}
    />
  );
}
