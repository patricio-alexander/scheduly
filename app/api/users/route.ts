import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { hashPassword } from "@/shared/utils/password";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  getUserBranchSummary,
  resolveUserBranchId,
  setUserPrimaryBranch,
} from "@/shared/utils/branches";
import { isBranchAdminRole, isOwnerRole, isProgrammerRole } from "@/shared/utils/roles";
import {
  resolveRoleIdByName,
  resolveRoleIds,
  serializeAccountRow,
  splitPersonName,
} from "@/shared/utils/account-serialize";
import {
  canAccessAccountsModule,
  canManageBranchStaff,
  rolesAllowedForBranchAdmin,
} from "@/shared/utils/staff-scope";
import {
  getManagerBranchId,
  listManagedAccountIds,
} from "@/shared/utils/staff-scope.server";
import { ensureAccountBranchTable } from "@/shared/utils/account-branch";

function parseBranchIdFromBody(body: Record<string, unknown>): number | null {
  const raw = body.branchId;
  if (raw == null || raw === "") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseRoles(body: Record<string, unknown>): string[] {
  if (Array.isArray(body.roles)) {
    return body.roles.map((r) => String(r).trim()).filter(Boolean);
  }
  if (body.role) return [String(body.role).trim()].filter(Boolean);
  return ["Empleado"];
}

async function branchForResponse(accountId: number) {
  const summary = await getUserBranchSummary(prisma, accountId);
  if (!summary) return null;
  return {
    id: summary.id,
    name: summary.name,
    code: `suc-${summary.id}`,
  };
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!canAccessAccountsModule(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    await ensureAccountBranchTable(prisma);
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "1";

    // Programador: ve todas las cuentas (arranque / bootstrap)
    const managed = isProgrammerRole(auth.user.role)
      ? ("all" as const)
      : await listManagedAccountIds(auth.user);
    const where =
      managed === "all"
        ? includeInactive
          ? {}
          : { isActive: true }
        : {
            id: { in: managed.length ? managed : [-1] },
            ...(includeInactive ? {} : { isActive: true }),
          };

    const accounts = await prisma.account.findMany({
      where,
      include: {
        person: true,
        roles: { include: { role: true }, orderBy: { id: "asc" } },
      },
      orderBy: { id: "desc" },
    });

    // Admin: solo empleados (no otros admins / dueña). Programador: todas.
    const filtered =
      isOwnerRole(auth.user.role) || isProgrammerRole(auth.user.role)
        ? accounts
        : accounts.filter((a) => {
          const primary = a.roles[0]?.role?.name ?? "";
          return (
            primary.toLowerCase() === "empleado" ||
            primary.toLowerCase() === "employee"
          );
        });

    const withMeta = await Promise.all(
      filtered.map(async (account) => {
        const personData = account.userId
          ? await prisma.personData.findUnique({
              where: { idUser: account.userId },
            })
          : null;
        const branch = await branchForResponse(account.id);
        return serializeAccountRow(
          account,
          personData?.personalEmail ?? personData?.institutionalEmail ?? "",
          branch,
        );
      }),
    );

    return NextResponse.json(withMeta);
  } catch (error) {
    console.error("GET /api/users", error);
    return NextResponse.json(
      { message: "Error al obtener cuentas" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const actorIsOwner = isOwnerRole(auth.user.role);
  const actorIsProgrammer = isProgrammerRole(auth.user.role);
  const canStaff = canManageBranchStaff(auth.user.role);

  // Programador: solo bootstrap de la primera Dueña (sim desde cero).
  if (!canStaff && !actorIsProgrammer) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    let roles = parseRoles(body);
    let branchId = parseBranchIdFromBody(body);

    if (actorIsProgrammer && !canStaff) {
      const ownerLink = await prisma.accountRole.findFirst({
        where: { role: { name: "Dueño" } },
        select: { id: true },
      });
      if (ownerLink) {
        return NextResponse.json(
          {
            message:
              "Ya existe una Dueña. El Programador solo crea la primera cuenta Dueña.",
          },
          { status: 403 },
        );
      }
      roles = ["Dueño"];
      branchId = null;
    }

    if (isBranchAdminRole(auth.user.role) && !isOwnerRole(auth.user.role)) {
      roles = rolesAllowedForBranchAdmin(roles);
      const myBranch = await getManagerBranchId(auth.user);
      if (!myBranch) {
        return NextResponse.json(
          { message: "Sin sucursal asignada" },
          { status: 403 },
        );
      }
      branchId = myBranch;
    }

    const primaryRole = roles[0] ?? "Empleado";
    const resolvedBranchId = await resolveUserBranchId(
      prisma,
      primaryRole,
      branchId,
    );
    const username = String(body.username ?? "").trim();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const password =
      typeof body.password === "string" ? body.password.trim() : "";

    if (!username || !name || !email || !password) {
      return NextResponse.json(
        { message: "Datos incompletos" },
        { status: 400 },
      );
    }
    if (password.length < 4) {
      return NextResponse.json(
        { message: "La contraseña debe tener al menos 4 caracteres" },
        { status: 400 },
      );
    }

    // Dueña / Programador bootstrap: puede crear sin local.
    // Admin de sucursal: siempre requiere su local.
    if (!resolvedBranchId && !actorIsOwner && !(actorIsProgrammer && !canStaff)) {
      return NextResponse.json(
        { message: "Selecciona una sucursal para la cuenta" },
        { status: 400 },
      );
    }

    const existing = await prisma.account.findFirst({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { message: "El nombre de usuario ya existe" },
        { status: 409 },
      );
    }

    const { firstName, firstLastName } = splitPersonName(name);
    const roleIds = await resolveRoleIds(
      (n) => resolveRoleIdByName(prisma, n),
      { roles },
    );

    const account = await prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          firstName,
          firstLastName,
          documentType: "05",
        },
      });

      await tx.personData.create({
        data: {
          idUser: person.id,
          personalEmail: email,
        },
      });

      const created = await tx.account.create({
        data: {
          username,
          password: await hashPassword(password),
          userId: person.id,
          isActive: true,
        },
      });

      for (const roleId of roleIds) {
        await tx.accountRole.create({
          data: { accountId: created.id, roleId },
        });
      }

      if (resolvedBranchId) {
        await setUserPrimaryBranch(tx, created.id, resolvedBranchId);
      }

      return tx.account.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          person: true,
          roles: { include: { role: true }, orderBy: { id: "asc" } },
        },
      });
    });

    const branch = await branchForResponse(account.id);
    return NextResponse.json(serializeAccountRow(account, email, branch), {
      status: 201,
    });
  } catch (error) {
    console.error("POST /api/users", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unique constraint") || msg.includes("userId")) {
      return NextResponse.json(
        { message: "Esa persona ya tiene una cuenta (1 usuario = 1 cuenta)" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { message: "Error al crear la cuenta" },
      { status: 500 },
    );
  }
}
