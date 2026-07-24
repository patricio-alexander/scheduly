"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskSchema, type TaskSchemaData } from "../lib/task-schema";
import {
  taskPriorityLabel,
  taskPriorityOptions,
  taskStatusLabel,
  taskStatusOptions,
} from "../lib/task-status";
import type { Task, TaskFormData } from "../types";

interface AssigneeOption {
  id: number;
  name: string;
}

interface Props {
  defaultValues?: Task;
  defaultStatus?: Task["status"];
  assignees: AssigneeOption[];
  onSubmit: (data: TaskFormData) => Promise<void>;
  formId?: string;
}

export function TaskForm({
  defaultValues,
  defaultStatus = "todo",
  assignees,
  onSubmit,
  formId = "task-form",
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskSchemaData>({
    resolver: zodResolver(taskSchema),
    defaultValues: defaultValues
      ? {
          title: defaultValues.title,
          description: defaultValues.description ?? "",
          status: defaultValues.status,
          priority: defaultValues.priority,
          assigneeId: defaultValues.assigneeId,
          dueDate: defaultValues.dueDate
            ? defaultValues.dueDate.slice(0, 10)
            : null,
        }
      : {
          title: "",
          description: "",
          status: defaultStatus,
          priority: "medium",
          assigneeId: null,
          dueDate: null,
        },
  });

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(async (data) => {
        await onSubmit({
          title: data.title,
          description: data.description || "",
          status: data.status,
          priority: data.priority,
          assigneeId: data.assigneeId,
          dueDate: data.dueDate || null,
        });
      })}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          Título
        </label>
        <input
          id="title"
          placeholder="Ej: Reponer shampoo, limpiar estación..."
          className="rounded-xl border border-separator bg-field-background px-3 py-2 text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-danger">{errors.title.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Descripción
        </label>
        <textarea
          id="description"
          rows={3}
          placeholder="Detalles opcionales"
          className="resize-none rounded-xl border border-separator bg-field-background px-3 py-2 text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-sm font-medium">
            Estado
          </label>
          <select
            id="status"
            className="rounded-xl border border-separator bg-field-background px-3 py-2 text-field-foreground focus:outline-none focus:ring-2 focus:ring-focus"
            {...register("status")}
          >
            {taskStatusOptions.map((status) => (
              <option key={status} value={status}>
                {taskStatusLabel[status]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="priority" className="text-sm font-medium">
            Prioridad
          </label>
          <select
            id="priority"
            className="rounded-xl border border-separator bg-field-background px-3 py-2 text-field-foreground focus:outline-none focus:ring-2 focus:ring-focus"
            {...register("priority")}
          >
            {taskPriorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {taskPriorityLabel[priority]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="assigneeId" className="text-sm font-medium">
            Responsable
          </label>
          <select
            id="assigneeId"
            className="rounded-xl border border-separator bg-field-background px-3 py-2 text-field-foreground focus:outline-none focus:ring-2 focus:ring-focus"
            {...register("assigneeId", {
              setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
            })}
          >
            <option value="">Sin asignar</option>
            {assignees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dueDate" className="text-sm font-medium">
            Fecha límite
          </label>
          <input
            id="dueDate"
            type="date"
            className="rounded-xl border border-separator bg-field-background px-3 py-2 text-field-foreground focus:outline-none focus:ring-2 focus:ring-focus"
            {...register("dueDate", {
              setValueAs: (v) => (v === "" || v == null ? null : String(v)),
            })}
          />
        </div>
      </div>
    </form>
  );
}
