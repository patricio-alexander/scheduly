"use client";

import { SelectField } from "@/shared/components/SelectField";

export type StaffMember = {
  id: number;
  name: string;
  role?: string;
};

export function StaffSelector({
  staff,
  value,
  onChange,
  className = "",
  label,
}: {
  staff: StaffMember[];
  value: number | "all";
  onChange: (value: number | "all") => void;
  className?: string;
  label?: string;
}) {
  const options = [
    { id: "all", label: "Todos los empleados" },
    ...staff.map((member) => ({
      id: String(member.id),
      label: member.name,
    })),
  ];

  return (
    <SelectField
      label={label}
      className={className || "w-full"}
      placeholder="Todos los empleados"
      selectedKey={value === "all" ? "all" : String(value)}
      onSelectionChange={(key) => {
        if (key == null || key === "all") onChange("all");
        else onChange(Number(key));
      }}
      options={options}
    />
  );
}
