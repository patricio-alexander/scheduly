"use client";

import type { Task } from "../types";
import {
  taskPriorityLabel,
  taskPriorityTone,
} from "../lib/task-status";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import Person from "@gravity-ui/icons/Person";
import Calendar from "@gravity-ui/icons/Calendar";

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onConfirm?: (task: Task) => void;
  canConfirm?: boolean;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
}

function formatDueDate(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onConfirm,
  canConfirm,
  onDragStart,
  onDragEnd,
  isDragging,
}: Props) {
  const overdue =
    task.dueDate &&
    task.status !== "done" &&
    new Date(task.dueDate).setHours(0, 0, 0, 0) <
      new Date().setHours(0, 0, 0, 0);

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(task.id));
        e.dataTransfer.effectAllowed = "move";
        onDragStart(task);
      }}
      onDragEnd={onDragEnd}
      className={`group cursor-grab rounded-xl border border-separator bg-surface p-3 shadow-sm active:cursor-grabbing ${
        isDragging ? "opacity-40 ring-2 ring-accent/40" : ""
      } ${task.status === "done" ? "opacity-80" : ""} ${
        task.systemSuggested && task.status !== "done"
          ? "border-accent/40 ring-1 ring-accent/25"
          : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold leading-snug ${
              task.status === "done" ? "text-muted line-through" : ""
            }`}
          >
            {task.title}
          </p>
          {task.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted">
              {task.description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-secondary hover:text-foreground"
            aria-label="Editar tarea"
          >
            <Pencil width={14} height={14} />
          </button>
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(task)}
              className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
              aria-label="Eliminar tarea"
            >
              <TrashBin width={14} height={14} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${taskPriorityTone[task.priority]}`}
        >
          {taskPriorityLabel[task.priority]}
        </span>
        {task.systemSuggested && task.status !== "done" ? (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
            Sistema: ya hecho · falta Dueña
          </span>
        ) : null}
        {task.ownerConfirmed ? (
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
            Confirmado Dueña
          </span>
        ) : null}
        {task.createdByRole === "programmer" ? (
          <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-muted">
            Mandato Prog.
          </span>
        ) : null}
        {task.dueDate ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              overdue
                ? "bg-danger/15 text-danger"
                : "bg-surface-secondary text-muted"
            }`}
          >
            <Calendar width={10} height={10} />
            {formatDueDate(task.dueDate)}
          </span>
        ) : null}
        {task.assignee ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-muted">
            <Person width={10} height={10} />
            {task.assignee.name.split(" ")[0]}
          </span>
        ) : null}
      </div>

      {canConfirm && onConfirm && task.status !== "done" && task.systemSuggested ? (
        <button
          type="button"
          onClick={() => onConfirm(task)}
          className="mt-3 w-full rounded-lg bg-accent px-2 py-1.5 text-[11px] font-semibold text-accent-foreground hover:brightness-110"
        >
          Confirmar cumplimiento (Dueña)
        </button>
      ) : null}
    </article>
  );
}
