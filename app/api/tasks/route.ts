import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { emitTaskCreated } from "@/shared/utils/socket";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole, isOwnerRole } from "@/shared/utils/roles";
import {
  ensureOpsTaskPlan,
  ensureOwnerMandateTasks,
  resolveAssigneePersonId,
  serializeTaskItem,
  TASK_ITEM_INCLUDE,
} from "@/shared/utils/tasks";

const STATUSES = ["todo", "in_progress", "done"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

function parseStatus(value: unknown) {
  return typeof value === "string" &&
    (STATUSES as readonly string[]).includes(value)
    ? (value as (typeof STATUSES)[number])
    : null;
}

function parsePriority(value: unknown) {
  return typeof value === "string" &&
    (PRIORITIES as readonly string[]).includes(value)
    ? (value as (typeof PRIORITIES)[number])
    : null;
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const plan = await ensureOpsTaskPlan();
    if (isOwnerRole(auth.user.role) || isManagementRole(auth.user.role)) {
      await ensureOwnerMandateTasks(plan.id);
    }

    const { searchParams } = new URL(request.url);
    const assigneeRaw = searchParams.get("assigneeId");
    const assigneeId =
      assigneeRaw != null && assigneeRaw !== ""
        ? await resolveAssigneePersonId(Number(assigneeRaw))
        : null;

    const rows = await prisma.taskItem.findMany({
      where: {
        planId: plan.id,
        ...(assigneeId != null ? { assignedUserId: assigneeId } : {}),
      },
      include: TASK_ITEM_INCLUDE,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json(rows.map(serializeTaskItem));
  } catch (error) {
    console.error("GET /api/tasks", error);
    return NextResponse.json(
      { message: "Error al obtener tareas" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { message: "El título es requerido" },
        { status: 400 },
      );
    }

    const plan = await ensureOpsTaskPlan();
    const status = parseStatus(body.status) ?? "todo";
    const priority = parsePriority(body.priority) ?? "medium";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const assignedUserId = await resolveAssigneePersonId(
      body.assigneeId === null || body.assigneeId === ""
        ? null
        : Number(body.assigneeId),
    );
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;
    const mandateKey =
      typeof body.mandateKey === "string" ? body.mandateKey.trim() : null;
    const createdByRole = isOwnerRole(auth.user.role)
      ? "owner"
      : isManagementRole(auth.user.role)
        ? "admin"
        : "employee";

    const maxOrder = await prisma.taskItem.aggregate({
      where: { planId: plan.id, status },
      _max: { sortOrder: true },
    });

    const row = await prisma.taskItem.create({
      data: {
        planId: plan.id,
        title,
        resultNote: description,
        status,
        priority,
        assignedUserId,
        dueDate:
          dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        mandateKey: mandateKey || null,
        createdByRole,
      },
      include: TASK_ITEM_INCLUDE,
    });

    const task = serializeTaskItem(row);
    emitTaskCreated(task);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks", error);
    return NextResponse.json(
      { message: "Error al crear la tarea" },
      { status: 500 },
    );
  }
}
