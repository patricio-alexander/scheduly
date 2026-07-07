import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0"),
  stock: z.number().int().min(0, "El stock debe ser mayor o igual a 0"),
});

export type ProductFormData = z.infer<typeof productSchema>;
