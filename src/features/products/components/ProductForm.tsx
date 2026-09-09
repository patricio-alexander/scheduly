"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ComboBox, Input, Label, ListBox } from "@heroui/react";
import {
  ENTITY_FIELD_CLASS,
  ENTITY_FORM_CLASS,
} from "@/shared/components/entity-modal";
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
          categoryId:
            defaultValues.categoryId ?? defaultValues.category?.id ?? null,
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
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      className={ENTITY_FORM_CLASS}
    >
      <div className="flex flex-col gap-0.5" data-tour="products-form-name">
        <label htmlFor="product-name" className="font-medium">
          Nombre del producto
        </label>
        <input
          id="product-name"
          placeholder="Shampoo profesional"
          className={ENTITY_FIELD_CLASS}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-danger">{String(errors.name.message ?? "")}</p>
        )}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div data-tour="products-form-category">
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <ComboBox
                selectedKey={
                  field.value != null ? String(field.value) : "none"
                }
                onSelectionChange={(key) => {
                  const value = String(key ?? "none");
                  field.onChange(value === "none" ? null : Number(value));
                }}
                variant="secondary"
              >
                <Label className="text-sm font-medium">Categoría</Label>
                <ComboBox.InputGroup>
                  <Input placeholder="Seleccionar…" />
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
        </div>

        <div data-tour="products-form-unit">
          <Controller
            name="unitId"
            control={control}
            render={({ field }) => (
              <ComboBox
                selectedKey={
                  field.value != null ? String(field.value) : "none"
                }
                onSelectionChange={(key) => {
                  const value = String(key ?? "none");
                  field.onChange(value === "none" ? null : Number(value));
                }}
                variant="secondary"
              >
                <Label className="text-sm font-medium">Unidad</Label>
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
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <div className="flex flex-col gap-0.5" data-tour="products-form-price">
          <label htmlFor="product-price" className="font-medium">
            Precio
          </label>
          <input
            id="product-price"
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
          data-tour="products-form-commission"
        >
          <label htmlFor="product-commission" className="font-medium">
            Comisión %
          </label>
          <input
            id="product-commission"
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
        <div className="flex flex-col gap-0.5" data-tour="products-form-stock">
          <label htmlFor="product-stock" className="font-medium">
            Stock
          </label>
          <input
            id="product-stock"
            type="number"
            min={0}
            step={1}
            className={ENTITY_FIELD_CLASS}
            {...register("stock", { valueAsNumber: true })}
          />
          {errors.stock && (
            <p className="text-danger">{String(errors.stock.message ?? "")}</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted">
        Comisión 0 = hereda el % de la categoría.
      </p>
    </form>
  );
}
