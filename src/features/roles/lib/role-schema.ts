import { z } from "zod";

export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(50, "Máximo 50 caracteres"),
});

export type RoleFormData = z.infer<typeof roleSchema>;
