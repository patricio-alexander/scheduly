import type { Prisma } from "@/generated/prisma/client";

export const entitlementStatusOptions = ["gestor_push", "gestor_pull"] as const;

export type EntitlementStatusValue = (typeof entitlementStatusOptions)[number];

export function parseEntitlementStatus(value: unknown): EntitlementStatusValue {
  const status = String(value ?? "");
  if (!entitlementStatusOptions.includes(status as EntitlementStatusValue)) {
    throw new Error("Status inválido. Usa gestor_push o gestor_pull");
  }
  return status as EntitlementStatusValue;
}

function parseJsonValue(value: unknown): unknown {
  if (value == null) {
    throw new Error("El payload es requerido");
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      throw new Error("Payload JSON inválido");
    }
  }
  return value;
}

function unwrapPayloadRoot(value: unknown): Record<string, unknown> {
  const parsed = parseJsonValue(value);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      "El payload debe ser un objeto con maintenance, subscribed y subscription",
    );
  }

  const root = parsed as Record<string, unknown>;

  // Si viene envuelto en { payload: {...} } o { data: {...} }
  for (const key of ["payload", "data"] as const) {
    const nested = root[key];
    if (
      nested &&
      typeof nested === "object" &&
      !Array.isArray(nested) &&
      ("maintenance" in nested ||
        "subscribed" in nested ||
        "subscription" in nested)
    ) {
      return nested as Record<string, unknown>;
    }
  }

  return root;
}

/**
 * Normaliza el payload de entitlement a:
 * { maintenance, subscribed, subscription }
 */
export function parseEntitlementPayload(value: unknown): Prisma.InputJsonValue {
  const data = unwrapPayloadRoot(value);

  const hasExpectedShape =
    "maintenance" in data || "subscribed" in data || "subscription" in data;

  if (!hasExpectedShape) {
    throw new Error(
      "El payload debe incluir maintenance, subscribed y subscription",
    );
  }

  const subscriptionRaw = data.subscription;
  const subscription =
    subscriptionRaw !== null &&
    typeof subscriptionRaw === "object" &&
    !Array.isArray(subscriptionRaw)
      ? (subscriptionRaw as Prisma.InputJsonValue)
      : {};

  return {
    maintenance: Boolean(data.maintenance),
    subscribed: Boolean(data.subscribed),
    subscription,
  };
}

export function parseEntitlementSource(value: unknown): string {
  const source = String(value ?? "").trim();
  if (!source) {
    throw new Error("El source es requerido");
  }
  return source;
}

export type EntitlementSyncResponse = {
  ok: true;
  maintenance: boolean;
  subscribed: boolean;
  subscription: Prisma.JsonValue;
  meta: {
    source: EntitlementStatusValue;
    syncedAt: string;
  };
};

/** Respuesta pública del PUT /api/entitlements */
export function toEntitlementSyncResponse(entitlement: {
  payload: Prisma.JsonValue;
  status: EntitlementStatusValue;
  createdAt: Date;
  updatedAt: Date;
}): EntitlementSyncResponse {
  const payload =
    entitlement.payload &&
    typeof entitlement.payload === "object" &&
    !Array.isArray(entitlement.payload)
      ? (entitlement.payload as Record<string, unknown>)
      : {};

  const subscription =
    payload.subscription !== null &&
    typeof payload.subscription === "object" &&
    !Array.isArray(payload.subscription)
      ? (payload.subscription as Prisma.JsonValue)
      : {};

  return {
    ok: true,
    maintenance: Boolean(payload.maintenance),
    subscribed: Boolean(payload.subscribed),
    subscription,
    meta: {
      source: entitlement.status,
      syncedAt: (entitlement.updatedAt ?? entitlement.createdAt).toISOString(),
    },
  };
}
