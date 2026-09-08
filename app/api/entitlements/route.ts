import { NextResponse } from "next/server";
import { checkAuth } from "@/shared/utils/check-auth";
import { buildDevOpenSubscriptionState } from "@/shared/utils/dev-subscription";

const LOCAL_SOURCE = "local";

function openEntitlement() {
  return {
    id: 0,
    payload: buildDevOpenSubscriptionState(),
    source: LOCAL_SOURCE,
    status: "local",
  };
}

/** Scheduly standalone: siempre responde con todos los módulos abiertos. */
export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  return NextResponse.json([openEntitlement()]);
}

/** Sync externo deshabilitado; solo confirma estado local abierto. */
export async function PUT() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const payload = buildDevOpenSubscriptionState();
  return NextResponse.json({
    ok: true,
    payload,
    source: LOCAL_SOURCE,
    status: "local",
    message: "Scheduly independiente: sin sync externo",
  });
}
