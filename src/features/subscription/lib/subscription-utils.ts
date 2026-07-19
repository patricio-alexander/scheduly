import type { SubscriptionModule, SubscriptionSection, SubscriptionState } from "../types";
import { normalizeAccessStatus } from "./access-status";
import { appRoutes } from "@/shared/utils/app-routes";

/** Mapeo de rutas de la app a keys de módulos del entitlement */
export const routeModuleKeys: Array<{ prefix: string; moduleKey: string }> = [
  { prefix: "/comprobantes-electronicos", moduleKey: "electronicDocs" },
  { prefix: "/operacion", moduleKey: "operation" },
  { prefix: "/ventas", moduleKey: "sales" },
  { prefix: "/inventario", moduleKey: "inventory" },
  { prefix: "/administracion", moduleKey: "admin" },
  { prefix: "/sistema", moduleKey: "system" },
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
  { prefix: appRoutes.dashboard, moduleKey: "admin" },
];

/** Aliases de keys de módulo que puede enviar el gestor */
const moduleKeyAliases: Record<string, string[]> = {
  admin: ["admin", "administracion", "administration"],
  operation: ["operation", "operations", "operacion", "operaciones"],
  sales: ["sales", "ventas"],
  inventory: ["inventory", "inventario"],
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
    if (entry.prefix === "/") {
      if (pathname === "/") return entry.moduleKey;
      continue;
    }
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

  return {
    maintenance: Boolean(data.maintenance),
    subscribed: Boolean(data.subscribed),
    subscription: {
      id: Number(sub.id ?? 0),
      plan_name: String(sub.plan_name ?? "Sin plan"),
      period: String(sub.period ?? ""),
      status: String(sub.status ?? ""),
      start_at: String(sub.start_at ?? ""),
      expires_at: String(sub.expires_at ?? ""),
      modules,
    },
  };
}
