import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0"),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;
