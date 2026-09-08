"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { unitSchema, type UnitFormData } from "../lib/unit-schema";
import type { Unit } from "../types";

interface Props {
  defaultValues?: Unit;
  onSubmit: (data: UnitFormData) => Promise<void>;
  formId?: string;
}

export function UnitForm({
  defaultValues,
  onSubmit,
  formId = "unit-form",
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          abbreviation: defaultValues.abbreviation,
          description: defaultValues.description ?? "",
          factor: defaultValues.factor ?? 1,
        }
      : { name: "", abbreviation: "", description: "", factor: 1 },
  });

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="unit-name" className="text-sm font-medium">
          Nombre
        </label>
        <input
          id="unit-name"
          placeholder="Mililitro, Litro, Unidad…"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-danger text-sm">
            {String(errors.name.message ?? "")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="unit-abbr" className="text-sm font-medium">
          Abreviatura
        </label>
        <input
          id="unit-abbr"
          placeholder="ml, L, und, g…"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("abbreviation")}
        />
        {errors.abbreviation && (
          <p className="text-danger text-sm">
            {String(errors.abbreviation.message ?? "")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="unit-description" className="text-sm font-medium">
          Descripción
        </label>
        <textarea
          id="unit-description"
          rows={2}
          placeholder="Para líquidos, sólidos, conteo…"
          className="resize-none px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("description")}
        />
      </div>

      <Controller
        name="factor"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <AppNumberField
              id="unit-factor"
              label="Factor (opcional)"
              minValue={0}
              step={0.001}
              value={field.value ?? 1}
              onChange={field.onChange}
            />
            <p className="text-xs text-muted">
              Relación respecto a la unidad base (ej. 1000 ml = 1 L).
            </p>
            {errors.factor && (
              <p className="text-danger text-sm">
                {String(errors.factor.message ?? "")}
              </p>
            )}
          </div>
        )}
      />
    </form>
  );
}
