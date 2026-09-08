/** Roles de sistema que siempre deben existir (nombres en BD). */
export const SYSTEM_ROLES = [
  { name: "Dueño", label: "Dueño", appRole: "owner" as const },
  { name: "Administrador", label: "Administrador", appRole: "admin" as const },
  { name: "Empleado", label: "Empleado", appRole: "employee" as const },
  { name: "Programador", label: "Programador", appRole: "programmer" as const },
] as const;

export type SystemRoleName = (typeof SYSTEM_ROLES)[number]["name"];

const SYSTEM_ROLE_NAMES = new Set<string>(
  SYSTEM_ROLES.map((r) => r.name),
);

export function isSystemRoleName(name: string) {
  return SYSTEM_ROLE_NAMES.has(name);
}

export function roleDisplayLabel(name: string) {
  const found = SYSTEM_ROLES.find((r) => r.name === name);
  if (found) return found.label;
  if (name === "user" || name === "employee") return "Empleado";
  if (name === "owner") return "Dueño";
  if (name === "admin") return "Administrador";
  if (name === "programmer") return "Programador";
  return name;
}
