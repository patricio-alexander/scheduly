import { apiUrl } from "@/shared/utils/api";
import type { Task, TaskFormData, TaskStatus } from "../types";

export async function getTasks(assigneeId?: number): Promise<Task[]> {
  const query =
    assigneeId != null ? `?assigneeId=${encodeURIComponent(assigneeId)}` : "";
  const res = await fetch(apiUrl(`/api/tasks${query}`));
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al cargar tareas");
  }
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as Task[]) : [];
}

export async function createTask(data: TaskFormData): Promise<Task> {
  const res = await fetch(apiUrl("/api/tasks"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al crear la tarea");
  }
  return res.json() as Promise<Task>;
}

export async function updateTask(
  id: number,
  data: Partial<TaskFormData> & { sortOrder?: number },
): Promise<Task> {
  const res = await fetch(apiUrl(`/api/tasks/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al actualizar la tarea");
  }
  return res.json() as Promise<Task>;
}

export async function moveTask(id: number, status: TaskStatus): Promise<Task> {
  return updateTask(id, { status });
}

export async function deleteTask(id: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/tasks/${id}`), { method: "DELETE" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al eliminar la tarea");
  }
}
