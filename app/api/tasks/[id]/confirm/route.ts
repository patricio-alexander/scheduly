import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { emitTaskUpdated } from "@/shared/utils/socket";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";
import { serializeTaskItem, TASK_ITEM_INCLUDE } from "@/shared/utils/tasks";

/**
 * Confirmación final de la Dueña: el sistema pudo sugerir “ya hecho”,
 * pero solo ella da el check.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json(
      { message: "Solo la Dueña confirma el check de la tarea" },
      { status: 403 },
    );
  }

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

    const now = new Date();
    const row = await prisma.taskItem.update({
      where: { id },
      data: {
        status: "done",
        ownerConfirmedAt: now,
        checkedAt: now,
        checkedByUserId: auth.user.personId ?? null,
        systemSuggestedAt: existing.systemSuggestedAt ?? now,
      },
      include: TASK_ITEM_INCLUDE,
    });

    const task = serializeTaskItem(row);
    emitTaskUpdated(task);
    return NextResponse.json({
      ...task,
      message: "Dueña confirmó · tarea marcada como hecha",
    });
  } catch (error) {
    console.error("POST /api/tasks/[id]/confirm", error);
    return NextResponse.json(
      { message: "Error al confirmar la tarea" },
      { status: 500 },
    );
  }
}
