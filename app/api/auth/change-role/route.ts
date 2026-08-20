import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { serializeAuthUser } from "@/shared/utils/auth-user";
import { isOwnerRole, mapExternalRoleName } from "@/shared/utils/roles";

/**
 * POST /api/auth/change-role
 * body: { roleId: number } | { role: "owner"|"admin"|"employee" }
 * Cambia el rol activo preferido reordenando AccountRole (Dueño).
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
        (body.role != null && r.name === String(body.role)),
    );

    if (!targetRole && isOwnerRole(auth.user.role) && body.role) {
      targetRole = payloadPreview.roles.find((r) => r.name === body.role);
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

    // Preferir el rol elegido: lo dejamos como primer AccountRole
    const links = await prisma.accountRole.findMany({
      where: { accountId },
      include: { role: true },
    });
    const chosen = links.find(
      (l) =>
        l.roleId === targetRole!.id ||
        mapExternalRoleName(l.role.name) === targetRole!.name,
    );
    if (chosen) {
      await prisma.$transaction([
        prisma.accountRole.delete({ where: { id: chosen.id } }),
        prisma.accountRole.create({
          data: { accountId, roleId: chosen.roleId },
        }),
      ]);
    }

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
