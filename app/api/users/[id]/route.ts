import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { hashPassword } from "@/shared/utils/password";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  getMainBranchId,
  getUserBranchSummary,
  resolveUserBranchId,
  setUserPrimaryBranch,
} from "@/shared/utils/branches";
import { isBranchAdminRole, isOwnerRole } from "@/shared/utils/roles";
import {
  resolveRoleIdByName,
  resolveRoleIds,
  serializeAccountRow,
  splitPersonName,
} from "@/shared/utils/account-serialize";
import {
  canManageBranchStaff,
  rolesAllowedForBranchAdmin,
} from "@/shared/utils/staff-scope";
import {
  assertCanManageTargetAccount,
  getManagerBranchId,
} from "@/shared/utils/staff-scope.server";

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
  return [];
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!canManageBranchStaff(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const accountId = Number(id);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  const scope = await assertCanManageTargetAccount(auth.user, accountId);
  if (!scope.ok) {
    return NextResponse.json({ message: scope.message }, { status: scope.status });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const username = String(body.username ?? "").trim();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    let roles = parseRoles(body);
    let branchId = parseBranchIdFromBody(body);

    if (isBranchAdminRole(auth.user.role) && !isOwnerRole(auth.user.role)) {
      roles = rolesAllowedForBranchAdmin(roles.length ? roles : ["Empleado"]);
      const myBranch = await getManagerBranchId(auth.user);
      branchId = myBranch;
    }

    const primaryRole = roles[0] ?? String(body.role ?? "Empleado");
    let resolvedBranchId = await resolveUserBranchId(
      prisma,
      primaryRole,
      branchId,
    );
    if (!resolvedBranchId && !isOwnerRole(primaryRole)) {
      resolvedBranchId = await getMainBranchId(prisma);
    }
    const password =
      typeof body.password === "string" ? body.password.trim() : "";
    const setActive =
      typeof body.isActive === "boolean" ? body.isActive : undefined;

    if (!username || !name || !email || roles.length === 0) {
      return NextResponse.json(
        {
          message:
            "Datos incompletos (usuario, nombre, correo y al menos un rol)",
        },
        { status: 400 },
      );
    }

    if (password && password.length < 4) {
      return NextResponse.json(
        { message: "La contraseña debe tener al menos 4 caracteres" },
        { status: 400 },
      );
    }

    const actorIsOwner = isOwnerRole(auth.user.role);
    // Admin de sucursal: requiere local. Dueña: el vínculo se gestiona en Sucursales.
    if (
      !actorIsOwner &&
      isBranchAdminRole(auth.user.role) &&
      !resolvedBranchId
    ) {
      return NextResponse.json(
        { message: "Sin sucursal asignada" },
        { status: 400 },
      );
    }

    const existing = await prisma.account.findFirst({
      where: { username, NOT: { id: accountId } },
    });
    if (existing) {
      return NextResponse.json(
        { message: "El nombre de usuario ya existe" },
        { status: 409 },
      );
    }

    const current = await prisma.account.findUnique({
      where: { id: accountId },
      include: { person: true },
    });
    if (!current) {
      return NextResponse.json(
        { message: "Cuenta no encontrada" },
        { status: 404 },
      );
    }

    const { firstName, firstLastName } = splitPersonName(name);
    const roleIds = await resolveRoleIds(
      (n) => resolveRoleIdByName(prisma, n),
      { roles },
    );

    const account = await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: accountId },
        data: {
          username,
          ...(password ? { password: await hashPassword(password) } : {}),
          ...(setActive !== undefined ? { isActive: setActive } : {}),
        },
      });

      if (current.userId) {
        await tx.person.update({
          where: { id: current.userId },
          data: { firstName, firstLastName },
        });
        await tx.personData.upsert({
          where: { idUser: current.userId },
          create: {
            idUser: current.userId,
            personalEmail: email,
          },
          update: { personalEmail: email },
        });
      }

      await tx.accountRole.deleteMany({ where: { accountId } });
      for (const roleId of roleIds) {
        await tx.accountRole.create({
          data: { accountId, roleId },
        });
      }

      // Admin de sucursal: siempre su local. Dueña/Programador: honrar branchId
      // del body (soporte / simulación / alta desde Cuentas).
      if (resolvedBranchId && !isOwnerRole(primaryRole)) {
        await setUserPrimaryBranch(tx, accountId, resolvedBranchId);
      }

      return tx.account.findUniqueOrThrow({
        where: { id: accountId },
        include: {
          person: true,
          roles: { include: { role: true }, orderBy: { id: "asc" } },
        },
      });
    });

    const summary = await getUserBranchSummary(prisma, account.id);
    const branch = summary
      ? { id: summary.id, name: summary.name, code: `suc-${summary.id}` }
      : null;

    return NextResponse.json({
      ...serializeAccountRow(account, email, branch),
      passwordUpdated: Boolean(password),
    });
  } catch (error) {
    console.error("PUT /api/users/[id]", error);
    return NextResponse.json(
      { message: "Error al actualizar la cuenta" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!canManageBranchStaff(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const accountId = Number(id);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  const scope = await assertCanManageTargetAccount(auth.user, accountId);
  if (!scope.ok) {
    return NextResponse.json({ message: scope.message }, { status: scope.status });
  }

  try {
    if (accountId === auth.user.id) {
      return NextResponse.json(
        { message: "No puedes desactivar tu propia cuenta" },
        { status: 400 },
      );
    }

    await prisma.account.update({
      where: { id: accountId },
      data: { isActive: false },
    });
    return NextResponse.json({ message: "Cuenta desactivada" });
  } catch {
    return NextResponse.json(
      { message: "Error al desactivar la cuenta" },
      { status: 500 },
    );
  }
}
