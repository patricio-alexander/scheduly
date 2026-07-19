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

const GESTOR_SOURCE = "gestor";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const source = url.searchParams.get("source");

    const entitlements = await prisma.entitlement.findMany({
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
    const hasAuthHeader = Boolean(request.headers.get("authorization")?.trim());
    const source = GESTOR_SOURCE;

    let status: "gestor_pull" | "gestor_push";
    let payload;

    if (hasAuthHeader) {
      // Push desde el gestor: Bearer obligatorio y válido
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
      // Pull interno: consulta al gestor y persiste
      status = "gestor_pull";
      payload = await pullSubscriptionFromGestor();
    }

    const entitlement = await prisma.entitlement.create({
      data: {
        payload,
        source,
        status,
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
