import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().optional(),
  email: z.string().email("Correo inválido").or(z.literal("")).optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

export const purchaseLineSchema = z.object({
  productId: z.number().int().positive("Selecciona un producto"),
  quantity: z.number().int().positive("Cantidad inválida"),
  unitCost: z.number().min(0, "Costo inválido"),
});

export const purchaseSchema = z.object({
  supplierId: z.number().int().positive().nullable().optional(),
  purchasedAt: z.string().optional(),
  method: z.enum(["cash", "card", "transfer"]),
  notes: z.string().optional(),
  lines: z.array(purchaseLineSchema).min(1, "Agrega al menos un producto"),
});

export type PurchaseFormData = z.infer<typeof purchaseSchema>;
