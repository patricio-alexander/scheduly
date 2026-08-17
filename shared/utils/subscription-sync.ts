import type { Prisma } from "@/generated/prisma/client";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/shared/utils/prisma";
import { parseEntitlementPayload } from "@/shared/utils/entitlement-api";
import type {
  SubscriptionPlan,
  SubscriptionPlanModule,
  SubscriptionPlanOffer,
  SubscriptionPlanSection,
  SubscriptionCatalogModule,
} from "@/shared/utils/subscription-plans";

export type {
  SubscriptionPlan,
  SubscriptionPlanModule,
  SubscriptionPlanSection,
  SubscriptionPlanPrice,
  SubscriptionPlanOffer,
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

function normalizeRouteKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .split("?")[0]
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function isPlanSectionRow(row: Record<string, unknown>): boolean {
  if (asRecord(row.section)) return true;
  const key = String(row.key ?? "").trim();
  if (key.startsWith("/")) return true;
  if (row.module || row.app_module || row.appModule) return false;
  // Filas de catálogo de módulo: key sin ruta + nombre
  if (row.name && key && !key.startsWith("/")) return false;
  return false;
}

function normalizePlanSection(value: unknown): SubscriptionPlanSection | null {
  const row = asRecord(value);
  if (!row) return null;

  const nested = asRecord(row.section) ?? row;
  const name = String(nested.name ?? "").trim();
  if (!name) return null;

  return {
    name,
    key: String(nested.key ?? "").trim(),
    description: String(nested.description ?? "").trim(),
  };
}

function sectionDedupeKey(section: SubscriptionPlanSection): string {
  const routeKey = normalizeRouteKey(section.key);
  if (routeKey) return `route:${routeKey}`;
  return `name:${section.name.toLowerCase()}`;
}

function mergePlanSections(
  current: SubscriptionPlanSection[],
  incoming: SubscriptionPlanSection[],
): SubscriptionPlanSection[] {
  const map = new Map<string, SubscriptionPlanSection>();
  for (const section of [...current, ...incoming]) {
    map.set(sectionDedupeKey(section), section);
  }
  return [...map.values()];
}

function normalizePlanModule(value: unknown): SubscriptionPlanModule | null {
  const row = asRecord(value);
  if (!row) return null;

  if (isPlanSectionRow(row)) return null;

  const appModule = asRecord(row.app_module) ?? asRecord(row.appModule);
  const moduleRecord =
    asRecord(appModule?.module) ?? asRecord(row.module) ?? appModule ?? row;

  const name = String(moduleRecord.name ?? "").trim();
  if (!name) return null;

  const sectionsRaw =
    appModule?.sections ?? moduleRecord.sections ?? row.sections ?? [];

  const sections = mergePlanSections(
    [],
    (Array.isArray(sectionsRaw) ? sectionsRaw : [])
      .map(normalizePlanSection)
      .filter((s): s is SubscriptionPlanSection => Boolean(s)),
  );

  const idRaw = moduleRecord.id ?? row.id;
  const id =
    typeof idRaw === "number" && Number.isFinite(idRaw)
      ? idRaw
      : typeof idRaw === "string" && Number.isFinite(Number(idRaw))
        ? Number(idRaw)
        : null;

  const isTrial = Boolean(row.is_trial ?? moduleRecord.is_trial);

  return {
    id,
    name,
    key: String(moduleRecord.key ?? row.key ?? "").trim(),
    description: String(moduleRecord.description ?? row.description ?? "").trim(),
    is_trial: isTrial,
    sections,
  };
}

function moduleDedupeKey(module: SubscriptionPlanModule): string {
  const key = String(module.key ?? "").trim().toLowerCase();
  if (key) return `module:${key}`;
  return `name:${module.name.toLowerCase()}`;
}

function mergePlanModules(
  current: SubscriptionPlanModule[],
  incoming: SubscriptionPlanModule,
): SubscriptionPlanModule[] {
  const map = new Map(current.map((mod) => [moduleDedupeKey(mod), mod]));
  const key = moduleDedupeKey(incoming);
  const existing = map.get(key);

  if (!existing) {
    map.set(key, incoming);
    return [...map.values()];
  }

  map.set(key, {
    ...existing,
    description: existing.description || incoming.description,
    sections: mergePlanSections(existing.sections, incoming.sections),
  });

  return [...map.values()];
}

function normalizePlanOffer(value: unknown): SubscriptionPlanOffer | null {
  const row = asRecord(value);
  if (!row) return null;

  const offerIdRaw = row.offer_id ?? row.offerId ?? row.id;
  const offer_id =
    typeof offerIdRaw === "number" && Number.isFinite(offerIdRaw)
      ? offerIdRaw
      : typeof offerIdRaw === "string" && Number.isFinite(Number(offerIdRaw))
        ? Number(offerIdRaw)
        : null;

  const offer_name = String(row.offer_name ?? row.offerName ?? row.name ?? "").trim();
  if (offer_id == null || !offer_name) return null;

  return { offer_id, offer_name };
}

function normalizePlan(value: unknown): SubscriptionPlan | null {
  const row = asRecord(value);
  if (!row || typeof row.name !== "string" || !row.name.trim()) return null;

  const rawModules =
    row.modules ?? row.plan_app_modules ?? row.planAppModules ?? [];

  let modules: SubscriptionPlanModule[] = [];
  for (const raw of Array.isArray(rawModules) ? rawModules : []) {
    const mod = normalizePlanModule(raw);
    if (!mod) continue;
    modules = mergePlanModules(modules, mod);
  }

  const idRaw = row.id;
  const id =
    typeof idRaw === "number" && Number.isFinite(idRaw)
      ? idRaw
      : typeof idRaw === "string" && Number.isFinite(Number(idRaw))
        ? Number(idRaw)
        : null;

  const sortOrderRaw = row.sort_order ?? row.sortOrder;
  const sort_order =
    typeof sortOrderRaw === "number" && Number.isFinite(sortOrderRaw)
      ? sortOrderRaw
      : typeof sortOrderRaw === "string" && Number.isFinite(Number(sortOrderRaw))
        ? Number(sortOrderRaw)
        : null;

  const channel =
    typeof row.channel === "string" && row.channel.trim()
      ? row.channel.trim()
      : null;

  const offers = (Array.isArray(row.offers) ? row.offers : [])
    .map(normalizePlanOffer)
    .filter((o): o is SubscriptionPlanOffer => Boolean(o));

  return {
    id,
    name: row.name.trim(),
    channel,
    sort_order,
    prices: row.prices ?? [],
    modules,
    offers,
  };
}

function extractPlansFromEntitlementPayload(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }
  const root = payload as Record<string, unknown>;
  const plans = root.plans;
  return Array.isArray(plans) ? plans : [];
}

/** Lee planes del payload del entitlement más reciente en la base de datos */
export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const entitlement = await prisma.entitlement.findFirst({
    orderBy: { id: "desc" },
    select: { payload: true },
  });

  if (!entitlement?.payload) return [];

  const list = extractPlansFromEntitlementPayload(entitlement.payload);

  return list
    .map(normalizePlan)
    .filter((p): p is SubscriptionPlan => Boolean(p))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
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
