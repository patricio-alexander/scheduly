import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";

function resolvePersonId(
  authPersonId: number | null,
  queryUserId: string | null,
): number | null {
  if (authPersonId != null && authPersonId > 0) return authPersonId;
  if (queryUserId) {
    const n = Number(queryUserId);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const personId = resolvePersonId(
      auth.user.personId,
      url.searchParams.get("userId"),
    );

    if (!personId) {
      return NextResponse.json([]);
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: personId, deleted: false },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Compat cliente: `read` = `seen`
    return NextResponse.json(
      notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        createdAt: n.createdAt.toISOString(),
        read: n.seen,
        seen: n.seen,
      })),
    );
  } catch (error) {
    console.error("GET /api/notifications", error);
    return NextResponse.json(
      { message: "Error al obtener notificaciones" },
      { status: 500 },
    );
  }
}
