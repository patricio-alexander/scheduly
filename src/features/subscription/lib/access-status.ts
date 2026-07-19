import type { AccessStatus } from "../types";

export function isAccessStatus(value: unknown): value is AccessStatus {
  return (
    value === "active" ||
    value === "development" ||
    value === "maintenance" ||
    value === "developer" ||
    value === "planned"
  );
}

export function normalizeAccessStatus(value: unknown): AccessStatus {
  const normalized = String(value ?? "planned").toLowerCase().trim();

  const aliases: Record<string, AccessStatus> = {
    active: "active",
    activo: "active",
    maintenance: "maintenance",
    mantenimiento: "maintenance",
    planned: "planned",
    proximamente: "planned",
    "próximamente": "planned",
    coming_soon: "planned",
    development: "development",
    desarrollo: "development",
    developer: "developer",
    desarrollador: "developer",
  };

  return aliases[normalized] ?? (isAccessStatus(normalized) ? normalized : "planned");
}

export type AccessViewKind =
  | "ok"
  | "maintenance"
  | "planned"
  | "development"
  | "developer"
  | "unsubscribed";

export function resolveAccessView(
  status: AccessStatus,
  options?: { isDeveloper?: boolean },
): AccessViewKind {
  if (status === "active") return "ok";
  if (status === "maintenance") return "maintenance";
  if (status === "planned") return "planned";
  if (status === "development") {
    return options?.isDeveloper ? "ok" : "development";
  }
  if (status === "developer") {
    return options?.isDeveloper ? "ok" : "developer";
  }
  return "planned";
}

export function accessTitle(kind: AccessViewKind): string {
  switch (kind) {
    case "maintenance":
      return "En mantenimiento";
    case "planned":
      return "Próximamente";
    case "development":
      return "En desarrollo";
    case "developer":
      return "Solo desarrolladores";
    case "unsubscribed":
      return "Sin suscripción";
    default:
      return "";
  }
}

export function accessDescription(kind: AccessViewKind, name?: string): string {
  const target = name ? `"${name}"` : "esta sección";
  switch (kind) {
    case "maintenance":
      return `${target} está temporalmente en mantenimiento. Intenta más tarde.`;
    case "planned":
      return `${target} estará disponible próximamente.`;
    case "development":
      return `${target} se encuentra en desarrollo y aún no está disponible.`;
    case "developer":
      return `${target} solo está disponible para perfiles de desarrollo.`;
    case "unsubscribed":
      return "No tienes una suscripción activa. Activa un plan para continuar usando Scheduly.";
    default:
      return "";
  }
}

