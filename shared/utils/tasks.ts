import { prisma } from "@/shared/utils/prisma";

export type TaskDto = {
  id: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high";
  assigneeId: number | null;
  dueDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  assignee: { id: number; name: string } | null;
  mandateKey: string | null;
  createdByRole: string | null;
  systemSuggestedAt: string | null;
  systemSuggested: boolean;
  ownerConfirmedAt: string | null;
  ownerConfirmed: boolean;
  checkedAt: string | null;
};

function personName(p: {
  firstName?: string | null;
  secondName?: string | null;
  firstLastName?: string | null;
  secondLastName?: string | null;
} | null) {
  if (!p) return "—";
  return [p.firstName, p.secondName, p.firstLastName, p.secondLastName]
    .filter(Boolean)
    .join(" ")
    .trim() || "—";
}

export function serializeTaskItem(row: {
  id: number;
  title: string;
  resultNote?: string | null;
  status: string;
  priority: string;
  assignedUserId?: number | null;
  dueDate?: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  mandateKey?: string | null;
  createdByRole?: string | null;
  systemSuggestedAt?: Date | null;
  ownerConfirmedAt?: Date | null;
  checkedAt?: Date | null;
  assignee?: {
    id: number;
    firstName?: string | null;
    secondName?: string | null;
    firstLastName?: string | null;
    secondLastName?: string | null;
  } | null;
}): TaskDto {
  return {
    id: row.id,
    title: row.title,
    description: row.resultNote ?? "",
    status: row.status as TaskDto["status"],
    priority: row.priority as TaskDto["priority"],
    assigneeId: row.assignedUserId ?? null,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    assignee: row.assignee
      ? { id: row.assignee.id, name: personName(row.assignee) }
      : null,
    mandateKey: row.mandateKey ?? null,
    createdByRole: row.createdByRole ?? null,
    systemSuggestedAt: row.systemSuggestedAt
      ? row.systemSuggestedAt.toISOString()
      : null,
    systemSuggested: !!row.systemSuggestedAt && !row.ownerConfirmedAt,
    ownerConfirmedAt: row.ownerConfirmedAt
      ? row.ownerConfirmedAt.toISOString()
      : null,
    ownerConfirmed: !!row.ownerConfirmedAt,
    checkedAt: row.checkedAt ? row.checkedAt.toISOString() : null,
  };
}

export const TASK_ITEM_INCLUDE = {
  assignee: {
    select: {
      id: true,
      firstName: true,
      secondName: true,
      firstLastName: true,
      secondLastName: true,
    },
  },
} as const;

/** Plan operativo único del salón (Kanban). */
export async function ensureOpsTaskPlan() {
  const existing = await prisma.taskPlan.findFirst({
    where: { title: "Operación · mandatos" },
    orderBy: { id: "asc" },
  });
  if (existing) return existing;
  return prisma.taskPlan.create({
    data: {
      title: "Operación · mandatos",
      description:
        "Cadena Programador → Dueña → Admins → Empleados. La Dueña confirma el check final.",
      status: "published",
      publishedAt: new Date(),
    },
  });
}

/** Mandatos base que el Programador exige a la Dueña (si faltan). */
export async function ensureOwnerMandateTasks(planId: number) {
  const mandates = [
    {
      key: "owner.config",
      title: "Configurar negocio (nombre, colores, canal público)",
      note: "Mandato Programador · Config + catálogo/promos públicos",
      priority: "high" as const,
    },
    {
      key: "owner.branches",
      title: "Crear / revisar las 4 sucursales",
      note: "Mandato Programador · Colón, Eguiguren, Lourdes, Centro Sur",
      priority: "high" as const,
    },
    {
      key: "owner.admins",
      title: "Crear los 4 administradores de local",
      note: "Mandato Programador · un Admin por sucursal",
      priority: "high" as const,
    },
    {
      key: "owner.payment_media",
      title: "Revisar medios de pago",
      note: "Mandato Programador · efectivo, transferencias, tarjetas",
      priority: "medium" as const,
    },
    {
      key: "owner.assign_admin_tasks",
      title: "Asignar tareas operativas a los Admins",
      note: "Dueña → Admins (empleados, catálogo, ops del día)",
      priority: "medium" as const,
    },
  ];

  for (let i = 0; i < mandates.length; i += 1) {
    const m = mandates[i];
    const found = await prisma.taskItem.findFirst({
      where: { planId, mandateKey: m.key },
      select: { id: true },
    });
    if (found) continue;
    await prisma.taskItem.create({
      data: {
        planId,
        title: m.title,
        resultNote: m.note,
        status: "todo",
        priority: m.priority,
        mandateKey: m.key,
        createdByRole: "programmer",
        sortOrder: i + 1,
      },
    });
  }
}

/** Resuelve assignee: Person id directo o Account id → personId. */
export async function resolveAssigneePersonId(
  raw: number | null | undefined,
): Promise<number | null> {
  if (raw == null || !Number.isFinite(raw)) return null;
  const asPerson = await prisma.person.findUnique({
    where: { id: raw },
    select: { id: true },
  });
  if (asPerson) return asPerson.id;
  const asAccount = await prisma.account.findUnique({
    where: { id: raw },
    select: { personId: true },
  });
  return asAccount?.personId ?? null;
}
