"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ComboBox, Input, Label, ListBox } from "@heroui/react";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { productSchema, type ProductFormData } from "../lib/product-schema";
import type { Product } from "../types";
import type { Category } from "@/src/features/categories";
import type { Unit } from "@/src/features/units";

interface Props {
  defaultValues?: Product;
  categories: Category[];
  units: Unit[];
  onSubmit: (data: ProductFormData) => Promise<void>;
  formId?: string;
}

export function ProductForm({
  defaultValues,
  categories,
  units,
  onSubmit,
  formId = "product-form",
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          price: defaultValues.price,
          stock: defaultValues.stock,
          categoryId: defaultValues.categoryId ?? defaultValues.category?.id ?? null,
          unitId: defaultValues.unitId ?? defaultValues.unit?.id ?? null,
          commissionPct: defaultValues.commissionPct ?? 0,
        }
      : {
          name: "",
          price: 0,
          stock: 0,
          categoryId: null,
          unitId: units[0]?.id ?? null,
          commissionPct: 0,
        },
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="product-name" className="text-sm font-medium">
          Nombre del producto
        </label>
        <input
          id="product-name"
          placeholder="Shampoo profesional"
          className="px-3 py-2 rounded-xl border border-separator bg-field-background text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-danger text-sm">{String(errors.name.message ?? "")}</p>
        )}
      </div>

      <Controller
        name="categoryId"
        control={control}
        render={({ field }) => (
          <ComboBox
            selectedKey={field.value != null ? String(field.value) : "none"}
            onSelectionChange={(key) => {
              const value = String(key ?? "none");
              field.onChange(value === "none" ? null : Number(value));
            }}
            variant="secondary"
          >
            <Label className="text-sm font-medium">Categoría</Label>
            <ComboBox.InputGroup>
              <Input placeholder="Seleccionar categoría..." />
              <ComboBox.Trigger />
            </ComboBox.InputGroup>
            <ComboBox.Popover>
              <ListBox>
                <ListBox.Item id="none" textValue="Sin categoría">
                  Sin categoría
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {categories.map((category) => (
                  <ListBox.Item
                    key={String(category.id)}
                    id={String(category.id)}
                    textValue={category.name}
                  >
                    {category.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </ComboBox.Popover>
          </ComboBox>
        )}
      />

      <Controller
        name="unitId"
        control={control}
        render={({ field }) => (
          <ComboBox
            selectedKey={field.value != null ? String(field.value) : "none"}
            onSelectionChange={(key) => {
              const value = String(key ?? "none");
              field.onChange(value === "none" ? null : Number(value));
            }}
            variant="secondary"
          >
            <Label className="text-sm font-medium">Unidad de medida</Label>
            <ComboBox.InputGroup>
              <Input placeholder="ml, L, und…" />
              <ComboBox.Trigger />
            </ComboBox.InputGroup>
            <ComboBox.Popover>
              <ListBox>
                <ListBox.Item id="none" textValue="Por defecto">
                  Por defecto
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {units.map((unit) => (
                  <ListBox.Item
                    key={String(unit.id)}
                    id={String(unit.id)}
                    textValue={`${unit.name} (${unit.abbreviation})`}
                  >
                    {unit.name} ({unit.abbreviation})
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </ComboBox.Popover>
          </ComboBox>
        )}
      />

      <Controller
        name="price"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <AppNumberField
              id="product-price"
              label="Precio"
              minValue={0}
              value={field.value}
              onChange={field.onChange}
            />
            {errors.price && (
              <p className="text-danger text-sm">{String(errors.price.message ?? "")}</p>
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
              id="product-commission"
              label="Comisión % (0 = hereda de categoría)"
              minValue={0}
              maxValue={100}
              value={field.value ?? 0}
              onChange={field.onChange}
            />
            {errors.commissionPct && (
              <p className="text-danger text-sm">
                {String(errors.commissionPct.message ?? "")}
              </p>
            )}
          </div>
        )}
      />

      <Controller
        name="stock"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <AppNumberField
              id="product-stock"
              label="Stock"
              minValue={0}
              step={1}
              value={field.value}
              onChange={field.onChange}
            />
            {errors.stock && (
              <p className="text-danger text-sm">{String(errors.stock.message ?? "")}</p>
            )}
          </div>
        )}
      />
    </form>
  );
}
