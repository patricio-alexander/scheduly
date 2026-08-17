"use client";

import { SelectField } from "@/shared/components/SelectField";
import { formatBranchLabel } from "@/shared/utils/branches";
import type { BranchRecord } from "../hooks/useBranches";

export function BranchPicker({
  branches,
  value,
  onChange,
  className = "",
  placeholder = "Seleccionar sucursal...",
  allowEmpty = false,
  label,
}: {
  branches: BranchRecord[];
  value: number | null;
  onChange: (value: number | null) => void;
  className?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  label?: string;
}) {
  const options = branches
    .filter((b) => b.isActive)
    .sort((a, b) => {
      if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
      return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
    })
    .map((b) => ({
      id: String(b.id),
      label: formatBranchLabel(b.name, b.isMain),
    }));

  return (
    <SelectField
      label={label}
      className={className || "w-full"}
      placeholder={placeholder}
      selectedKey={value != null && value > 0 ? String(value) : allowEmpty ? "none" : null}
      onSelectionChange={(key) => {
        if (key == null || key === "none") onChange(null);
        else onChange(Number(key));
      }}
      options={
        allowEmpty
          ? [{ id: "none", label: "Sin sucursal" }, ...options]
          : options
      }
    />
  );
}
