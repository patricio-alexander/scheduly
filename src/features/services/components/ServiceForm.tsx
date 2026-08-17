"use client";

import { Controller, useForm } from "react-hook-form";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema, type ServiceFormData } from "../lib/service-schema";
import type { Service } from "../types";

interface Props {
  defaultValues?: Service;
  onSubmit: (data: ServiceFormData) => Promise<void>;
  formId?: string;
}

export function ServiceForm({
  defaultValues,
  onSubmit,
  formId = "service-form",
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          price: defaultValues.price,
          durationMinutes: defaultValues.durationMinutes ?? 30,
          commissionPct: defaultValues.commissionPct ?? 15,
        }
      : { name: "", price: 0, durationMinutes: 30, commissionPct: 15 },
  });

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Nombre del servicio
        </label>
        <input
          id="name"
          placeholder="Corte de cabello"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-danger text-sm">
            {String(errors.name.message ?? "")}
          </p>
        )}
      </div>
      <Controller
        name="price"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <AppNumberField
              id="price"
              label="Precio"
              minValue={0}
              step={0.01}
              value={field.value}
              onChange={field.onChange}
            />
            {errors.price && (
              <p className="text-danger text-sm">
                {String(errors.price.message ?? "")}
              </p>
            )}
          </div>
        )}
      />
      <Controller
        name="durationMinutes"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <AppNumberField
              id="durationMinutes"
              label="Duración (minutos)"
              minValue={1}
              value={field.value}
              onChange={field.onChange}
            />
            {errors.durationMinutes && (
              <p className="text-danger text-sm">
                {String(errors.durationMinutes.message ?? "")}
              </p>
            )}
          </div>
        )}
      />
      <Controller
        name="commissionPct"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <AppNumberField
              id="commissionPct"
              label="Comisión del empleado (%)"
              minValue={0}
              maxValue={100}
              step={0.5}
              value={field.value}
              onChange={field.onChange}
            />
            <p className="text-xs text-muted">
              Porcentaje que recibe el estilista por realizar este servicio.
            </p>
            {errors.commissionPct && (
              <p className="text-danger text-sm">
                {String(errors.commissionPct.message ?? "")}
              </p>
            )}
          </div>
        )}
      />
    </form>
  );
}
