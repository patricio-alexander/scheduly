import { z } from "zod";

export const unitSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  abbreviation: z
    .string()
    .min(1, "La abreviatura es requerida")
    .max(12, "Máximo 12 caracteres"),
  description: z.string().optional(),
  factor: z.number().min(0, "Debe ser 0 o mayor").optional().default(1),
});

export type UnitFormData = z.infer<typeof unitSchema>;
