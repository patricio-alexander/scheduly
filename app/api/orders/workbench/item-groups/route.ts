import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { toAmount } from "@/shared/utils/money";
import { isManagementRole } from "@/shared/utils/roles";
import { lineTotal } from "@/shared/utils/collections-pending";

/** Crear grupo de cobro + opcionalmente abonar. */
export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;
  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const customerId = Number(body.customerId);
    const itemIds = Array.isArray(body.itemIds)
      ? body.itemIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)
      : [];
    const concept = String(body.concept ?? "").trim() || null;

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json({ message: "Cliente requerido" }, { status: 400 });
    }
    if (itemIds.length === 0) {
      return NextResponse.json(
        { message: "Selecciona al menos un ítem" },
        { status: 400 },
      );
    }

    const lines = await prisma.saleLine.findMany({
      where: { id: { in: itemIds } },
      include: {
        sale: { select: { customerId: true } },
        itemGroupItems: true,
      },
    });
    if (lines.length !== itemIds.length) {
      return NextResponse.json({ message: "Ítems inválidos" }, { status: 400 });
    }
    for (const l of lines) {
      if (l.sale.customerId !== customerId) {
        return NextResponse.json(
          { message: "Los ítems deben ser del mismo cliente" },
          { status: 400 },
        );
      }
      if (l.itemGroupItems.length > 0) {
        return NextResponse.json(
          { message: `Ítem #${l.id} ya está en un grupo` },
          { status: 400 },
        );
      }
    }

    const total = lines.reduce(
      (s, l) => s + lineTotal({ quantity: l.quantity, damagedQty: l.damagedQty, giftQty: l.giftQty, price: l.price }),
      0,
    );

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.itemGroup.create({
        data: {
          customerId,
          concept,
          status: "open",
          totalAmount: total,
          createdBy: auth.user.id,
          items: {
            create: itemIds.map((orderItemId) => ({ orderItemId })),
          },
        },
      });
      return created;
    });

    return NextResponse.json({ id: group.id, totalAmount: total }, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders/workbench/item-groups", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Error al crear grupo",
      },
      { status: 400 },
    );
  }
}
