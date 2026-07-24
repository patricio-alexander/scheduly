"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task, TaskFormData, TaskStatus } from "../types";
import * as taskService from "../services/task-service";
import { useTaskSocket } from "./useTaskSocket";

type UseTasksOptions = {
  /** Si se pasa, solo carga tareas de ese asignado */
  assigneeId?: number | null;
};

function matchesAssigneeFilter(
  task: Task,
  assigneeId: number | null | undefined,
) {
  if (assigneeId == null) return true;
  return task.assigneeId === assigneeId;
}

export function useTasks(options: UseTasksOptions = {}) {
  const { assigneeId } = options;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskService.getTasks(
        assigneeId != null ? assigneeId : undefined,
      );
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar tareas");
    } finally {
      setLoading(false);
    }
  }, [assigneeId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useTaskSocket({
    onCreated: (task) => {
      if (!matchesAssigneeFilter(task, assigneeId)) return;
      setTasks((prev) => {
        if (prev.some((t) => t.id === task.id)) {
          return prev.map((t) => (t.id === task.id ? task : t));
        }
        return [...prev, task];
      });
    },
    onUpdated: (task) => {
      setTasks((prev) => {
        const exists = prev.some((t) => t.id === task.id);
        if (!matchesAssigneeFilter(task, assigneeId)) {
          return exists ? prev.filter((t) => t.id !== task.id) : prev;
        }
        if (exists) {
          return prev.map((t) => (t.id === task.id ? task : t));
        }
        return [...prev, task];
      });
    },
    onDeleted: (id) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    },
  });

  const create = useCallback(async (data: TaskFormData) => {
    const task = await taskService.createTask(data);
    setTasks((prev) => {
      if (prev.some((t) => t.id === task.id)) return prev;
      return [...prev, task];
    });
    return task;
  }, []);

  const update = useCallback(
    async (id: number, data: Partial<TaskFormData>) => {
      const task = await taskService.updateTask(id, data);
      setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
      return task;
    },
    [],
  );

  const move = useCallback(
    async (id: number, status: TaskStatus) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t)),
      );
      try {
        const task = await taskService.moveTask(id, status);
        setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
        return task;
      } catch (e) {
        await refetch();
        throw e;
      }
    },
    [refetch],
  );

  const remove = useCallback(async (id: number) => {
    await taskService.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    tasks,
    loading,
    error,
    refetch,
    create,
    update,
    move,
    remove,
  };
}
