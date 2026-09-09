import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isBranchAdminRole, isOwnerRole } from "@/shared/utils/roles";
import {
  accountBelongsToBranch,
  ensureAccountBranchTable,
  ensureBranchManagerColumn,
  getAccountPrimaryBranchId,
  getBranchManagerAccountId,
  linkAccountToBranch,
  listAccountsForBranch,
  listAccountsNotInBranch,
  moveAccountToBranch,
  setAccountPrimaryBranch,
  setBranchManagerAccountId,
  unlinkAccountFromBranch,
} from "@/shared/utils/account-branch";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function memberPayload(
  t: Awaited<ReturnType<typeof listAccountsForBranch>>[number],
) {
  return {
    id: t.accountId,
    username: t.username ?? "",
    name:
      [t.firstName, t.firstLastName].filter(Boolean).join(" ") ||
      t.username ||
      "—",
    role: t.roleName ?? "Empleado",
    isActive: Boolean(t.isActive),
    isPrimary: Boolean(t.isPrimary),
    isManager: Boolean(t.isManager),
  };
}

/** GET: equipo del local + cuentas disponibles para vincular (solo Dueña). */
export async function GET(_request: Request, ctx: Ctx) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const branchId = parseId((await ctx.params).id);
  if (!branchId) {
    return NextResponse.json({ message: "Local inválido" }, { status: 400 });
  }

  try {
    await ensureAccountBranchTable(prisma);
    await ensureBranchManagerColumn(prisma);

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, isActive: true },
      select: { id: true, name: true },
    });
    if (!branch) {
      return NextResponse.json({ message: "Local no encontrado" }, { status: 404 });
    }

    const [team, available, managerAccountId, otherBranches] = await Promise.all([
      listAccountsForBranch(prisma, branchId),
      listAccountsNotInBranch(prisma, branchId),
      getBranchManagerAccountId(prisma, branchId),
      prisma.branch.findMany({
        where: { isActive: true, NOT: { id: branchId } },
        orderBy: [{ position: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
    ]);

    return NextResponse.json({
      branchId,
      branchName: branch.name,
      managerAccountId,
      otherBranches,
      team: team.map(memberPayload),
      available: available.map((t) => ({
        id: t.accountId,
        username: t.username ?? "",
        name:
          [t.firstName, t.firstLastName].filter(Boolean).join(" ") ||
          t.username ||
          "—",
        role: t.roleName ?? "Empleado",
        isActive: Boolean(t.isActive),
        currentBranchId: t.currentBranchId ? Number(t.currentBranchId) : null,
        currentBranchName: t.currentBranchName ?? null,
        unlinked: t.currentBranchId == null,
      })),
    });
  } catch (error) {
    console.error("GET /api/branches/[id]/members", error);
    return NextResponse.json(
      { message: "Error al cargar el equipo" },
      { status: 500 },
    );
  }
}

/**
 * POST: vincular cuenta al local.
 * Body: { accountId }
 */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const branchId = parseId((await ctx.params).id);
  if (!branchId) {
    return NextResponse.json({ message: "Local inválido" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { accountId?: unknown };
    const accountId = Number(body.accountId);
    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ message: "Cuenta inválida" }, { status: 400 });
    }

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, isActive: true },
      select: { id: true },
    });
    if (!branch) {
      return NextResponse.json({ message: "Local no encontrado" }, { status: 404 });
    }

    const account = await prisma.account.findFirst({
      where: { id: accountId, isActive: true },
      select: { id: true },
    });
    if (!account) {
      return NextResponse.json({ message: "Cuenta no encontrada" }, { status: 404 });
    }

    const currentPrimary = await getAccountPrimaryBranchId(prisma, accountId);
    if (currentPrimary && currentPrimary !== branchId) {
      // Traer desde otro local (deja de estar en el anterior)
      await moveAccountToBranch(prisma, accountId, currentPrimary, branchId);
    } else {
      await linkAccountToBranch(prisma, accountId, branchId);
      await setAccountPrimaryBranch(prisma, accountId, branchId);
    }

    const team = await listAccountsForBranch(prisma, branchId);
    return NextResponse.json({
      ok: true,
      team: team.map(memberPayload),
    });
  } catch (error) {
    console.error("POST /api/branches/[id]/members", error);
    return NextResponse.json(
      { message: "No se pudo vincular la cuenta" },
      { status: 500 },
    );
  }
}

