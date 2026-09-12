import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { resolveCashFromBody } from "@/shared/utils/turno-cash";
import { buildActiveShiftPayload } from "@/shared/utils/shift-service";
import { getUserPrimaryBranchId } from "@/shared/utils/branches";
import { getCashRegisterMode } from "@/shared/utils/business-settings";
import {
  isPureEmployeeRole,
} from "@/shared/utils/roles";

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  try {
    if (!auth.user.personId) {
      return NextResponse.json(
        { message: "La cuenta no tiene persona asociada" },
        { status: 400 },
      );
    }

    const cashMode = await getCashRegisterMode();
    if (cashMode === "branch_shared" && isPureEmployeeRole(auth.user.role)) {
      return NextResponse.json(
        {
          message:
            "Modo caja compartida: solo el administrador abre el turno del local",
        },
        { status: 403 },
      );
    }

    const existing = await prisma.cashShift.findFirst({
      where: { status: "open", accountId: auth.user.id },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { message: "Ya tienes un turno abierto" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const resolved = resolveCashFromBody({
      cashCounts: body.cashCounts,
      cashTotal: body.cashTotal,
    });
    if (!resolved) {
      return NextResponse.json(
        { message: "Indica el capital inicial (arqueo o total)" },
        { status: 400 },
      );
    }

    const rawStore =
      body.storeId != null && body.storeId !== ""
        ? body.storeId
        : body.branchId != null && body.branchId !== ""
          ? body.branchId
          : null;
    let storeId = rawStore != null ? Number(rawStore) : null;
    if (storeId != null && (!Number.isInteger(storeId) || storeId <= 0)) {
      storeId = null;
    }

    if (!storeId) {
      storeId = await getUserPrimaryBranchId(prisma, auth.user.id);
    }
    if (!storeId) {
      const branch = await prisma.branch.findFirst({
        where: { isActive: true },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      storeId = branch?.id ?? null;
    }
    if (!storeId) {
      // Último recurso: cualquier local (p. ej. recién creado / reactivado)
      const anyBranch = await prisma.branch.findFirst({
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      storeId = anyBranch?.id ?? null;
    }

    if (!storeId) {
      return NextResponse.json(
        { message: "No hay sucursal activa para abrir el turno" },
        { status: 400 },
      );
    }

    const branch = await prisma.branch.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        establishmentCode: true,
        emissionPointCode: true,
      },
    });
    if (!branch) {
      return NextResponse.json(
        { message: "Sucursal no encontrada" },
        { status: 404 },
      );
    }

    let cashRegisterId =
      body.cashRegisterId != null && body.cashRegisterId !== ""
        ? Number(body.cashRegisterId)
        : null;

    if (!cashRegisterId) {
      const reg = await prisma.cashRegister.findFirst({
        where: { storeId, isActive: true },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      cashRegisterId = reg?.id ?? null;
    }

    if (!cashRegisterId) {
      const created = await prisma.cashRegister.create({
        data: {
          storeId,
          name: "Caja 1",
          code: "C1",
          emissionPointCode: branch.emissionPointCode || "001",
          isActive: true,
          position: 0,
        },
        select: { id: true },
      });
      cashRegisterId = created.id;
    }

    const openedAtRaw = body.openedAt
      ? new Date(String(body.openedAt))
      : new Date();
    const openedAt = Number.isNaN(openedAtRaw.getTime())
      ? new Date()
      : openedAtRaw;
    const notes = String(body.notes ?? "").trim() || null;

    const shift = await prisma.cashShift.create({
      data: {
        accountId: auth.user.id,
        userId: auth.user.personId,
        storeId,
        activeCashRegisterId: cashRegisterId,
        establishmentCode: branch.establishmentCode || "001",
        emissionPointCode: branch.emissionPointCode || "001",
        status: "open",
        openedAt,
        openingCashCounts: resolved.counts,
        openingCashTotal: resolved.total,
        openingNotes: notes,
      },
      select: { id: true },
    });

    const payload = await buildActiveShiftPayload(shift.id);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error("POST /api/shifts/open", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Error al abrir turno",
      },
      { status: 400 },
    );
  }
}
