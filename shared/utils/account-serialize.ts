import { mapExternalRoleName } from "@/shared/utils/roles";

export function splitPersonName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Usuario", firstLastName: "" };
  if (parts.length === 1) return { firstName: parts[0], firstLastName: "" };
  return {
    firstName: parts[0],
    firstLastName: parts.slice(1).join(" "),
  };
}

export function personDisplayName(person: {
  firstName: string | null;
  secondName: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
} | null) {
  if (!person) return "Usuario";
  return (
    [person.firstName, person.secondName, person.firstLastName, person.secondLastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Usuario"
  );
}

export function roleNamesFromAccount(
  roles: Array<{ role: { name: string | null } }>,
): string[] {
  const names = roles
    .map((r) => r.role.name?.trim())
    .filter((n): n is string => Boolean(n));
  return [...new Set(names)];
}

export function serializeAccountRow(
  account: {
    id: number;
    username: string | null;
    isActive: boolean;
    person: {
      firstName: string | null;
      secondName: string | null;
      firstLastName: string | null;
      secondLastName: string | null;
      photo: string | null;
    } | null;
    roles: Array<{ role: { id: number; name: string | null } }>;
  },
  email: string,
  branch: { id: number; name: string; code: string } | null,
) {
  const roles = roleNamesFromAccount(account.roles);
  const primary = roles[0] ?? "Empleado";
  return {
    id: account.id,
    username: account.username ?? "",
    name: personDisplayName(account.person),
    email,
    /** Rol primario (primero en AccountRole). */
    role: primary,
    /** Todos los roles de la cuenta. */
    roles,
    isActive: account.isActive,
    photo: account.person?.photo ?? null,
    branch,
  };
}

/** Resuelve uno o varios nombres de rol → ids. */
export async function resolveRoleIds(
  findOrCreate: (name: string) => Promise<number>,
  input: { role?: string; roles?: string[] },
): Promise<number[]> {
  const raw = [
    ...(Array.isArray(input.roles) ? input.roles : []),
    ...(input.role ? [input.role] : []),
  ]
    .map((r) => String(r).trim())
    .filter(Boolean);

  const unique = [...new Set(raw)];
  if (unique.length === 0) {
    return [await findOrCreate("Empleado")];
  }

  const ids: number[] = [];
  for (const name of unique) {
    ids.push(await findOrCreate(name));
  }
  return [...new Set(ids)];
}

export async function resolveRoleIdByName(
  prisma: {
    role: {
      findFirst: (args: { where: { name: string } }) => Promise<{ id: number } | null>;
      create: (args: { data: { name: string } }) => Promise<{ id: number }>;
    };
  },
  roleName: string,
) {
  const preferred = roleName.trim();
  let role = await prisma.role.findFirst({ where: { name: preferred } });
  if (role) return role.id;

  const app = mapExternalRoleName(preferred);
  const spanish =
    app === "owner" ? "Dueño" : app === "admin" ? "Administrador" : "Empleado";
  role = await prisma.role.findFirst({ where: { name: spanish } });
  if (role) return role.id;

  role = await prisma.role.create({ data: { name: spanish } });
  return role.id;
}
