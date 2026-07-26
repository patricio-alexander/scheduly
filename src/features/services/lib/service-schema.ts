import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0"),
  durationMinutes: z
    .number()
    .int("La duración debe ser un número entero")
    .min(5, "Mínimo 5 minutos")
    .max(480, "Máximo 8 horas"),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;
