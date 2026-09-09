import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isOwnerRole } from "@/shared/utils/roles";
import { normalizeMediumKind } from "@/shared/utils/payment-media";

/** PUT editar / deshabilitar medio (sin eliminar). */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const mediumId = Number(id);
  if (!Number.isInteger(mediumId) || mediumId <= 0) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  try {
    const existing = await prisma.paymentMedium.findUnique({
      where: { id: mediumId },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Medio no encontrado" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const name =
      body.name !== undefined
        ? String(body.name).trim()
        : existing.name;
    if (!name) {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }

    const position =
      body.position !== undefined ? Number(body.position) : existing.position;

    const medium = await prisma.paymentMedium.update({
      where: { id: mediumId },
      data: {
        name,
        kind:
          body.kind !== undefined
            ? normalizeMediumKind(body.kind)
            : existing.kind,
        position: Number.isFinite(position) ? position : existing.position,
        isActive:
          body.isActive !== undefined
            ? Boolean(body.isActive)
            : existing.isActive,
      },
    });
    return NextResponse.json(medium);
  } catch (error) {
    console.error("PUT /api/finance/payment-media/[id]", error);
    return NextResponse.json(
      { message: "Error al actualizar el medio" },
      { status: 400 },
    );
  }
}

/** DELETE deshabilita (no borra filas). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isOwnerRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const mediumId = Number(id);
  if (!Number.isInteger(mediumId) || mediumId <= 0) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  try {
    const medium = await prisma.paymentMedium.update({
      where: { id: mediumId },
      data: { isActive: false },
    });
    return NextResponse.json({
      message: "Medio deshabilitado",
      medium,
    });
  } catch {
    return NextResponse.json(
      { message: "Error al deshabilitar el medio" },
      { status: 400 },
    );
  }
}
