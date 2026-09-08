"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="category-name" className="text-sm font-medium">
          Nombre
        </label>
        <input
          id="category-name"
          placeholder="Cuidado capilar"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-danger text-sm">{String(errors.name.message ?? "")}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="category-description" className="text-sm font-medium">
          Descripción
        </label>
        <textarea
          id="category-description"
          rows={3}
          placeholder="Productos para el cuidado del cabello..."
          className="resize-none px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("description")}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="category-commission" className="text-sm font-medium">
          Comisión % productos (por defecto)
        </label>
        <input
          id="category-commission"
          type="number"
          min={0}
          max={100}
          step={0.5}
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("commissionPct", { valueAsNumber: true })}
        />
        <p className="text-xs text-muted">
          Se usa cuando el producto tiene comisión 0 (ej. ampollas 8%).
        </p>
      </div>
    </form>
  );
}
