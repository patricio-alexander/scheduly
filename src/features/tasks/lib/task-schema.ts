import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "El título es requerido").max(120),
  description: z.string().trim().max(2000),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  assigneeId: z.number().int().positive().nullable(),
  dueDate: z.string().nullable(),
});

export type TaskSchemaData = z.infer<typeof taskSchema>;
