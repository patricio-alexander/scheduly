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
  /** Por defecto true: el select llena su contenedor sin aplastarse. */
  fullWidth?: boolean;
};

export function SelectField({
  label,
  placeholder = "Seleccionar...",
  selectedKey,
  onSelectionChange,
  options,
  className = "",
  isDisabled = false,
  fullWidth = true,
}: SelectFieldProps) {
  return (
    <div className={`min-w-0 ${fullWidth ? "w-full" : ""} ${className}`.trim()}>
      <Select
        fullWidth={fullWidth}
        className="min-w-0"
        placeholder={placeholder}
        selectedKey={selectedKey}
        onSelectionChange={(key) =>
          onSelectionChange(key != null ? String(key) : null)
        }
        isDisabled={isDisabled}
      >
        {label ? <Label>{label}</Label> : null}
        <Select.Trigger className="min-w-0 w-full max-w-full overflow-hidden">
          <Select.Value className="min-w-0 truncate" />
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
    </div>
  );
}
