import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ message: "userId requerido" }, { status: 400 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: Number(userId) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener notificaciones" },
      { status: 500 }
    );
  }
}
