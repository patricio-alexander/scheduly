import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { isManagementRole } from "@/shared/utils/roles";
import {
  serializeVoucher,
  voucherInclude,
} from "@/src/features/vouchers/lib/serialize-voucher";

async function loadId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** PATCH marca el vale como descontado (o lo vuelve a pendiente). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const id = await loadId(params);
  if (!id) {
    return NextResponse.json({ message: "Vale inválido" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const existing = await prisma.employeeVoucher.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "El vale no existe" },
        { status: 404 },
      );
    }

    const settled = Boolean(body.settled);
    const updated = await prisma.employeeVoucher.update({
      where: { id },
      data: { settledAt: settled ? new Date() : null },
      include: voucherInclude,
    });

    return NextResponse.json(serializeVoucher(updated));
  } catch (error) {
    console.error("PATCH /api/operation/vouchers/[id]", error);
    const message =
      error instanceof Error ? error.message : "Error al actualizar el vale";
    return NextResponse.json({ message }, { status: 400 });
  }
}

/** DELETE anula un vale. Uno ya descontado no se borra: rompería la liquidación. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const id = await loadId(params);
  if (!id) {
    return NextResponse.json({ message: "Vale inválido" }, { status: 400 });
  }

  try {
    const existing = await prisma.employeeVoucher.findUnique({
      where: { id },
      select: { id: true, settledAt: true },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "El vale no existe" },
        { status: 404 },
      );
    }
    if (existing.settledAt) {
      return NextResponse.json(
        {
          message:
            "Ese vale ya fue descontado en una liquidación. Marcalo como pendiente antes de anularlo.",
        },
        { status: 409 },
      );
    }

    await prisma.employeeVoucher.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/operation/vouchers/[id]", error);
    const message =
      error instanceof Error ? error.message : "Error al anular el vale";
    return NextResponse.json({ message }, { status: 400 });
  }
}
