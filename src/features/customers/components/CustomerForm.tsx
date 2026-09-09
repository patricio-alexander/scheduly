"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ENTITY_FIELD_CLASS,
  ENTITY_FORM_CLASS,
} from "@/shared/components/entity-modal";
import { customerSchema, type CustomerFormData } from "../lib/customer-schema";
import type { Customer } from "../types";

interface Props {
  defaultValues?: Customer;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  formId?: string;
}

export function CustomerForm({
  defaultValues,
  onSubmit,
  formId = "customer-form",
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          lastnames: defaultValues.lastnames,
          phone: defaultValues.phone,
          email: defaultValues.email,
          identificationType: defaultValues.identificationType ?? "",
          identification: defaultValues.identification ?? "",
          address: defaultValues.address ?? "",
        }
      : undefined,
  });

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      className={ENTITY_FORM_CLASS}
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5" data-tour="customers-form-name">
          <label htmlFor="name" className="font-medium">
            Nombre
          </label>
          <input
            id="name"
            placeholder="Nombre"
            className={ENTITY_FIELD_CLASS}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-danger">{String(errors.name.message ?? "")}</p>
          )}
        </div>
        <div
          className="flex flex-col gap-0.5"
          data-tour="customers-form-lastnames"
        >
          <label htmlFor="lastnames" className="font-medium">
            Apellidos
          </label>
          <input
            id="lastnames"
            placeholder="Apellidos"
            className={ENTITY_FIELD_CLASS}
            {...register("lastnames")}
          />
          {errors.lastnames && (
            <p className="text-danger">
              {String(errors.lastnames.message ?? "")}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5" data-tour="customers-form-phone">
          <label htmlFor="phone" className="font-medium">
            Teléfono
          </label>
          <input
            id="phone"
            placeholder="+56 9 1234 5678"
            className={ENTITY_FIELD_CLASS}
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-danger">{String(errors.phone.message ?? "")}</p>
          )}
        </div>
        <div className="flex flex-col gap-0.5" data-tour="customers-form-email">
          <label htmlFor="email" className="font-medium">
            Correo
          </label>
          <input
            id="email"
            type="email"
            placeholder="cliente@correo.com"
            className={ENTITY_FIELD_CLASS}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-danger">{String(errors.email.message ?? "")}</p>
          )}
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <label htmlFor="identificationType" className="font-medium">
            Tipo ID (SRI)
          </label>
          <select
            id="identificationType"
            className={ENTITY_FIELD_CLASS}
            {...register("identificationType")}
          >
            <option value="">Sin identificación</option>
            <option value="04">RUC</option>
            <option value="05">Cédula</option>
            <option value="06">Pasaporte</option>
            <option value="07">Consumidor final</option>
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <label htmlFor="identification" className="font-medium">
            Identificación
          </label>
          <input
            id="identification"
            placeholder="1724589630"
            className={ENTITY_FIELD_CLASS}
            {...register("identification")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <label htmlFor="address" className="font-medium">
          Dirección
        </label>
        <input
          id="address"
          placeholder="Dirección para facturación"
          className={ENTITY_FIELD_CLASS}
          {...register("address")}
        />
      </div>
    </form>
  );
}
