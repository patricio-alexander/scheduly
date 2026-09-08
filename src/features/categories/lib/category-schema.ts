import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  commissionPct: z
    .number()
    .min(0, "Mínimo 0%")
    .max(100, "Máximo 100%")
    .optional()
    .default(0),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
