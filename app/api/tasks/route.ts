import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { emitTaskCreated } from "@/shared/utils/socket";

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
  try {
    const { searchParams } = new URL(request.url);
    const assigneeRaw = searchParams.get("assigneeId");
    const assigneeId =
      assigneeRaw != null && assigneeRaw !== ""
        ? Number(assigneeRaw)
        : null;

    const tasks = await prisma.task.findMany({
      where:
        assigneeId != null && Number.isFinite(assigneeId)
          ? { assigneeId }
          : undefined,
      include: {
        assignee: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/tasks", error);
    return NextResponse.json(
      { message: "Error al obtener tareas" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { message: "El título es requerido" },
        { status: 400 },
      );
    }

    const status = parseStatus(body.status) ?? "todo";
    const priority = parsePriority(body.priority) ?? "medium";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const assigneeId =
      body.assigneeId === null || body.assigneeId === ""
        ? null
        : Number(body.assigneeId);
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;

    const maxOrder = await prisma.task.aggregate({
      where: { status },
      _max: { sortOrder: true },
    });

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority,
        assigneeId:
          assigneeId != null && Number.isFinite(assigneeId) ? assigneeId : null,
        dueDate:
          dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

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
