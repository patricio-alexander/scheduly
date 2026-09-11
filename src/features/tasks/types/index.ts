export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskAssignee {
  id: number;
  name: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: number | null;
  dueDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  assignee: TaskAssignee | null;
  mandateKey?: string | null;
  createdByRole?: string | null;
  /** Sistema detectó cumplimiento; falta check de Dueña */
  systemSuggested?: boolean;
  systemSuggestedAt?: string | null;
  ownerConfirmed?: boolean;
  ownerConfirmedAt?: string | null;
  checkedAt?: string | null;
  message?: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: number | null;
  dueDate: string | null;
}
