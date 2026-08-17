"use client";

import { Label, ListBox, Select } from "@heroui/react";

export type SelectFieldOption = {
  id: string;
  label: string;
  textValue?: string;
};

type SelectFieldProps = {
  label?: string;
  placeholder?: string;
  selectedKey: string | null;
  onSelectionChange: (key: string | null) => void;
  options: SelectFieldOption[];
  className?: string;
  isDisabled?: boolean;
};

export function SelectField({
  label,
  placeholder = "Seleccionar...",
  selectedKey,
  onSelectionChange,
  options,
  className = "w-full",
  isDisabled = false,
}: SelectFieldProps) {
  return (
    <Select
      className={className}
      placeholder={placeholder}
      selectedKey={selectedKey}
      onSelectionChange={(key) => onSelectionChange(key != null ? String(key) : null)}
      isDisabled={isDisabled}
    >
      {label ? <Label>{label}</Label> : null}
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.id}
              id={option.id}
              textValue={option.textValue ?? option.label}
            >
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
