"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema, type SupplierFormData } from "../lib/purchase-schema";
import type { Supplier } from "../types";

interface Props {
  defaultValues?: Supplier;
  onSubmit: (data: SupplierFormData) => Promise<void>;
  formId?: string;
}

export function SupplierForm({
  defaultValues,
  onSubmit,
  formId = "supplier-form",
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          phone: defaultValues.phone,
          email: defaultValues.email,
          taxId: defaultValues.taxId ?? "",
          address: defaultValues.address,
        }
      : { name: "", phone: "", email: "", taxId: "", address: "" },
  });

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="supplier-name" className="text-sm font-medium">
          Nombre
        </label>
        <input
          id="supplier-name"
          placeholder="Distribuidora ABC"
          className="rounded-xl border border-separator bg-field-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("name")}
        />
        {errors.name ? (
          <p className="text-sm text-danger">{String(errors.name.message)}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="supplier-phone" className="text-sm font-medium">
            Teléfono
          </label>
          <input
            id="supplier-phone"
            placeholder="09XXXXXXXX"
            className="rounded-xl border border-separator bg-field-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
            {...register("phone")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="supplier-email" className="text-sm font-medium">
            Correo
          </label>
          <input
            id="supplier-email"
            type="email"
            placeholder="contacto@proveedor.com"
            className="rounded-xl border border-separator bg-field-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-sm text-danger">{String(errors.email.message)}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="supplier-taxId" className="text-sm font-medium">
          RUC / identificación
        </label>
        <input
          id="supplier-taxId"
          placeholder="179XXXXXXXX001"
          className="rounded-xl border border-separator bg-field-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("taxId")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="supplier-address" className="text-sm font-medium">
          Dirección
        </label>
        <textarea
          id="supplier-address"
          rows={2}
          placeholder="Dirección del proveedor"
          className="rounded-xl border border-separator bg-field-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("address")}
        />
      </div>
    </form>
  );
}
