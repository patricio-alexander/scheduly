"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppNumberField } from "@/shared/components/AppNumberField";
import {
  ENTITY_FIELD_CLASS,
  ENTITY_FORM_CLASS,
} from "@/shared/components/entity-modal";
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
      className={ENTITY_FORM_CLASS}
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5" data-tour="units-form-name">
          <label htmlFor="unit-name" className="font-medium">
            Nombre
          </label>
          <input
            id="unit-name"
            placeholder="Mililitro, Litro…"
            className={ENTITY_FIELD_CLASS}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-danger">{String(errors.name.message ?? "")}</p>
          )}
        </div>
        <div
          className="flex flex-col gap-0.5"
          data-tour="units-form-abbreviation"
        >
          <label htmlFor="unit-abbr" className="font-medium">
            Abreviatura
          </label>
          <input
            id="unit-abbr"
            placeholder="ml, L, und…"
            className={ENTITY_FIELD_CLASS}
            {...register("abbreviation")}
          />
          {errors.abbreviation && (
            <p className="text-danger">
              {String(errors.abbreviation.message ?? "")}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <label htmlFor="unit-description" className="font-medium">
          Descripción
        </label>
        <textarea
          id="unit-description"
          rows={2}
          placeholder="Para líquidos, sólidos, conteo…"
          className={`${ENTITY_FIELD_CLASS} resize-none`}
          {...register("description")}
        />
      </div>

      <Controller
        name="factor"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-0.5">
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
              <p className="text-danger">
                {String(errors.factor.message ?? "")}
              </p>
            )}
          </div>
        )}
      />
    </form>
  );
}
