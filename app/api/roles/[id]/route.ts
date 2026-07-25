import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isAdminRole } from "@/shared/utils/roles";
import { isSystemRoleName } from "@/shared/utils/system-roles";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isAdminRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const roleId = Number(id);
    if (!Number.isFinite(roleId)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const current = await prisma.role.findUnique({ where: { id: roleId } });
    if (!current) {
      return NextResponse.json(
        { message: "Rol no encontrado" },
        { status: 404 },
      );
    }

    if (isSystemRoleName(current.name)) {
      return NextResponse.json(
        { message: "No se puede renombrar un rol del sistema" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { message: "El nombre es requerido" },
        { status: 400 },
      );
    }

    if (isSystemRoleName(name)) {
      return NextResponse.json(
        { message: "Ese nombre de rol está reservado por el sistema" },
        { status: 409 },
      );
    }

    const duplicated = await prisma.role.findFirst({
      where: { name, NOT: { id: roleId } },
    });
    if (duplicated) {
      return NextResponse.json(
        { message: "Ya existe un rol con ese nombre" },
        { status: 409 },
      );
    }

    const role = await prisma.role.update({
      where: { id: roleId },
      data: { name },
      include: { _count: { select: { userRoles: true } } },
    });

    return NextResponse.json({
      id: role.id,
      name: role.name,
      usersCount: role._count.userRoles,
      system: false,
    });
  } catch (error) {
    console.error("PUT /api/roles/[id]", error);
    return NextResponse.json(
      { message: "Error al actualizar el rol" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isAdminRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const roleId = Number(id);
    if (!Number.isFinite(roleId)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const current = await prisma.role.findUnique({ where: { id: roleId } });
    if (!current) {
      return NextResponse.json(
        { message: "Rol no encontrado" },
        { status: 404 },
      );
    }

    if (isSystemRoleName(current.name)) {
      return NextResponse.json(
        { message: "No se puede eliminar un rol del sistema" },
        { status: 400 },
      );
    }

    const usersCount = await prisma.userRole.count({ where: { roleId } });
    const usersWithStringRole = await prisma.user.count({
      where: { role: current.name },
    });
    const total = usersCount + usersWithStringRole;
    if (total > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar: hay ${total} usuario(s) con este rol`,
        },
        { status: 400 },
      );
    }

    await prisma.role.delete({ where: { id: roleId } });
    return NextResponse.json({ message: "Rol eliminado" });
  } catch (error) {
    console.error("DELETE /api/roles/[id]", error);
    return NextResponse.json(
      { message: "Error al eliminar el rol" },
      { status: 500 },
    );
  }
}
