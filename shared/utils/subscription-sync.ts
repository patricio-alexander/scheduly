import type { Prisma } from "@/generated/prisma/client";
import { timingSafeEqual } from "crypto";
import { parseEntitlementPayload } from "@/shared/utils/entitlement-api";
import type {
  SubscriptionPlan,
  SubscriptionPlanModule,
  SubscriptionCatalogModule,
} from "@/shared/utils/subscription-plans";

export type {
  SubscriptionPlan,
  SubscriptionPlanModule,
  SubscriptionPlanPrice,
  SubscriptionCatalogModule,
} from "@/shared/utils/subscription-plans";

function joinUrl(base: string, path: string) {
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function getSubscriptionApiBase() {
  const base = process.env.SUBSCRIPTION_API_URL?.trim();
  if (!base) {
    throw new Error("SUBSCRIPTION_API_URL no está configurada");
  }
  return base;
}

export function getSubscriptionCheckUrl() {
  return joinUrl(getSubscriptionApiBase(), "/subscriptions/check");
}

export function getSubscriptionPlansUrl() {
  return joinUrl(getSubscriptionApiBase(), "/subscriptions/plans");
}

export function getSubscriptionModulesUrl() {
  try {
    return joinUrl(getSubscriptionApiBase(), "/subscriptions/modules");
  } catch {
    const gestor = process.env.GESTOR_SYNC_URL?.trim();
    if (!gestor) {
      throw new Error(
        "SUBSCRIPTION_API_URL o GESTOR_SYNC_URL no está configurada",
      );
    }
    return joinUrl(gestor, "/api/subscriptions/modules");
  }
}

function getGestorSyncSecret() {
  const secret = process.env.GESTOR_SYNC_SECRET?.trim();
  if (!secret) {
    throw new Error("GESTOR_SYNC_SECRET no está configurada");
  }
  return secret;
}

function extractBearerToken(request: Request) {
  const header = request.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? "";
}

function secretsMatch(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Valida Authorization: Bearer contra GESTOR_SYNC_SECRET */
export function isValidGestorBearer(request: Request) {
  try {
    const expected = getGestorSyncSecret();
    const provided = extractBearerToken(request);
    if (!provided) return false;
    return secretsMatch(provided, expected);
  } catch {
    return false;
  }
}

export async function pullSubscriptionFromGestor(): Promise<Prisma.InputJsonValue> {
  const secret = getGestorSyncSecret();
  const url = getSubscriptionCheckUrl();
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Error al consultar suscripción en gestor (${res.status})${
        detail ? `: ${detail.slice(0, 200)}` : ""
      }`,
    );
  }

  const json: unknown = await res.json();
  return parseEntitlementPayload(json);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizePlanModule(value: unknown): SubscriptionPlanModule | null {
  const row = asRecord(value);
  if (!row) return null;

  if (typeof row.name === "string") {
    return {
      name: row.name,
      description: String(row.description ?? ""),
    };
  }

  const appModule = asRecord(row.app_module) ?? asRecord(row.appModule);
  const module =
    asRecord(appModule?.module) ?? asRecord(row.module) ?? appModule;

  if (!module || typeof module.name !== "string") return null;

  return {
    name: module.name,
    description: String(module.description ?? ""),
  };
}

function normalizePlan(value: unknown): SubscriptionPlan | null {
  const row = asRecord(value);
  if (!row || typeof row.name !== "string" || !row.name.trim()) return null;

  const rawModules =
    row.modules ?? row.plan_app_modules ?? row.planAppModules ?? [];

  const modules = (Array.isArray(rawModules) ? rawModules : [])
    .map(normalizePlanModule)
    .filter((m): m is SubscriptionPlanModule => Boolean(m));

  return {
    name: row.name.trim(),
    prices: row.prices ?? [],
    modules,
  };
}

/** GET ${SUBSCRIPTION_API_URL}/subscriptions/plans */
export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {

  try {
    const secret = getGestorSyncSecret();
    const url = getSubscriptionPlansUrl();
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Error al consultar planes en gestor (${res.status})${
          detail ? `: ${detail.slice(0, 200)}` : ""
        }`,
      );
    }
  
    const json: unknown = await res.json();
    const root = asRecord(json);
    const list = Array.isArray(json)
      ? json
      : Array.isArray(root?.data)
        ? (root!.data as unknown[])
        : Array.isArray(root?.plans)
          ? (root!.plans as unknown[])
          : null;
  
    if (!list) {
      throw new Error("La respuesta de planes no es una lista válida");
    }
  
    return list
      .map(normalizePlan)
      .filter((p): p is SubscriptionPlan => Boolean(p));
  } catch (error) {
    throw new Error("Error al consultar planes en gestor");
  }

}

function normalizeCatalogModule(value: unknown): SubscriptionCatalogModule | null {
  const row = asRecord(value);
  if (!row) return null;

  const nested =
    asRecord(row.app_module) ??
    asRecord(row.appModule) ??
    asRecord(row.module) ??
    null;

  const source = nested ?? row;
  const name =
    typeof source.name === "string"
      ? source.name.trim()
      : typeof row.name === "string"
        ? row.name.trim()
        : "";
  if (!name) return null;

  const keyRaw =
    source.key ?? source.code ?? row.key ?? row.code ?? row.slug ?? null;
  const key =
    typeof keyRaw === "string" && keyRaw.trim()
      ? keyRaw.trim()
      : name.toLowerCase().replace(/\s+/g, "_");

  const idRaw = source.id ?? row.id;
  const id =
    typeof idRaw === "number" && Number.isFinite(idRaw)
      ? idRaw
      : typeof idRaw === "string" && Number.isFinite(Number(idRaw))
        ? Number(idRaw)
        : null;

  const description = String(
    source.description ?? row.description ?? "",
  ).trim();

  const statusRaw = source.status ?? row.status;
  const status =
    typeof statusRaw === "string" && statusRaw.trim()
      ? statusRaw.trim()
      : null;

  const imageRaw =
    source.image_url ?? source.imageUrl ?? row.image_url ?? row.imageUrl;
  const image_url =
    typeof imageRaw === "string" && imageRaw.trim() ? imageRaw.trim() : null;

  return { id, key, name, description, status, image_url };
}

/** GET ${SUBSCRIPTION_API_URL}/subscriptions/modules */
export async function fetchSubscriptionModules(): Promise<
  SubscriptionCatalogModule[]
> {
  
  const secret = getGestorSyncSecret();
  const url = getSubscriptionModulesUrl();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    
    
  
    if (!res.ok) {
      
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Error al consultar módulos en gestor (${res.status})${
          detail ? `: ${detail.slice(0, 200)}` : ""
        }`,
      );
    }
  
    const json: unknown = await res.json();
    const root = asRecord(json);
    const list = Array.isArray(json)
      ? json
      : Array.isArray(root?.data)
        ? (root!.data as unknown[])
        : Array.isArray(root?.modules)
          ? (root!.modules as unknown[])
          : null;
  
    if (!list) {
      throw new Error("La respuesta de módulos no es una lista válida");
    }
  
    return list
      .map(normalizeCatalogModule)
      .filter((m): m is SubscriptionCatalogModule => Boolean(m));
  } catch (error) {
    throw new Error("Error al consultar módulos en gestor");
  }
 
}
