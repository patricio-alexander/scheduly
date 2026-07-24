import type { TaskPriority, TaskStatus } from "../types";

export const taskStatusOptions: TaskStatus[] = ["todo", "in_progress", "done"];

export const taskStatusLabel: Record<TaskStatus, string> = {
  todo: "Por hacer",
  in_progress: "En progreso",
  done: "Hecho",
};

export const taskStatusTone: Record<
  TaskStatus,
  { dot: string; header: string; column: string }
> = {
  todo: {
    dot: "bg-muted",
    header: "text-muted",
    column: "border-separator",
  },
  in_progress: {
    dot: "bg-accent",
    header: "text-accent",
    column: "border-accent/25",
  },
  done: {
    dot: "bg-emerald-500",
    header: "text-emerald-600 dark:text-emerald-400",
    column: "border-emerald-500/25",
  },
};

export const taskPriorityOptions: TaskPriority[] = ["low", "medium", "high"];

export const taskPriorityLabel: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const taskPriorityTone: Record<TaskPriority, string> = {
  low: "bg-surface-secondary text-muted",
  medium: "bg-accent/10 text-accent",
  high: "bg-danger/15 text-danger",
};
