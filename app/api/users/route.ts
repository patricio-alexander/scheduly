import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { hashPassword } from "@/shared/utils/password";
import { checkAuth } from "@/shared/utils/check-auth";
import {
  getUserBranchSummary,
  resolveUserBranchId,
  setUserPrimaryBranch,
} from "@/shared/utils/branches";
import { isOwnerRole } from "@/shared/utils/roles";

function parseBranchIdFromBody(body: Record<string, unknown>): number | null {
  const raw = body.branchId;
  if (raw == null || raw === "") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function serializeUser(
  user: {
    id: number;
    username: string;
    name: string;
    email: string;
    role: string;
    photo?: string | null;
  },
  branch: { id: number; name: string; code: string } | null,
) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    photo: user.photo ?? null,
    branch,
  };
}

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        photo: true,
      },
      orderBy: { id: "desc" },
    });

    const withBranches = await Promise.all(
      users.map(async (user) => {
        const branch = await getUserBranchSummary(prisma, user.id);
        return serializeUser(user, branch);
      }),
    );

    return NextResponse.json(withBranches);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener usuarios" },
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
    const body = (await request.json()) as Record<string, unknown>;
    const username = String(body.username ?? "").trim();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const role = String(body.role ?? "employee");
    const branchId = parseBranchIdFromBody(body);
    const resolvedBranchId = await resolveUserBranchId(prisma, role, branchId);
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
    if (!resolvedBranchId) {
      return NextResponse.json(
        { message: "Selecciona una sucursal para el usuario" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { message: "El nombre de usuario ya existe" },
        { status: 409 },
      );
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username,
          name,
          email,
          password: await hashPassword(password),
          role,
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          photo: true,
        },
      });

      await setUserPrimaryBranch(tx, created.id, resolvedBranchId);
      return created;
    });

    const branch = await getUserBranchSummary(prisma, user.id);
    return NextResponse.json(serializeUser(user, branch), { status: 201 });
  } catch (error) {
    console.error("POST /api/users", error);
    return NextResponse.json(
      { message: "Error al crear el usuario" },
      { status: 500 },
    );
  }
}
