import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const branches = await prisma.branch.findMany({
      orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            users: true,
            appointments: true,
            stocks: true,
          },
        },
      },
    });
    return NextResponse.json(branches);
  } catch {
    return NextResponse.json({ message: "Error al obtener sucursales" }, { status: 500 });
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
    const name = String(body.name ?? "").trim();
    const code = String(body.code ?? "").trim().toLowerCase();
    if (!name || !code) {
      return NextResponse.json({ message: "Nombre y código requeridos" }, { status: 400 });
    }

    const isMain = body.isMain === true;

    if (isMain) {
      await prisma.branch.updateMany({ data: { isMain: false } });
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        address: String(body.address ?? "").trim(),
        phone: String(body.phone ?? "").trim(),
        isActive: body.isActive !== false,
        isMain,
        sortOrder: Number(body.sortOrder ?? 0) || 0,
      },
    });
    return NextResponse.json(branch, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Error al crear sucursal" }, { status: 500 });
  }
}
