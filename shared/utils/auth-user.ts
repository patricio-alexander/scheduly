import type { PrismaClient } from "@/generated/prisma/client";
import {
  isOwnerRole,
  mapExternalRoleName,
  roleLabel,
  type AppRole,
} from "@/shared/utils/roles";
import { getAccountPrimaryBranch } from "@/shared/utils/account-branch";

export type AuthUserBranch = {
  id: number;
  name: string;
  code: string;
};

export type AuthUserRoleOption = {
  id: number;
  name: string;
  label: string;
};

export type AuthUserPayload = {
  /** id de Account (sesión) */
  id: number;
  /** id de Person vinculada */
  personId: number | null;
  username?: string;
  name: string;
  email: string;
  role: string;
  rolId: number | null;
  roles: AuthUserRoleOption[];
  photo: string | null;
  branch: AuthUserBranch | null;
};

type Db = Pick<
  PrismaClient,
  | "account"
  | "role"
  | "accountRole"
  | "person"
  | "personData"
  | "branch"
  | "$queryRawUnsafe"
  | "$executeRawUnsafe"
>;

const SWITCHABLE_FOR_OWNER = ["Dueño", "Administrador", "Empleado"] as const;

function personDisplayName(person: {
  firstName: string | null;
  secondName: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
} | null): string {
  if (!person) return "Usuario";
  const parts = [
    person.firstName,
    person.secondName,
    person.firstLastName,
    person.secondLastName,
  ].filter(Boolean);
  return parts.join(" ").trim() || "Usuario";
}

async function ensureOwnerSwitchableRoles(
  db: Db,
  accountId: number,
  currentRole: string,
) {
  if (!isOwnerRole(currentRole)) return;

  for (const name of SWITCHABLE_FOR_OWNER) {
    let role = await db.role.findFirst({ where: { name } });
    if (!role) {
      role = await db.role.create({ data: { name } });
    }
    const existing = await db.accountRole.findFirst({
      where: { accountId, roleId: role.id },
    });
    if (!existing) {
      await db.accountRole.create({
        data: { accountId, roleId: role.id },
      });
    }
  }
}

export async function serializeAuthUser(
  db: Db,
  accountId: number,
): Promise<AuthUserPayload | null> {
  const account = await db.account.findUnique({
    where: { id: accountId },
    include: {
      person: true,
      roles: { include: { role: true } },
    },
  });

  if (!account || !account.isActive) return null;

  const personData = account.userId
    ? await db.personData.findUnique({ where: { idUser: account.userId } })
    : null;

  const mappedRoles: AuthUserRoleOption[] = account.roles.map((link) => {
    const appRole = mapExternalRoleName(link.role.name ?? "");
    return {
      id: link.role.id,
      name: appRole,
      label: roleLabel(appRole),
    };
  });

  let roles = mappedRoles;
  const primaryRaw = account.roles[0]?.role.name ?? "Empleado";
  let activeRole: AppRole = mapExternalRoleName(primaryRaw);

  if (!roles.length) {
    activeRole = "employee";
    let role = await db.role.findFirst({ where: { name: "Empleado" } });
    if (!role) role = await db.role.create({ data: { name: "Empleado" } });
    await db.accountRole.create({
      data: { accountId: account.id, roleId: role.id },
    });
    roles = [
      { id: role.id, name: "employee", label: roleLabel("employee") },
    ];
  }

  await ensureOwnerSwitchableRoles(db, account.id, activeRole);

  if (isOwnerRole(activeRole)) {
    const refreshed = await db.accountRole.findMany({
      where: { accountId: account.id },
      include: { role: true },
    });
    roles = refreshed.map((link) => {
      const appRole = mapExternalRoleName(link.role.name ?? "");
      return {
        id: link.role.id,
        name: appRole,
        label: roleLabel(appRole),
      };
    });
  }

  // Una opción por AppRole (Dueño/Admin/Empleado/Programador)
  const deduped = new Map<string, AuthUserRoleOption>();
  for (const role of roles) {
    const prev = deduped.get(role.name);
    if (!prev || role.id < prev.id) deduped.set(role.name, role);
  }
  roles = [...deduped.values()];

  const order = {
    owner: 0,
    admin: 1,
    employee: 2,
    programmer: 3,
  } as Record<string, number>;
  roles.sort((a, b) => (order[a.name] ?? 9) - (order[b.name] ?? 9));

  const active =
    roles.find((r) => r.name === activeRole) ?? roles[0] ?? null;

  const branch = await getAccountPrimaryBranch(db, account.id);

  return {
    id: account.id,
    personId: account.userId ?? null,
    username: account.username ?? undefined,
    name: personDisplayName(account.person),
    email: personData?.personalEmail ?? personData?.institutionalEmail ?? "",
    role: active?.name ?? activeRole,
    rolId: active?.id ?? null,
    roles,
    photo: account.person?.photo ?? null,
    branch,
  };
}

export function branchDisplayLabel(
  branch: AuthUserBranch | null | undefined,
  _role?: string | null,
): string | null {
  return branch?.name ?? null;
}