/**
 * PATCH:
 * - { managerAccountId } → encargado principal
 * - { action: "move", accountId, toBranchId } → cambiar de local
 */
export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const branchId = parseId((await ctx.params).id);
  if (!branchId) {
    return NextResponse.json({ message: "Local inválido" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      action?: unknown;
      accountId?: unknown;
      toBranchId?: unknown;
      managerAccountId?: unknown;
    };

    if (String(body.action ?? "") === "move") {
      const accountId = Number(body.accountId);
      const toBranchId = Number(body.toBranchId);
      if (!Number.isInteger(accountId) || accountId <= 0) {
        return NextResponse.json({ message: "Cuenta inválida" }, { status: 400 });
      }
      if (!Number.isInteger(toBranchId) || toBranchId <= 0) {
        return NextResponse.json(
          { message: "Local destino inválido" },
          { status: 400 },
        );
      }
      if (toBranchId === branchId) {
        return NextResponse.json(
          { message: "Ya está en este local" },
          { status: 400 },
        );
      }

      const linked = await accountBelongsToBranch(prisma, accountId, branchId);
      if (!linked) {
        return NextResponse.json(
          { message: "Esa persona no está en este local" },
          { status: 400 },
        );
      }

      const dest = await prisma.branch.findFirst({
        where: { id: toBranchId, isActive: true },
        select: { id: true, name: true },
      });
      if (!dest) {
        return NextResponse.json(
          { message: "Local destino no encontrado" },
          { status: 404 },
        );
      }

      await moveAccountToBranch(prisma, accountId, branchId, toBranchId);
      const team = await listAccountsForBranch(prisma, branchId);
      return NextResponse.json({
        ok: true,
        movedTo: { id: dest.id, name: dest.name },
        team: team.map(memberPayload),
      });
    }

    const raw = body.managerAccountId;
    const managerAccountId =
      raw === null || raw === "" || raw === undefined
        ? null
        : Number(raw);

    if (
      managerAccountId != null &&
      (!Number.isInteger(managerAccountId) || managerAccountId <= 0)
    ) {
      return NextResponse.json({ message: "Cuenta inválida" }, { status: 400 });
    }

    if (managerAccountId != null) {
      const linked = await accountBelongsToBranch(
        prisma,
        managerAccountId,
        branchId,
      );
      if (!linked) {
        return NextResponse.json(
          { message: "Primero vincula a esa persona a este local" },
          { status: 400 },
        );
      }

      const account = await prisma.account.findFirst({
        where: { id: managerAccountId },
        include: { roles: { include: { role: true } } },
      });
      const roleNames = (account?.roles ?? []).map((r) =>
        String(r.role?.name ?? "").toLowerCase(),
      );
      const canLead =
        roleNames.some((n) => isOwnerRole(n) || isBranchAdminRole(n)) ||
        roleNames.some((n) => n.includes("admin") || n.includes("encargado"));
      if (!canLead) {
        return NextResponse.json(
          {
            message:
              "El encargado principal debe tener rol Administrador (o Dueña). Cámbialo en Cuentas.",
          },
          { status: 400 },
        );
      }
    }

    await setBranchManagerAccountId(prisma, branchId, managerAccountId);
    const team = await listAccountsForBranch(prisma, branchId);
    return NextResponse.json({
      ok: true,
      managerAccountId,
      team: team.map(memberPayload),
    });
  } catch (error) {
    console.error("PATCH /api/branches/[id]/members", error);
    return NextResponse.json(
      { message: "No se pudo actualizar" },
      { status: 500 },
    );
  }
}

/**
 * DELETE: desvincular cuenta del local.
 * Query: ?accountId=
 */
export async function DELETE(request: Request, ctx: Ctx) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const branchId = parseId((await ctx.params).id);
  if (!branchId) {
    return NextResponse.json({ message: "Local inválido" }, { status: 400 });
  }

  try {
    const accountId = Number(
      new URL(request.url).searchParams.get("accountId"),
    );
    if (!Number.isInteger(accountId) || accountId <= 0) {
      return NextResponse.json({ message: "Cuenta inválida" }, { status: 400 });
    }

    await unlinkAccountFromBranch(prisma, accountId, branchId);
    const team = await listAccountsForBranch(prisma, branchId);
    return NextResponse.json({
      ok: true,
      team: team.map(memberPayload),
    });
  } catch (error) {
    console.error("DELETE /api/branches/[id]/members", error);
    return NextResponse.json(
      { message: "No se pudo desvincular" },
      { status: 500 },
    );
  }
}
