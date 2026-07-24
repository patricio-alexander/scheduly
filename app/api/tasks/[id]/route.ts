import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { emitTaskDeleted, emitTaskUpdated } from "@/shared/utils/socket";

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
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { message: "Tarea no encontrada" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const data: {
      title?: string;
      description?: string;
      status?: (typeof STATUSES)[number];
      priority?: (typeof PRIORITIES)[number];
      assigneeId?: number | null;
      dueDate?: Date | null;
      sortOrder?: number;
    } = {};

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
      data.description = body.description.trim();
    }
    const status = parseStatus(body.status);
    if (status) data.status = status;
    const priority = parsePriority(body.priority);
    if (priority) data.priority = priority;
    if (body.assigneeId === null || body.assigneeId === "") {
      data.assigneeId = null;
    } else if (body.assigneeId != null) {
      const assigneeId = Number(body.assigneeId);
      if (Number.isFinite(assigneeId)) data.assigneeId = assigneeId;
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

    // Si cambia de columna, poner al final de la nueva
    if (status && status !== existing.status && data.sortOrder == null) {
      const maxOrder = await prisma.task.aggregate({
        where: { status },
        _max: { sortOrder: true },
      });
      data.sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;
    }

    const task = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    emitTaskUpdated(task);

    return NextResponse.json(task);
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
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    await prisma.task.delete({ where: { id } });
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
