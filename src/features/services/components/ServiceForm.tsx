"use client";

import { useForm } from "react-hook-form";
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
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          price: defaultValues.price,
          durationMinutes: defaultValues.durationMinutes ?? 30,
        }
      : { name: "", price: 0, durationMinutes: 30 },
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
      <div className="flex flex-col gap-1">
        <label htmlFor="price" className="text-sm font-medium">
          Precio
        </label>
        <input
          id="price"
          type="number"
          step="0.01"
          placeholder="6"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("price", { valueAsNumber: true })}
        />
        {errors.price && (
          <p className="text-danger text-sm">
            {String(errors.price.message ?? "")}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="durationMinutes" className="text-sm font-medium">
          Duración (minutos)
        </label>
        <input
          id="durationMinutes"
          type="number"
          placeholder="30"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("durationMinutes", { valueAsNumber: true })}
        />
        {errors.durationMinutes && (
          <p className="text-danger text-sm">
            {String(errors.durationMinutes.message ?? "")}
          </p>
        )}
      </div>
    </form>
  );
}
