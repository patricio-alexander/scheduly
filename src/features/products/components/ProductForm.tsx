"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductFormData } from "../lib/product-schema";
import type { Product } from "../types";

interface Props {
  defaultValues?: Product;
  onSubmit: (data: ProductFormData) => Promise<void>;
  formId?: string;
}

export function ProductForm({ defaultValues, onSubmit, formId = "product-form" }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues
      ? { name: defaultValues.name, price: defaultValues.price, stock: defaultValues.stock }
      : { name: "", price: 0, stock: 0 },
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="product-name" className="text-sm font-medium">Nombre del producto</label>
        <input
          id="product-name"
          placeholder="Shampoo profesional"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("name")}
        />
        {errors.name && <p className="text-danger text-sm">{String(errors.name.message ?? "")}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="product-price" className="text-sm font-medium">Precio</label>
        <input
          id="product-price"
          type="number"
          placeholder="12000"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("price", { valueAsNumber: true })}
        />
        {errors.price && <p className="text-danger text-sm">{String(errors.price.message ?? "")}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="product-stock" className="text-sm font-medium">Stock</label>
        <input
          id="product-stock"
          type="number"
          min={0}
          step={1}
          placeholder="10"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("stock", { valueAsNumber: true })}
        />
        {errors.stock && <p className="text-danger text-sm">{String(errors.stock.message ?? "")}</p>}
      </div>
    </form>
  );
}
