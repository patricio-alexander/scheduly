import type { SubscriptionModule, SubscriptionSection, SubscriptionState } from "../types";
import { normalizeAccessStatus } from "./access-status";
import { appRoutes } from "@/shared/utils/app-routes";

/** Mapeo de rutas de la app a keys de módulos del entitlement */
export const routeModuleKeys: Array<{ prefix: string; moduleKey: string }> = [
  { prefix: "/comprobantes-electronicos", moduleKey: "electronicDocs" },
  { prefix: "/operacion", moduleKey: "operation" },
  { prefix: "/ventas", moduleKey: "sales" },
  { prefix: "/compras", moduleKey: "sales" },
  { prefix: "/finanzas", moduleKey: "finance" },
  { prefix: "/empleado", moduleKey: "operation" },
  { prefix: "/inventario", moduleKey: "inventory" },
  { prefix: "/produccion", moduleKey: "production" },
  { prefix: "/canal", moduleKey: "channel" },
  { prefix: "/marketing", moduleKey: "marketing" },
  { prefix: "/publicidad", moduleKey: "marketing" },
  { prefix: "/diseno-promocional", moduleKey: "marketing" },
  { prefix: "/administracion", moduleKey: "admin" },
  { prefix: "/sistema", moduleKey: "system" },
  { prefix: "/panel", moduleKey: "operation" },
  { prefix: "/services", moduleKey: "operation" },
  // Legacies / aliases
  { prefix: "/inventory", moduleKey: "inventory" },
  { prefix: "/agenda", moduleKey: "operation" },
  { prefix: "/tasks", moduleKey: "operation" },
  { prefix: "/customers", moduleKey: "sales" },
  { prefix: "/users", moduleKey: "admin" },
  { prefix: "/roles", moduleKey: "admin" },
  { prefix: "/settings", moduleKey: "system" },
  { prefix: "/plans", moduleKey: "system" },
  { prefix: "/modules", moduleKey: "system" },
  { prefix: "/profile", moduleKey: "system" },
  { prefix: "/notifications", moduleKey: "system" },
];

/** Aliases de keys de módulo que puede enviar el gestor */
const moduleKeyAliases: Record<string, string[]> = {
  admin: ["admin", "administracion", "administration"],
  finance: ["finance", "finanzas", "admin"],
  operation: ["operation", "operations", "operacion", "operaciones"],
  sales: ["sales", "ventas", "purchases", "compras"],
  purchases: ["purchases", "compras", "sales", "ventas"],
  inventory: ["inventory", "inventario"],
  production: ["production", "produccion"],
  channel: ["channel", "canal", "canalDigital"],
  marketing: ["marketing", "publicidad", "advertising"],
  system: ["system", "sistema"],
  electronicDocs: [
    "electronicDocs",
    "electronic_docs",
    "comprobantesElectronicos",
    "comprobantes-electronicos",
    "comprobantes_electronicos",
  ],
};

/** Normaliza keys de módulo: electronicDocs ≈ electronic_docs ≈ Electronic-Docs */
function normalizeModuleKey(value: string) {
  return value.trim().toLowerCase().replace(/[_-]/g, "");
}

function normalizeRouteKey(value: string) {
  return value
    .trim()
    .split("?")[0]
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

export function findModuleKeyForPath(pathname: string): string | null {
  const sorted = [...routeModuleKeys].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const entry of sorted) {
    if (pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)) {
      return entry.moduleKey;
    }
  }
  return null;
}

export function findModuleByKey(
  state: SubscriptionState | null,
  moduleKey: string,
): SubscriptionModule | null {
  if (!state?.subscription?.modules?.length) return null;

  const aliases = moduleKeyAliases[moduleKey] ?? [moduleKey];
  const normalizedAliases = new Set(aliases.map(normalizeModuleKey));

  return (
    state.subscription.modules.find((m) =>
      normalizedAliases.has(normalizeModuleKey(String(m.key))),
    ) ?? null
  );
}

export function findModuleForPath(
  state: SubscriptionState | null,
  pathname: string,
): SubscriptionModule | null {
  const key = findModuleKeyForPath(pathname);
  if (!key) return null;
  return findModuleByKey(state, key);
}

function sectionMatchesPath(sectionKey: string, pathname: string) {
  const pathNorm = normalizeRouteKey(pathname);
  const keyNorm = normalizeRouteKey(sectionKey);
  if (!pathNorm || !keyNorm) return false;
  return pathNorm === keyNorm || pathNorm.startsWith(`${keyNorm}/`);
}

/**
 * Prefiere la sección más específica (más larga).
 * Evita que /comprobantes-electronicos capture /comprobantes-electronicos/facturas.
 */
export function findSectionForPath(
  module: SubscriptionModule | null,
  pathname: string,
): SubscriptionSection | null {
  if (!module) return null;

  let best: SubscriptionSection | null = null;
  let bestLen = -1;

  for (const section of module.sections) {
    if (!sectionMatchesPath(section.key, pathname)) continue;
    const len = normalizeRouteKey(section.key).length;
    if (len > bestLen) {
      best = section;
      bestLen = len;
    }
  }

  return best;
}

