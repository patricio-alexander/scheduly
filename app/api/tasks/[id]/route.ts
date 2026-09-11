import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { emitTaskDeleted, emitTaskUpdated } from "@/shared/utils/socket";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";
import {
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const existing = await prisma.taskItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { message: "Tarea no encontrada" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json(
          { message: "El título es requerido" },
          { status: 400 },
        );
      }
      data.title = title;
    }
    if (typeof body.description === "string") {
      data.resultNote = body.description.trim();
    }
    const priority = parsePriority(body.priority);
    if (priority) data.priority = priority;
    if (body.assigneeId === null || body.assigneeId === "") {
      data.assignedUserId = null;
    } else if (body.assigneeId != null) {
      data.assignedUserId = await resolveAssigneePersonId(
        Number(body.assigneeId),
      );
    }
    if (body.dueDate === null || body.dueDate === "") {
      data.dueDate = null;
    } else if (typeof body.dueDate === "string") {
      const dueDate = new Date(body.dueDate);
      if (!Number.isNaN(dueDate.getTime())) data.dueDate = dueDate;
    }
    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      data.sortOrder = body.sortOrder;
    }

    // Sistema / bot / staff: “ya lo hizo” → sugerencia, no check final
    if (body.suggestDone === true || body.systemSuggested === true) {
      data.systemSuggestedAt = new Date();
      if (existing.status === "todo") data.status = "in_progress";
    }

    const status = parseStatus(body.status);
    if (status) {
      if (status === "done") {
        if (!isOwnerRole(auth.user.role)) {
          // No dueña: solo sugerir; la Dueña confirma después
          data.systemSuggestedAt = new Date();
          if (existing.status === "todo") data.status = "in_progress";
          // no poner status done
        } else {
          data.status = "done";
          data.ownerConfirmedAt = new Date();
          data.checkedAt = new Date();
          data.checkedByUserId = auth.user.personId ?? null;
          data.systemSuggestedAt = existing.systemSuggestedAt ?? new Date();
        }
      } else {
        data.status = status;
        if (status !== "done") {
          data.ownerConfirmedAt = null;
          data.checkedAt = null;
          data.checkedByUserId = null;
        }
      }
    }

    if (status && status !== existing.status && data.sortOrder == null) {
      const targetStatus =
        (data.status as string | undefined) ||
        (status === "done" && !isOwnerRole(auth.user.role)
          ? existing.status === "todo"
            ? "in_progress"
            : existing.status
          : status);
      const maxOrder = await prisma.taskItem.aggregate({
        where: { planId: existing.planId, status: targetStatus as "todo" | "in_progress" | "done" },
        _max: { sortOrder: true },
      });
      data.sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;
    }

    const row = await prisma.taskItem.update({
      where: { id },
      data,
      include: TASK_ITEM_INCLUDE,
    });

    const task = serializeTaskItem(row);
    emitTaskUpdated(task);

    const suggestedOnly =
      (body.suggestDone === true ||
        (status === "done" && !isOwnerRole(auth.user.role))) &&
      !isOwnerRole(auth.user.role);

    return NextResponse.json({
      ...task,
      message: suggestedOnly
        ? "Sistema: marcado como hecho · falta confirmación de la Dueña"
        : undefined,
    });
  } catch (error) {
    console.error("PATCH /api/tasks/[id]", error);
    return NextResponse.json(
      { message: "Error al actualizar la tarea" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    await prisma.taskItem.delete({ where: { id } });
    emitTaskDeleted(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id]", error);
    return NextResponse.json(
      { message: "Error al eliminar la tarea" },
      { status: 500 },
    );
  }
}
