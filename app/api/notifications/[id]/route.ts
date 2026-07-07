import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.notification.update({
      where: { id: Number(id) },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Error al marcar notificación" },
      { status: 500 }
    );
  }
}
