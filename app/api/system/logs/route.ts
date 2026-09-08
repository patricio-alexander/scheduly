import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { resolveLogAction } from "@/shared/utils/log-action-catalog";
import { isOwnerRole, isProgrammerRole, roleLabel } from "@/shared/utils/roles";
import { writeSystemLog } from "@/shared/utils/system-log";

function canViewLogs(role: string) {
  return isProgrammerRole(role) || isOwnerRole(role);
}

function canDeleteLogs(role: string) {
  return isProgrammerRole(role);
}

/** GET · listado SystemLog (Programador / Dueño). */
export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!canViewLogs(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const take = Math.min(
      5000,
      Math.max(50, Number(url.searchParams.get("limit") ?? 2000) || 2000),
    );
    const method = (url.searchParams.get("method") ?? "").toUpperCase();

    const rows = await prisma.systemLog.findMany({
      where:
        method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)
          ? { httpMethod: method }
          : undefined,
      orderBy: { date: "desc" },
      take,
    });

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        httpMethod: r.httpMethod,
        action: r.action,
        endPoint: r.endPoint,
        description: r.description,
        system: r.system,
        date: r.date.toISOString(),
      })),
    );
  } catch (error) {
    console.error("GET /api/system/logs", error);
    return NextResponse.json(
      { message: "Error al listar logs" },
      { status: 500 },
    );
  }
}

/**
 * Ingest interno desde middleware (mutaciones HTTP).
 * Header x-scheduly-log-ingest: 1
 */
export async function POST(request: Request) {
  const ingest = request.headers.get("x-scheduly-log-ingest");
  if (ingest !== "1") {
    // Alta manual solo dueña/programador (poco usado)
    const auth = await checkAuth();
    if (!auth.ok) return auth.response;
    if (!canViewLogs(auth.user.role)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const httpMethod = String(body.httpMethod ?? "POST").toUpperCase();
    const endPoint = String(body.endPoint ?? "");
    if (!endPoint || ["GET", "OPTIONS", "HEAD"].includes(httpMethod)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const action =
      String(body.action ?? "").trim() ||
      resolveLogAction(httpMethod, endPoint);
    const system = body.system != null ? String(body.system) : null;

    let description =
      body.description != null ? String(body.description) : null;

    if (!description) {
      if (action === "Login") {
        description = "Intento de inicio de sesión";
      } else {
        const auth = await checkAuth();
        if (auth.ok) {
          const who = auth.user.name || auth.user.username || `#${auth.user.id}`;
          const rol = roleLabel(auth.user.role);
          description = `El ${rol} ${who} realizó: ${action}`;
        } else {
          description = `Acción sin sesión: ${action}`;
        }
      }
    }

    await writeSystemLog({
      httpMethod,
      endPoint,
      action,
      description,
      system,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/system/logs", error);
    return NextResponse.json({ message: "Error al registrar log" }, { status: 400 });
  }
}

/** DELETE · limpia logs (solo Programador). */
export async function DELETE(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!canDeleteLogs(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (body.all === true) {
      const r = await prisma.systemLog.deleteMany({});
      return NextResponse.json({ deleted: r.count });
    }
    if (Array.isArray(body.ids) && body.ids.length) {
      const ids = body.ids
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n > 0);
      const r = await prisma.systemLog.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({ deleted: r.count });
    }
    const id = Number(body.id);
    if (Number.isInteger(id) && id > 0) {
      await prisma.systemLog.delete({ where: { id } });
      return NextResponse.json({ deleted: 1 });
    }
    return NextResponse.json({ message: "Nada que borrar" }, { status: 400 });
  } catch (error) {
    console.error("DELETE /api/system/logs", error);
    return NextResponse.json(
      { message: "Error al borrar logs" },
      { status: 400 },
    );
  }
}
