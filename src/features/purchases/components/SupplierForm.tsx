"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ENTITY_FIELD_CLASS,
  ENTITY_FORM_CLASS,
} from "@/shared/components/entity-modal";
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
      className={ENTITY_FORM_CLASS}
    >
      <div className="flex flex-col gap-0.5" data-tour="suppliers-form-name">
        <label htmlFor="supplier-name" className="font-medium">
          Nombre
        </label>
        <input
          id="supplier-name"
          placeholder="Distribuidora ABC"
          className={ENTITY_FIELD_CLASS}
          {...register("name")}
        />
        {errors.name ? (
          <p className="text-danger">{String(errors.name.message)}</p>
        ) : null}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5" data-tour="suppliers-form-phone">
          <label htmlFor="supplier-phone" className="font-medium">
            Teléfono
          </label>
          <input
            id="supplier-phone"
            placeholder="09XXXXXXXX"
            className={ENTITY_FIELD_CLASS}
            {...register("phone")}
          />
        </div>
        <div className="flex flex-col gap-0.5" data-tour="suppliers-form-email">
          <label htmlFor="supplier-email" className="font-medium">
            Correo
          </label>
          <input
            id="supplier-email"
            type="email"
            placeholder="contacto@proveedor.com"
            className={ENTITY_FIELD_CLASS}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-danger">{String(errors.email.message)}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <label htmlFor="supplier-taxId" className="font-medium">
            RUC / ID
          </label>
          <input
            id="supplier-taxId"
            placeholder="179XXXXXXXX001"
            className={ENTITY_FIELD_CLASS}
            {...register("taxId")}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label htmlFor="supplier-address" className="font-medium">
            Dirección
          </label>
          <input
            id="supplier-address"
            placeholder="Dirección del proveedor"
            className={ENTITY_FIELD_CLASS}
            {...register("address")}
          />
        </div>
      </div>
    </form>
  );
}