/** Busca la sección en todos los módulos (keys con o sin slash inicial) */
export function findSectionInState(
  state: SubscriptionState | null,
  pathname: string,
): {
  module: SubscriptionModule | null;
  section: SubscriptionSection | null;
} {
  const moduleFromPath = findModuleForPath(state, pathname);
  const sectionInModule = findSectionForPath(moduleFromPath, pathname);
  if (sectionInModule) {
    return { module: moduleFromPath, section: sectionInModule };
  }

  const modules = state?.subscription?.modules ?? [];
  for (const mod of modules) {
    const section = findSectionForPath(mod, pathname);
    if (section) return { module: mod, section };
  }

  return { module: moduleFromPath, section: null };
}

/** Lee expires_at / expiresAt / "expires at" (y start_at equivalente). */
function pickDateField(
  source: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return new Date(value).toISOString();
    }
  }
  return "";
}

/** true si la fecha de expiración ya pasó */
export function isExpiresAtPast(expiresAt: string | null | undefined): boolean {
  if (!expiresAt?.trim()) return false;
  const ms = Date.parse(expiresAt);
  if (!Number.isFinite(ms)) return false;
  return ms < Date.now();
}

export function isSubscriptionExpired(
  state: SubscriptionState | null | undefined,
): boolean {
  if (!state?.subscription) return false;
  return isExpiresAtPast(state.subscription.expires_at);
}

export function parseSubscriptionState(raw: unknown): SubscriptionState {
  if (!raw || typeof raw !== "object") {
    return { maintenance: false, subscribed: false, subscription: null };
  }

  const data = raw as Record<string, unknown>;
  const subscriptionRaw = data.subscription;

  if (
    !subscriptionRaw ||
    typeof subscriptionRaw !== "object" ||
    Array.isArray(subscriptionRaw) ||
    Object.keys(subscriptionRaw as object).length === 0
  ) {
    return {
      maintenance: Boolean(data.maintenance),
      subscribed: Boolean(data.subscribed),
      subscription: null,
    };
  }

  const sub = subscriptionRaw as Record<string, unknown>;
  const modulesRaw = Array.isArray(sub.modules) ? sub.modules : [];

  const modules = modulesRaw.map((mod, index) => {
    const m = (mod ?? {}) as Record<string, unknown>;
    const sectionsRaw = Array.isArray(m.sections) ? m.sections : [];
    return {
      id: Number(m.id ?? index + 1),
      name: String(m.name ?? "Módulo"),
      key: String(m.key ?? `module_${index + 1}`),
      status: normalizeAccessStatus(m.status),
      is_maintainer: Boolean(m.is_maintainer),
      image_url: m.image_url == null ? null : String(m.image_url),
      is_trial: Boolean(m.is_trial),
      start_trial: m.start_trial == null ? null : String(m.start_trial),
      limit_days_trial: m.limit_days_trial == null ? null : Number(m.limit_days_trial),
      end_trial: m.end_trial == null ? null : String(m.end_trial),
      sections: sectionsRaw.map((sec, sIndex) => {
        const s = (sec ?? {}) as Record<string, unknown>;
        const capsRaw = Array.isArray(s.capabilities) ? s.capabilities : [];
        return {
          id: Number(s.id ?? sIndex + 1),
          key: String(s.key ?? ""),
          name: String(s.name ?? "Sección"),
          status: normalizeAccessStatus(s.status),
          max_records_limit:
            s.max_records_limit == null ? null : Number(s.max_records_limit),
          usage_count: Number(s.usage_count ?? 0),
          capabilities: capsRaw.map((cap) => {
            const c = (cap ?? {}) as Record<string, unknown>;
            return {
              code: String(c.code ?? ""),
              name: String(c.name ?? ""),
              is_active: Boolean(c.is_active),
            };
          }),
        };
      }),
    };
  });

  const start_at = pickDateField(sub, [
    "start_at",
    "startAt",
    "start at",
    "starts_at",
    "startsAt",
  ]);
  const expires_at = pickDateField(sub, [
    "expires_at",
    "expiresAt",
    "expires at",
    "expire_at",
    "expireAt",
    "expiration_at",
    "expirationAt",
    "end_at",
    "endAt",
  ]);

  const expired = isExpiresAtPast(expires_at);
  const subscribed = Boolean(data.subscribed) && !expired;

  return {
    maintenance: Boolean(data.maintenance),
    subscribed,
    subscription: {
      id: Number(sub.id ?? 0),
      plan_name: String(sub.plan_name ?? sub.planName ?? "Sin plan"),
      period: String(sub.period ?? ""),
      status: expired ? "expired" : String(sub.status ?? ""),
      start_at,
      expires_at,
      modules,
    },
  };
}
