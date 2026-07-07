"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerFormData } from "../lib/customer-schema";
import type { Customer } from "../types";

interface Props {
  defaultValues?: Customer;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  formId?: string;
}

export function CustomerForm({ defaultValues, onSubmit, formId = "customer-form" }: Props) {
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
        }
      : undefined,
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">Nombre</label>
        <input
          id="name"
          placeholder="Nombre"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("name")}
        />
        {errors.name && <p className="text-danger text-sm">{String(errors.name.message ?? "")}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="lastnames" className="text-sm font-medium">Apellidos</label>
        <input
          id="lastnames"
          placeholder="Apellidos"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("lastnames")}
        />
        {errors.lastnames && <p className="text-danger text-sm">{String(errors.lastnames.message ?? "")}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium">Teléfono</label>
        <input
          id="phone"
          placeholder="+56 9 1234 5678"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("phone")}
        />
        {errors.phone && <p className="text-danger text-sm">{String(errors.phone.message ?? "")}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">Correo electrónico</label>
        <input
          id="email"
          type="email"
          placeholder="cliente@correo.com"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("email")}
        />
        {errors.email && <p className="text-danger text-sm">{String(errors.email.message ?? "")}</p>}
      </div>
    </form>
  );
}
