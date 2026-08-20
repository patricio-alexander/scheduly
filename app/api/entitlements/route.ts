import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import {
  parseEntitlementPayload,
  parseEntitlementStatus,
  toEntitlementSyncResponse,
} from "@/shared/utils/entitlement-api";
import {
  isValidGestorBearer,
  pullSubscriptionFromGestor,
} from "@/shared/utils/subscription-sync";
import { checkAuth } from "@/shared/utils/check-auth";
import { isSchedulyDevRuntime } from "@/shared/utils/runtime-mode";
import { buildDevOpenSubscriptionState } from "@/shared/utils/dev-subscription";

const GESTOR_SOURCE = "gestor";
const DEV_SOURCE = "dev_local";

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    if (isSchedulyDevRuntime()) {
      return NextResponse.json([
        {
          id: 0,
          payload: buildDevOpenSubscriptionState(),
          source: DEV_SOURCE,
          status: "gestor_pull",
        },
      ]);
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const source = url.searchParams.get("source");

    const entitlements = await prisma.appEntitlement.findMany({
      where: {
        ...(status ? { status: parseEntitlementStatus(status) } : {}),
        ...(source ? { source: source.trim() } : {}),
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json(entitlements);
  } catch (error) {
    console.error("GET /api/entitlements", error);
    const message =
      error instanceof Error ? error.message : "Error al obtener entitlements";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    if (isSchedulyDevRuntime() && !request.headers.get("authorization")?.trim()) {
      const auth = await checkAuth();
      if (!auth.ok) return auth.response;
      const payload = buildDevOpenSubscriptionState();
      return NextResponse.json({
        ok: true,
        payload,
        source: DEV_SOURCE,
        status: "gestor_pull",
        message: "Modo desarrollo: sin sync al Gestor",
      });
    }

    const hasAuthHeader = Boolean(request.headers.get("authorization")?.trim());
    const source = GESTOR_SOURCE;

    let status: "gestor_pull" | "gestor_push";
    let payload;

    if (hasAuthHeader) {
      if (!isValidGestorBearer(request)) {
        return NextResponse.json(
          { ok: false, message: "No autorizado" },
          { status: 401 },
        );
      }
      const body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      status = "gestor_push";
      payload = parseEntitlementPayload(body);
    } else {
      const auth = await checkAuth();
      if (!auth.ok) return auth.response;

      status = "gestor_pull";
      payload = await pullSubscriptionFromGestor();
    }

    const entitlement = await prisma.appEntitlement.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        payload,
        source,
        status,
      },
      update: {
        payload,
        source,
        status,
        syncedAt: new Date(),
      },
    });

    return NextResponse.json(toEntitlementSyncResponse(entitlement), {
      status: 200,
    });
  } catch (error) {
    console.error("PUT /api/entitlements", error);
    const message =
      error instanceof Error ? error.message : "Error al crear el entitlement";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
