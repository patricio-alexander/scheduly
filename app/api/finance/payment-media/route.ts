import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole, isOwnerRole } from "@/shared/utils/roles";
import {
  DEFAULT_PAYMENT_MEDIA,
  normalizeMediumKind,
} from "@/shared/utils/payment-media";

async function ensureDefaultMedia() {
  const count = await prisma.paymentMedium.count();
  if (count > 0) return;
  await prisma.paymentMedium.createMany({
    data: DEFAULT_PAYMENT_MEDIA.map((m) => ({
      name: m.name,
      code: m.code,
      kind: m.kind,
      position: m.position,
      isActive: true,
    })),
  });
}

/** GET medios de pago (incluye inactivos para dueña/admin). */
export async function GET(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    await ensureDefaultMedia();
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get("active") === "1";
    const media = await prisma.paymentMedium.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ media });
  } catch (error) {
    console.error("GET /api/finance/payment-media", error);
    return NextResponse.json(
      { message: "Error al obtener medios de pago" },
      { status: 500 },
    );
  }
}

/** POST crear medio (dueña). */
export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    await ensureDefaultMedia();
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }
    const codeRaw = String(body.code ?? "").trim().toLowerCase();
    const code =
      codeRaw ||
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 40) ||
      null;
    const position = Number(body.position);
    const medium = await prisma.paymentMedium.create({
      data: {
        name,
        code,
        kind: normalizeMediumKind(body.kind),
        position: Number.isFinite(position) ? position : 100,
        isActive: body.isActive === false ? false : true,
      },
    });
    return NextResponse.json(medium, { status: 201 });
  } catch (error) {
    console.error("POST /api/finance/payment-media", error);
    const message =
      error instanceof Error && error.message.includes("Unique")
        ? "Ya existe un medio con ese código"
        : "Error al crear el medio de pago";
    return NextResponse.json({ message }, { status: 400 });
  }
}
