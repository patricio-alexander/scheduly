import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isAdminRole } from "@/shared/utils/roles";

function parseServiceBody(body: unknown) {
  const data = (body ?? {}) as Record<string, unknown>;
  const name = String(data.name ?? "").trim();
  const price = Number(data.price);
  const durationMinutes = Number(data.durationMinutes ?? 30);
  const commissionPct = Number(data.commissionPct ?? 15);

  if (!name) {
    return { error: "El nombre es requerido" as const };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "El precio es inválido" as const };
  }
  if (
    !Number.isFinite(durationMinutes) ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 5 ||
    durationMinutes > 480
  ) {
    return { error: "La duración debe ser entre 5 y 480 minutos" as const };
  }
  if (
    !Number.isFinite(commissionPct) ||
    commissionPct < 0 ||
    commissionPct > 100
  ) {
    return { error: "La comisión debe estar entre 0 y 100%" as const };
  }

  return { name, price, durationMinutes, commissionPct };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const service = await prisma.service.findUnique({
      where: { id: Number(id) },
    });
    if (!service) {
      return NextResponse.json(
        { message: "Servicio no encontrado" },
        { status: 404 },
      );
    }
    return NextResponse.json(service);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener el servicio" },
      { status: 500 },
    );
  }
}

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
    const parsed = parseServiceBody(await request.json());
    if ("error" in parsed) {
      return NextResponse.json({ message: parsed.error }, { status: 400 });
    }

    const service = await prisma.service.update({
      where: { id: Number(id) },
      data: {
        name: parsed.name,
        price: parsed.price,
        durationMinutes: parsed.durationMinutes,
        commissionPct: parsed.commissionPct,
      },
    });
    return NextResponse.json(service);
  } catch {
    return NextResponse.json(
      { message: "Error al actualizar el servicio" },
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

  if (!isAdminRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.service.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Servicio eliminado" });
  } catch {
    return NextResponse.json(
      { message: "Error al eliminar el servicio" },
      { status: 500 },
    );
  }
}
