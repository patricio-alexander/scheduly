import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  lastnames: z.string().min(1, "Los apellidos son requeridos"),
  phone: z.string().min(1, "El teléfono es requerido"),
  email: z.string().email("Correo inválido"),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
