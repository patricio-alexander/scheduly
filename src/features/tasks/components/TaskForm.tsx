"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskSchema, type TaskSchemaData } from "../lib/task-schema";
import {
  taskPriorityLabel,
  taskPriorityOptions,
  taskStatusLabel,
  taskStatusOptions,
} from "../lib/task-status";
import type { Task, TaskFormData } from "../types";
import { SelectField } from "@/shared/components/SelectField";
import {
  ENTITY_FIELD_CLASS,
  ENTITY_FORM_CLASS,
} from "@/shared/components/entity-modal";

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
    control,
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
      className={ENTITY_FORM_CLASS}
    >
      <div className="flex flex-col gap-0.5" data-tour="tasks-form-title">
        <label htmlFor="title" className="font-medium">
          Título
        </label>
        <input
          id="title"
          placeholder="Ej: Reponer shampoo…"
          className={ENTITY_FIELD_CLASS}
          {...register("title")}
        />
        {errors.title && (
          <p className="text-danger">{errors.title.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-0.5" data-tour="tasks-form-description">
        <label htmlFor="description" className="font-medium">
          Descripción
        </label>
        <textarea
          id="description"
          rows={2}
          placeholder="Detalles opcionales"
          className={`${ENTITY_FIELD_CLASS} resize-none`}
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <SelectField
              label="Estado"
              selectedKey={field.value}
              onSelectionChange={(key) => field.onChange(key ?? field.value)}
              options={taskStatusOptions.map((status) => ({
                id: status,
                label: taskStatusLabel[status],
              }))}
            />
          )}
        />
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <SelectField
              label="Prioridad"
              selectedKey={field.value}
              onSelectionChange={(key) => field.onChange(key ?? field.value)}
              options={taskPriorityOptions.map((priority) => ({
                id: priority,
                label: taskPriorityLabel[priority],
              }))}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Controller
          name="assigneeId"
          control={control}
          render={({ field }) => (
            <SelectField
              label="Responsable"
              placeholder="Sin asignar"
              selectedKey={
                field.value != null ? String(field.value) : "none"
              }
              onSelectionChange={(key) =>
                field.onChange(
                  key == null || key === "none" ? null : Number(key),
                )
              }
              options={[
                { id: "none", label: "Sin asignar" },
                ...assignees.map((user) => ({
                  id: String(user.id),
                  label: user.name,
                })),
              ]}
            />
          )}
        />
        <div className="flex flex-col gap-0.5">
          <label htmlFor="dueDate" className="font-medium">
            Fecha límite
          </label>
          <input
            id="dueDate"
            type="date"
            className={ENTITY_FIELD_CLASS}
            {...register("dueDate", {
              setValueAs: (v) => (v === "" || v == null ? null : String(v)),
            })}
          />
        </div>
      </div>
    </form>
  );
}
