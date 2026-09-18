import { NextResponse } from "next/server";
import { prisma } from "@/shared/utils/prisma";
import { checkAuth } from "@/shared/utils/check-auth";
import { assertLoyaltyCustomerAccess } from "@/shared/utils/loyalty-customer-access";
import { isManagementRole } from "@/shared/utils/roles";

export async function POST(request: Request) {
  const auth = await checkAuth();
  if (!auth.ok) return auth.response;

  if (!isManagementRole(auth.user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const transactionId = Number(body.transactionId);

    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      return NextResponse.json({ message: "Canje inválido" }, { status: 400 });
    }

    const redemption = await prisma.pointTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        customerId: true,
        source: true,
        deliveredAt: true,
        appointmentId: true,
        reward: { select: { id: true, name: true, productId: true } },
      },
    });

    if (!redemption || !redemption.reward) {
      return NextResponse.json({ message: "Canje no encontrado" }, { status: 404 });
    }

    if (redemption.source !== "customer" || redemption.appointmentId) {
      return NextResponse.json(
        { message: "Solo se confirma la entrega de canjes pedidos por el cliente" },
        { status: 400 },
      );
    }

    if (!redemption.reward.productId) {
      return NextResponse.json(
        { message: "Este premio no requiere entrega en el local" },
        { status: 400 },
      );
    }

    if (redemption.deliveredAt) {
      return NextResponse.json(
        { message: "Este premio ya fue marcado como entregado" },
        { status: 400 },
      );
    }

    const access = await assertLoyaltyCustomerAccess({
      customerId: redemption.customerId,
      role: auth.user.role,
      userId: auth.user.id,
    });
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }

    const updated = await prisma.pointTransaction.update({
      where: { id: redemption.id },
      data: { deliveredAt: new Date() },
      select: { id: true, deliveredAt: true },
    });

    return NextResponse.json({
      id: updated.id,
      deliveredAt: updated.deliveredAt?.toISOString() ?? null,
      message: `Premio entregado: ${redemption.reward.name}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al confirmar la entrega";
    return NextResponse.json({ message }, { status: 400 });
  }
}
