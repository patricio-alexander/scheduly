"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ENTITY_FIELD_CLASS,
  ENTITY_FORM_CLASS,
} from "@/shared/components/entity-modal";
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
      className={ENTITY_FORM_CLASS}
    >
      <div className="flex flex-col gap-0.5" data-tour="roles-form-name">
        <label htmlFor="role-name" className="font-medium">
          Nombre del rol
        </label>
        <input
          id="role-name"
          placeholder="ej: Recepción"
          className={ENTITY_FIELD_CLASS}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-danger">{String(errors.name.message ?? "")}</p>
        )}
      </div>
    </form>
  );
}
