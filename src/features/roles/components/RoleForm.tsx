"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { roleSchema, type RoleFormData } from "../lib/role-schema";
import type { Role } from "../types";

interface Props {
  defaultValues?: Role;
  onSubmit: (data: RoleFormData) => Promise<void>;
  formId?: string;
}

export function RoleForm({
  defaultValues,
  onSubmit,
  formId = "role-form",
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: defaultValues
      ? { name: defaultValues.name }
      : { name: "" },
  });

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="role-name" className="text-sm font-medium">
          Nombre del rol
        </label>
        <input
          id="role-name"
          placeholder="ej: Recepción"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-danger text-sm">
            {String(errors.name.message ?? "")}
          </p>
        )}
      </div>
    </form>
  );
}
