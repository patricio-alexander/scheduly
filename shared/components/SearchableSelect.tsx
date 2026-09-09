"use client";

import { ComboBox, Input, Label, ListBox } from "@heroui/react";
import type { SelectFieldOption } from "@/shared/components/SelectField";

export type SearchableSelectOption = SelectFieldOption & {
  /** Línea secundaria opcional en cada opción. */
  description?: string;
};

type SearchableSelectProps = {
  label?: string;
  /** Accesibilidad si no hay label visible. */
  "aria-label"?: string;
  placeholder?: string;
  selectedKey: string | null;
  onSelectionChange: (key: string | null) => void;
  options: SearchableSelectOption[];
  className?: string;
  isDisabled?: boolean;
  /** Por defecto true: llena su contenedor sin aplastarse. */
  fullWidth?: boolean;
  /** Mensaje cuando no hay opciones. */
  emptyMessage?: string;
};

/**
 * Select con buscador del sistema (mismo look que SelectField / HeroUI).
 * Controla `selectedKey` y `onSelectionChange`; pásale `options`.
 */
export function SearchableSelect({
  label,
  "aria-label": ariaLabel,
  placeholder = "Buscar…",
  selectedKey,
  onSelectionChange,
  options,
  className = "",
  isDisabled = false,
  fullWidth = true,
  emptyMessage = "Sin resultados",
}: SearchableSelectProps) {
  return (
    <div className={`min-w-0 ${fullWidth ? "w-full" : ""} ${className}`.trim()}>
      <ComboBox
        aria-label={ariaLabel ?? label ?? placeholder}
        fullWidth={fullWidth}
        className="min-w-0"
        selectedKey={selectedKey}
        onSelectionChange={(key) =>
          onSelectionChange(key != null ? String(key) : null)
        }
        isDisabled={isDisabled}
        menuTrigger="focus"
      >
        {label ? <Label>{label}</Label> : null}
        <ComboBox.InputGroup className="min-w-0 w-full max-w-full">
          <Input placeholder={placeholder} />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {options.length === 0 ? (
              <ListBox.Item id="__empty" textValue={emptyMessage} isDisabled>
                {emptyMessage}
              </ListBox.Item>
            ) : (
              options.map((option) => (
                <ListBox.Item
                  key={option.id}
                  id={option.id}
                  textValue={option.textValue ?? option.label}
                >
                  {option.description ? (
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate">{option.label}</span>
                      <span className="truncate text-xs text-muted">
                        {option.description}
                      </span>
                    </div>
                  ) : (
                    option.label
                  )}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))
            )}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </div>
  );
}
