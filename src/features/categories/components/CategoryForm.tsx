"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ENTITY_FIELD_CLASS,
  ENTITY_FORM_CLASS,
} from "@/shared/components/entity-modal";
import { categorySchema, type CategoryFormData } from "../lib/category-schema";
import type { Category } from "../types";

interface Props {
  defaultValues?: Category;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  formId?: string;
}

export function CategoryForm({
  defaultValues,
  onSubmit,
  formId = "category-form",
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          description: defaultValues.description ?? "",
          commissionPct: defaultValues.commissionPct ?? 0,
        }
      : { name: "", description: "", commissionPct: 0 },
  });

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      className={ENTITY_FORM_CLASS}
    >
      <div className="flex flex-col gap-0.5" data-tour="categories-form-name">
        <label htmlFor="category-name" className="font-medium">
          Nombre
        </label>
        <input
          id="category-name"
          placeholder="Cuidado capilar"
          className={ENTITY_FIELD_CLASS}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-danger">{String(errors.name.message ?? "")}</p>
        )}
      </div>
      <div
        className="flex flex-col gap-0.5"
        data-tour="categories-form-description"
      >
        <label htmlFor="category-description" className="font-medium">
          Descripción
        </label>
        <textarea
          id="category-description"
          rows={2}
          placeholder="Productos para el cuidado del cabello..."
          className={`${ENTITY_FIELD_CLASS} resize-none`}
          {...register("description")}
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <label htmlFor="category-commission" className="font-medium">
          Comisión % productos (por defecto)
        </label>
        <input
          id="category-commission"
          type="number"
          min={0}
          max={100}
          step={0.5}
          className={ENTITY_FIELD_CLASS}
          {...register("commissionPct", { valueAsNumber: true })}
        />
        <p className="text-xs text-muted">
          Se usa cuando el producto tiene comisión 0.
        </p>
      </div>
    </form>
  );
}
