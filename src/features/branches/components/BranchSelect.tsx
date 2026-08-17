"use client";

import { ComboBox, Input, ListBox } from "@heroui/react";
import { SelectField } from "@/shared/components/SelectField";
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
};

export function ProductComboBox({
  value,
  onChange,
  products,
  className = "w-full",
  isDisabled = false,
}: ProductComboBoxProps) {
  return (
    <ComboBox
      className={className}
      selectedKey={value > 0 ? String(value) : null}
      onSelectionChange={(key) => onChange(key != null ? Number(key) : 0)}
      variant="secondary"
      isDisabled={isDisabled}
    >
      <ComboBox.InputGroup>
        <Input placeholder="Buscar producto..." />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox>
          {products.map((product) => (
            <ListBox.Item
              key={product.id}
              id={String(product.id)}
              textValue={product.name}
            >
              {product.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}
