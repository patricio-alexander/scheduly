"use client";

import { Label, NumberField } from "@heroui/react";
import type { ComponentProps } from "react";

type AppNumberFieldProps = {
  label?: string;
  value?: number | null;
  onChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  name?: string;
  id?: string;
  className?: string;
  inputClassName?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
} & Omit<
  ComponentProps<typeof NumberField>,
  "value" | "onChange" | "children" | "defaultValue"
>;

export function AppNumberField({
  label,
  value,
  onChange,
  minValue,
  maxValue,
  step,
  name,
  id,
  className = "w-full",
  inputClassName = "w-full min-w-0",
  isRequired,
  isDisabled,
  ...rest
}: AppNumberFieldProps) {
  return (
    <NumberField
      className={className}
      name={name}
      id={id}
      value={value ?? undefined}
      onChange={onChange}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      isRequired={isRequired}
      isDisabled={isDisabled}
      {...rest}
    >
      {label ? <Label>{label}</Label> : null}
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input className={inputClassName} />
        <NumberField.IncrementButton />
      </NumberField.Group>
    </NumberField>
  );
}
