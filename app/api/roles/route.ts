import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";
import { ensureDefaultRoles } from "@/shared/utils/ensure-default-roles";
import { isSystemRoleName } from "@/shared/utils/system-roles";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    await ensureDefaultRoles();

    const roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { userRoles: true } } },
    });

    // Contar también usuarios por el campo string User.role (legado/sistema)
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    });
    const stringCounts = new Map(
      usersByRole.map((row) => [row.role, row._count.role]),
    );

    const mapped = roles.map((r) => {
      const fromString =
        (stringCounts.get(r.name) ?? 0) +
        (r.name === "employee" ? (stringCounts.get("user") ?? 0) : 0);
      return {
        id: r.id,
        name: r.name,
        usersCount: Math.max(r._count.userRoles, fromString),
        system: isSystemRoleName(r.name),
      };
    });

    // Admin y Empleado primero; el resto alfabético
    mapped.sort((a, b) => {
      const rank = (name: string) =>
        name === "admin" ? 0 : name === "employee" ? 1 : 2;
      const ra = rank(a.name);
      const rb = rank(b.name);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name, "es");
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/roles", error);
    return NextResponse.json(
      { message: "Error al obtener roles" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    await ensureDefaultRoles();

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

    const existing = await prisma.role.findFirst({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { message: "Ya existe un rol con ese nombre" },
        { status: 409 },
      );
    }

    const role = await prisma.role.create({ data: { name } });
    return NextResponse.json(
      { id: role.id, name: role.name, usersCount: 0, system: false },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/roles", error);
    return NextResponse.json(
      { message: "Error al crear el rol" },
      { status: 400 },
    );
  }
}
