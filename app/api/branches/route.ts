import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            appointments: true,
            stocks: true,
          },
        },
      },
    });

    // Compat UI legacy: isMain / code / sortOrder
    return NextResponse.json(
      branches.map((b, idx) => ({
        ...b,
        code: b.establishmentCode || `suc-${b.id}`,
        isMain: idx === 0 || b.locationKind === "propia",
        sortOrder: b.position,
      })),
    );
  } catch (error) {
    console.error("GET /api/branches", error);
    return NextResponse.json(
      { message: "Error al obtener sucursales" },
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
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        address: String(body.address ?? "").trim() || "—",
        phone: String(body.phone ?? "").trim() || null,
        isActive: body.isActive !== false,
        position: Number(body.sortOrder ?? body.position ?? 0) || 0,
        locationKind: "propia",
        establishmentCode: String(body.code ?? "001").slice(0, 3),
      },
    });

    return NextResponse.json(
      {
        ...branch,
        code: branch.establishmentCode,
        isMain: true,
        sortOrder: branch.position,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/branches", error);
    return NextResponse.json(
      { message: "Error al crear sucursal" },
      { status: 400 },
    );
  }
}
