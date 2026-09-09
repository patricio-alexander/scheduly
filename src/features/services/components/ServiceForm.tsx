"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ENTITY_FIELD_CLASS,
  ENTITY_FORM_CLASS,
} from "@/shared/components/entity-modal";
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
          commissionPct: defaultValues.commissionPct ?? 15,
        }
      : { name: "", price: 0, durationMinutes: 30, commissionPct: 15 },
  });

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      className={ENTITY_FORM_CLASS}
    >
      <div className="flex flex-col gap-0.5" data-tour="services-form-name">
        <label htmlFor="name" className="font-medium">
          Nombre del servicio
        </label>
        <input
          id="name"
          placeholder="Corte de cabello"
          className={ENTITY_FIELD_CLASS}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-danger">{String(errors.name.message ?? "")}</p>
        )}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <div className="flex flex-col gap-0.5" data-tour="services-form-price">
          <label htmlFor="price" className="font-medium">
            Precio
          </label>
          <input
            id="price"
            type="number"
            min={0}
            step={0.01}
            className={ENTITY_FIELD_CLASS}
            {...register("price", { valueAsNumber: true })}
          />
          {errors.price && (
            <p className="text-danger">{String(errors.price.message ?? "")}</p>
          )}
        </div>
        <div
          className="flex flex-col gap-0.5"
          data-tour="services-form-duration"
        >
          <label htmlFor="durationMinutes" className="font-medium">
            Duración (min)
          </label>
          <input
            id="durationMinutes"
            type="number"
            min={1}
            step={1}
            className={ENTITY_FIELD_CLASS}
            {...register("durationMinutes", { valueAsNumber: true })}
          />
          {errors.durationMinutes && (
            <p className="text-danger">
              {String(errors.durationMinutes.message ?? "")}
            </p>
          )}
        </div>
        <div
          className="flex flex-col gap-0.5"
          data-tour="services-form-commission"
        >
          <label htmlFor="commissionPct" className="font-medium">
            Comisión %
          </label>
          <input
            id="commissionPct"
            type="number"
            min={0}
            max={100}
            step={0.5}
            className={ENTITY_FIELD_CLASS}
            {...register("commissionPct", { valueAsNumber: true })}
          />
          {errors.commissionPct && (
            <p className="text-danger">
              {String(errors.commissionPct.message ?? "")}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted">
        Comisión: porcentaje que recibe el estilista por este servicio.
      </p>
    </form>
  );
}
