import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth, AUTH_COOKIE, verifySessionToken } from "@/shared/utils/check-auth";
import { resolveLogAction } from "@/shared/utils/log-action-catalog";
import {
  clientIpFromHeaders,
  formatLogClock,
  formatLogSystem,
  parseBrowserLabel,
} from "@/shared/utils/log-client-meta";
import { isOwnerRole, isProgrammerRole, roleLabel } from "@/shared/utils/roles";
import { writeSystemLog } from "@/shared/utils/system-log";

function canViewLogs(role: string) {
  return isProgrammerRole(role) || isOwnerRole(role);
}

function canDeleteLogs(role: string) {
  return isProgrammerRole(role);
}

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=") || null;
  }
  return null;
}

/** Quién actuó (lookup liviano por cookie de sesión). */
async function resolveActorLabel(request: Request): Promise<string | null> {
  try {
    const token = cookieValue(request.headers.get("cookie"), AUTH_COOKIE);
    if (!token) return null;
    const accountId = verifySessionToken(token);
    if (!accountId) return null;
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        username: true,
        person: { select: { firstName: true, firstLastName: true } },
        roles: {
          include: { role: true },
          orderBy: { id: "asc" },
          take: 1,
        },
      },
    });
    if (!account) return null;
    const rol = roleLabel(account.roles[0]?.role?.name ?? "usuario");
    const name = [account.person?.firstName, account.person?.firstLastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const who = name || account.username || `#${accountId}`;
    return `El ${rol} ${who}`;
  } catch {
    return null;
  }
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
      1000,
      Math.max(20, Number(url.searchParams.get("limit") ?? 200) || 200),
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
      rows.map((r) => {
        const system = r.system ?? "";
        const ip = system.match(/^IP\s+([^·]+)/i)?.[1]?.trim() || null;
        const uaIdx = system.search(/\s·\sUA\s/i);
        const beforeUa = uaIdx >= 0 ? system.slice(0, uaIdx) : system;
        const browser =
          beforeUa.replace(/^IP\s+[^·]+·\s*/i, "").trim() || null;
        return {
          id: r.id,
          httpMethod: r.httpMethod,
          action: r.action,
          endPoint: r.endPoint,
          description: r.description,
          system: r.system,
          date: r.date.toISOString(),
          ip,
          browser,
        };
      }),
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
    const auth = await checkAuth();
    if (!auth.ok) return auth.response;
    if (!canViewLogs(auth.user.role)) {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const httpMethod = String(body.httpMethod ?? "POST").toUpperCase();
    const endPoint = String(body.endPoint ?? "").slice(0, 500);
    if (!endPoint || ["GET", "OPTIONS", "HEAD"].includes(httpMethod)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const now = new Date();
    const action = (
      String(body.action ?? "").trim() ||
      resolveLogAction(httpMethod, endPoint)
    ).slice(0, 200);

    const userAgent =
      String(body.userAgent ?? request.headers.get("user-agent") ?? "").slice(
        0,
        400,
      ) || null;
    const ip =
      String(body.ip ?? "").trim() ||
      clientIpFromHeaders(request.headers);
    const browser = parseBrowserLabel(userAgent);
    const referer = String(body.referer ?? "").slice(0, 240);

    const system =
      body.system != null && String(body.system) !== "middleware"
        ? String(body.system).slice(0, 500)
        : formatLogSystem({ ip, browser, userAgent });

    let description =
      body.description != null
        ? String(body.description).slice(0, 800)
        : null;

    if (!description) {
      const clock = formatLogClock(now);
      const actor = await resolveActorLabel(request);
      const isSimulador =
        /Scheduly-Simulador/i.test(userAgent || "") ||
        request.headers.get("x-scheduly-client") === "simulador" ||
        String(body.client ?? "").toLowerCase() === "simulador";
      const flowHint = (
        request.headers.get("x-scheduly-flow") ||
        (userAgent || "").match(/flow\/([^\s);]+)/i)?.[1] ||
        ""
      ).trim();

      if (isSimulador) {
        const who = flowHint
          ? `Simulador · ${flowHint}`
          : "Simulador Archify";
        const via = actor ? ` · vía ${actor.replace(/^El\s+/i, "")}` : "";
        description = `[${clock}] ${who} realizó: ${action} · ${httpMethod} ${endPoint}${via}`;
      } else if (action === "Login") {
        description = `[${clock}] Intento de inicio de sesión · ${browser} · IP ${ip}`;
      } else if (actor) {
        description = `[${clock}] ${actor} realizó: ${action} · ${httpMethod} ${endPoint}${
          referer ? ` · desde ${referer}` : ""
        }`;
      } else if (ingest === "1") {
        description = `[${clock}] Acción API: ${action} · ${httpMethod} ${endPoint} · ${browser} · IP ${ip}`;
      } else {
        const auth = await checkAuth();
        if (auth.ok) {
          const who = auth.user.name || auth.user.username || `#${auth.user.id}`;
          const rol = roleLabel(auth.user.role);
          description = `[${clock}] El ${rol} ${who} realizó: ${action}`;
        } else {
          description = `[${clock}] Acción sin sesión: ${action} · IP ${ip}`;
        }
      }
    }

    await writeSystemLog({
      httpMethod,
      endPoint,
      action,
      description: description.slice(0, 800),
      system,
      date: now,
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
