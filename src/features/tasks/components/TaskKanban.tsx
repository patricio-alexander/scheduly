"use client";

import { useMemo, useState } from "react";
import Plus from "@gravity-ui/icons/Plus";
import { Skeleton } from "@/shared/components/ui";
import { TaskCard } from "./TaskCard";
import {
  taskStatusLabel,
  taskStatusOptions,
  taskStatusTone,
} from "../lib/task-status";
import type { Task, TaskStatus } from "../types";

interface Props {
  tasks: Task[];
  loading?: boolean;
  onAdd?: (status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onConfirm?: (task: Task) => void;
  canConfirm?: boolean;
  onMove: (taskId: number, status: TaskStatus) => Promise<void> | void;
}

export function TaskKanban({
  tasks,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onConfirm,
  canConfirm,
  onMove,
}: Props) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const task of tasks) {
      map[task.status]?.push(task);
    }
    for (const status of taskStatusOptions) {
      map[status].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [tasks]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {taskStatusOptions.map((status) => (
          <div
            key={status}
            className="flex flex-col gap-3 rounded-2xl border border-separator bg-surface-secondary/40 p-3"
          >
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
      {taskStatusOptions.map((status) => {
        const tone = taskStatusTone[status];
        const columnTasks = byStatus[status];
        const isOver = overStatus === status;

        return (
          <section
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverStatus(status);
            }}
            onDragLeave={() => {
              setOverStatus((prev) => (prev === status ? null : prev));
            }}
            onDrop={(e) => {
              e.preventDefault();
              const raw = e.dataTransfer.getData("text/plain");
              const id = Number(raw);
              setOverStatus(null);
              setDraggingId(null);
              if (!Number.isFinite(id)) return;
              const task = tasks.find((t) => t.id === id);
              if (!task || task.status === status) return;
              void onMove(id, status);
            }}
            className={`flex min-h-[28rem] flex-col rounded-2xl border bg-surface-secondary/30 p-3 transition-colors ${
              isOver
                ? "border-accent/50 bg-accent/5"
                : tone.column
            }`}
          >
            <header className="mb-3 flex items-center justify-between gap-2 px-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                <h2 className={`text-sm font-semibold ${tone.header}`}>
                  {taskStatusLabel[status]}
                </h2>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted">
                  {columnTasks.length}
                </span>
              </div>
              {onAdd ? (
                <button
                  type="button"
                  onClick={() => onAdd(status)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-surface hover:text-foreground"
                >
                  <Plus width={12} height={12} />
                  Agregar
                </button>
              ) : null}
            </header>

            <div className="flex flex-1 flex-col gap-2">
              {columnTasks.length === 0 ? (
                <div
                  className={`flex flex-1 items-center justify-center rounded-xl border border-dashed px-3 py-8 text-center text-xs text-muted ${
                    isOver ? "border-accent/40 text-accent" : "border-separator"
                  }`}
                >
                  {isOver
                    ? "Soltar aquí"
                    : onAdd
                      ? "Sin tareas · arrastra aquí o agrega una"
                      : "Sin tareas · arrastra aquí"}
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isDragging={draggingId === task.id}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onConfirm={onConfirm}
                    canConfirm={canConfirm}
                    onDragStart={(t) => setDraggingId(t.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setOverStatus(null);
                    }}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
