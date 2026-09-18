"use client";

import { branchChartLabel } from "@/shared/utils/branches";
import type { BranchRecord } from "../hooks/useBranches";

type BranchSwitchProps = {
  branches: BranchRecord[];
  value: number | null;
  onChange: (branchId: number) => void;
  className?: string;
};

function sortBranches(branches: BranchRecord[]) {
  return branches
    .filter((branch) => branch.isActive)
    .sort((a, b) => {
      if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
      return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
    });
}

export function BranchSwitch({
  branches,
  value,
  onChange,
  className = "",
}: BranchSwitchProps) {
  const options = sortBranches(branches);
  if (options.length < 2) return null;

  return (
    <div
      className={`cash-branch-switch ${className}`.trim()}
      role="radiogroup"
      aria-label="Sucursal"
    >
      {options.map((branch) => {
        const selected = value === branch.id;
        const label = branchChartLabel(branch.name, branch.code);
        return (
          <button
            key={branch.id}
            type="button"
            role="radio"
            aria-checked={selected}
            title={branch.name}
            onClick={() => onChange(branch.id)}
            className={`cash-branch-switch__btn ${
              selected ? "cash-branch-switch__btn--active" : ""
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
