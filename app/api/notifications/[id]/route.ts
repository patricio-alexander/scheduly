import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";

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

    const { searchParams } = new URL(request.url);
    const userIdRaw = searchParams.get("userId");
    const userId =
      userIdRaw != null && userIdRaw !== "" ? Number(userIdRaw) : null;

    const where =
      userId != null && Number.isFinite(userId)
        ? { id, userId }
        : { id };

    const result = await prisma.notification.updateMany({
      where,
      data: { read: true },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { message: "Notificación no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications/[id]", error);
    return NextResponse.json(
      { message: "Error al marcar notificación" },
      { status: 500 },
    );
  }
}
