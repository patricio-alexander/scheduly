/** Roles de sistema que siempre deben existir */
export const SYSTEM_ROLES = [
  { name: "admin", label: "Admin" },
  { name: "employee", label: "Empleado" },
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
  if (name === "user") return "Empleado";
  return name;
}
