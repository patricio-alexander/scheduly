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

export function ServiceForm({ defaultValues, onSubmit, formId = "service-form" }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: defaultValues
      ? { name: defaultValues.name, price: defaultValues.price }
      : { name: "", price: 0 },
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">Nombre del servicio</label>
        <input
          id="name"
          placeholder="Corte de cabello"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("name")}
        />
        {errors.name && <p className="text-danger text-sm">{String(errors.name.message ?? "")}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="price" className="text-sm font-medium">Precio</label>
        <input
          id="price"
          type="number"
          placeholder="15000"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("price", { valueAsNumber: true })}
        />
        {errors.price && <p className="text-danger text-sm">{String(errors.price.message ?? "")}</p>}
      </div>
    </form>
  );
}
