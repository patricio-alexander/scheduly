import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { getUserPrimaryBranchId } from "@/shared/utils/branches";
import { transferBranchStock } from "@/shared/utils/branch-stock";
import { canTransferStock, isBranchAdminRole } from "@/shared/utils/roles";
import { notifyStockTransfer } from "@/shared/utils/transfer-notify";

/** Historial de traspasos = movimientos de kardex con reason traspaso. */
export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!canTransferStock(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const rows = await prisma.stockMovement.findMany({
      where: { reason: "traspaso", type: "salida" },
      orderBy: { date: "desc" },
      take: 50,
      include: {
        product: { select: { id: true, name: true } },
        creator: { select: { id: true, username: true } },
      },
    });

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        date: r.date.toISOString(),
        quantity: r.quantity,
        description: r.description,
        fromBranchId: r.referenceType === "stock_transfer_out" ? r.referenceId : null,
        product: r.product,
        user: {
          id: r.creator.id,
          name: r.creator.username,
        },
      })),
    );
  } catch (error) {
    console.error("GET /api/branches/transfers", error);
    return NextResponse.json(
      { message: "Error al obtener transferencias" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!canTransferStock(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const fromBranchId = Number(body.fromBranchId);
    const toBranchId = Number(body.toBranchId);
    const notes = String(body.notes ?? "").trim();
    const linesRaw = body.lines;
    const movedAtRaw = body.movedAt ? new Date(String(body.movedAt)) : null;
    const movedAt =
      movedAtRaw && !Number.isNaN(movedAtRaw.getTime()) ? movedAtRaw : undefined;

    if (!Number.isInteger(fromBranchId) || fromBranchId <= 0) {
      return NextResponse.json({ message: "Sucursal origen inválida" }, { status: 400 });
    }
    if (!Number.isInteger(toBranchId) || toBranchId <= 0) {
      return NextResponse.json({ message: "Sucursal destino inválida" }, { status: 400 });
    }
    if (fromBranchId === toBranchId) {
      return NextResponse.json(
        { message: "Origen y destino deben ser distintos" },
        { status: 400 },
      );
    }

    if (isBranchAdminRole(auth.user.role)) {
      const adminBranchId = await getUserPrimaryBranchId(prisma, auth.user.id);
      if (!adminBranchId || fromBranchId !== adminBranchId) {
        return NextResponse.json(
          { message: "Solo puedes transferir desde tu sucursal" },
          { status: 403 },
        );
      }
    }

    const lines: Array<{ productId: number; quantity: number }> = [];
    if (Array.isArray(linesRaw)) {
      for (const item of linesRaw) {
        if (!item || typeof item !== "object") continue;
        const productId = Number((item as { productId?: unknown }).productId);
        const quantity = Number((item as { quantity?: unknown }).quantity);
        if (
          Number.isInteger(productId) &&
          productId > 0 &&
          Number.isInteger(quantity) &&
          quantity > 0
        ) {
          lines.push({ productId, quantity });
        }
      }
    }

    const transfer = await prisma.$transaction((tx) =>
      transferBranchStock(tx, {
        fromBranchId,
        toBranchId,
        userId: auth.user.id,
        notes,
        lines,
        movedAt,
      }),
    );

    await notifyStockTransfer({
      fromBranchName: transfer.fromBranch.name,
      toBranchName: transfer.toBranch.name,
      toBranchId,
      actorUserId: auth.user.id,
      lines: transfer.lines.map((line) => ({
        productName: line.product.name,
        quantity: line.quantity,
      })),
      notes,
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al transferir stock";
    return NextResponse.json({ message }, { status: 400 });
  }
}
