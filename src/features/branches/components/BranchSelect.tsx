"use client";

import { SelectField } from "@/shared/components/SelectField";
import { SearchableSelect } from "@/shared/components/SearchableSelect";
import type { BranchRecord } from "../hooks/useBranches";

type BranchSelectProps = {
  branches: BranchRecord[];
  value: number | null;
  onChange: (branchId: number | null) => void;
  label: string;
  placeholder?: string;
  excludeBranchId?: number | null;
  className?: string;
  isDisabled?: boolean;
};

export function BranchSelect({
  branches,
  value,
  onChange,
  label,
  placeholder = "Seleccionar sucursal",
  excludeBranchId,
  className = "w-full",
  isDisabled = false,
}: BranchSelectProps) {
  const options = branches
    .filter((b) => b.isActive && b.id !== excludeBranchId)
    .map((b) => ({ id: String(b.id), label: b.name }));

  return (
    <SelectField
      label={label}
      className={className}
      placeholder={placeholder}
      selectedKey={value != null && value > 0 ? String(value) : null}
      onSelectionChange={(key) => onChange(key != null ? Number(key) : null)}
      options={options}
      isDisabled={isDisabled}
    />
  );
}

type ProductComboBoxProps = {
  value: number;
  onChange: (productId: number) => void;
  products: Array<{ id: number; name: string }>;
  className?: string;
  isDisabled?: boolean;
  label?: string;
  placeholder?: string;
};

export function ProductComboBox({
  value,
  onChange,
  products,
  className = "w-full",
  isDisabled = false,
  label,
  placeholder = "Buscar producto…",
}: ProductComboBoxProps) {
  return (
    <SearchableSelect
      label={label}
      className={className}
      placeholder={placeholder}
      selectedKey={value > 0 ? String(value) : null}
      onSelectionChange={(key) => onChange(key != null ? Number(key) : 0)}
      options={products.map((product) => ({
        id: String(product.id),
        label: product.name,
      }))}
      isDisabled={isDisabled}
      emptyMessage="Sin productos"
    />
  );
}
