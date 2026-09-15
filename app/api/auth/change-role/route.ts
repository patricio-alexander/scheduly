import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { serializeAuthUser } from "@/shared/utils/auth-user";
import { isOwnerRole, mapExternalRoleName } from "@/shared/utils/roles";

/**
 * POST /api/auth/change-role
 * body: { roleId: number } | { role: "owner"|"admin"|"employee" }
 * Cambia el rol activo: recrea AccountRole dejando el elegido primero (id ASC = activo).
 */
export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      roleId?: number;
      role?: string;
    };

    const accountId = auth.user.id;
    const payloadPreview = await serializeAuthUser(prisma, accountId);
    if (!payloadPreview) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    let targetRole = payloadPreview.roles.find(
      (r) =>
        (body.roleId != null && r.id === Number(body.roleId)) ||
        (body.role != null &&
          (r.name === String(body.role) ||
            mapExternalRoleName(r.name) === mapExternalRoleName(body.role))),
    );

    if (!targetRole && isOwnerRole(auth.user.role) && body.role) {
      targetRole = payloadPreview.roles.find(
        (r) => mapExternalRoleName(r.name) === mapExternalRoleName(body.role),
      );
    }

    if (!targetRole) {
      return NextResponse.json(
        { message: "No tenés asignado ese rol" },
        { status: 403 },
      );
    }

    if (targetRole.name === payloadPreview.role) {
      return NextResponse.json(payloadPreview);
    }

    const links = await prisma.accountRole.findMany({
      where: { accountId },
      include: { role: true },
      orderBy: { id: "asc" },
    });

    const preferredRoleId = targetRole.id;
    const otherRoleIds = [
      ...new Set(
        links
          .map((l) => l.roleId)
          .filter((id) => id !== preferredRoleId),
      ),
    ];

    // Si la cuenta es dueña (tiene Dueño en links o activo), asegurar trio switchable
    const hasOwnerLink = links.some((l) =>
      isOwnerRole(mapExternalRoleName(l.role.name)),
    );
    if (hasOwnerLink || isOwnerRole(payloadPreview.role)) {
      for (const name of ["Dueño", "Administrador", "Empleado"] as const) {
        let role = await prisma.role.findFirst({ where: { name } });
        if (!role) role = await prisma.role.create({ data: { name } });
        if (
          role.id !== preferredRoleId &&
          !otherRoleIds.includes(role.id)
        ) {
          otherRoleIds.push(role.id);
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.accountRole.deleteMany({ where: { accountId } });
      // Primero = rol activo (check-auth / serialize leen orderBy id ASC)
      await tx.accountRole.create({
        data: { accountId, roleId: preferredRoleId },
      });
      for (const roleId of otherRoleIds) {
        await tx.accountRole.create({
          data: { accountId, roleId },
        });
      }
    });

    const updated = await serializeAuthUser(prisma, accountId);
    return NextResponse.json({
      message: `Rol actualizado: ${targetRole.label}`,
      ...updated,
    });
  } catch (error) {
    console.error("POST /api/auth/change-role", error);
    return NextResponse.json({ message: "Error al cambiar rol" }, { status: 500 });
  }
}
