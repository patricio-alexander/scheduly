import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isAdminRole } from "@/shared/utils/roles";

function parseServiceBody(body: unknown) {
  const data = (body ?? {}) as Record<string, unknown>;
  const name = String(data.name ?? "").trim();
  const price = Number(data.price);
  const durationMinutes = Number(data.durationMinutes ?? 30);

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

  return { name, price, durationMinutes };
}

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    const services = await prisma.service.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(services);
  } catch {
    return NextResponse.json(
      { message: "Error al obtener servicios" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isAdminRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const parsed = parseServiceBody(await request.json());
    if ("error" in parsed) {
      return NextResponse.json({ message: parsed.error }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        name: parsed.name,
        price: parsed.price,
        durationMinutes: parsed.durationMinutes,
      },
    });
    return NextResponse.json(service, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Error al crear el servicio" },
      { status: 500 },
    );
  }
}
