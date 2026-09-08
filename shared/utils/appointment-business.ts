import { deductBranchStock, incrementBranchStock } from "@/shared/utils/branch-stock";
import { recordStockMovements } from "@/shared/utils/stock-movement-log";
import type { PrismaClient } from "@/generated/prisma/client";
import { lineTotal, toAmount } from "@/shared/utils/money";
import { paymentMethodOptions, type PaymentMethodValue } from "@/shared/utils/payment-methods";
import { isStockAlert, LOW_STOCK_THRESHOLD } from "@/shared/utils/stock";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export type AppointmentProductInput = {
  productId: number;
  quantity: number;
};

export function calcAppointmentTotal(
  services: Array<{ service: { price: unknown } }>,
  products: Array<{ product: { price: unknown }; quantity: unknown }>,
) {
  const servicesTotal = services.reduce((sum, { service }) => sum + toAmount(service.price), 0);
  const productsTotal = products.reduce(
    (sum, { product, quantity }) => sum + lineTotal(product.price, quantity),
    0,
  );
  return servicesTotal + productsTotal;
}

export function parseAppointmentProducts(
  products: unknown,
  productIds?: unknown,
): AppointmentProductInput[] {
  if (Array.isArray(products) && products.length > 0) {
    const merged = new Map<number, number>();

    for (const item of products) {
      if (!item || typeof item !== "object") continue;
      const productId = Number((item as { productId?: unknown }).productId);
      const quantity = Number((item as { quantity?: unknown }).quantity ?? 1);

      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error("Producto inválido");
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Cantidad inválida");
      }

      merged.set(productId, (merged.get(productId) ?? 0) + quantity);
    }

    return [...merged.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
  }

  if (Array.isArray(productIds)) {
    return productIds
      .map((id) => ({ productId: Number(id), quantity: 1 }))
      .filter((item) => item.productId > 0);
  }

  return [];
}

export async function validateProductStock(
  tx: Tx,
  items: AppointmentProductInput[],
  excludeAppointmentId?: number,
  branchId?: number | null,
) {
  if (items.length === 0) return;

  for (const { productId, quantity } of items) {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new Error(`Producto #${productId} no encontrado`);
    }

    let reserved = 0;
    if (excludeAppointmentId) {
      const existing = await tx.appointmentProduct.findUnique({
        where: {
          appointmentId_productId: {
            appointmentId: excludeAppointmentId,
            productId,
          },
        },
      });
      reserved = existing?.quantity ?? 0;
    }

    let available: number;
    if (branchId) {
      const row = await tx.branchStock.findUnique({
        where: { storeId_productId: { storeId: branchId, productId } },
      });
      // storeId = Branch.id · quantity es el stock por local
      available = (row?.quantity ?? product.stock ?? 0) + reserved;
    } else {
      available = product.stock + reserved;
    }

    if (available < quantity) {
      throw new Error(`Stock insuficiente para "${product.name}" (disponible: ${available})`);
    }
  }
}

export async function deductStockForAppointment(
  tx: Tx,
  appointmentId: number,
  createdByAccountId?: number | null,
) {
  const appointment = await tx.appointment.findUnique({
    where: { id: appointmentId },
    include: { products: true },
  });

  if (!appointment || appointment.stockDeducted || appointment.products.length === 0) {
    return;
  }

  const lowStockProducts: Array<{ id: number; name: string; stock: number }> = [];

  if (appointment.branchId) {
    await deductBranchStock(
      tx,
      appointment.branchId,
      appointment.products.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
      })),
    );
    for (const { productId } of appointment.products) {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (product && isStockAlert(product.stock)) {
        lowStockProducts.push(product);
      }
    }
  } else {
    for (const { productId, quantity } of appointment.products) {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) continue;
      if (product.stock < quantity) {
        throw new Error(`Stock insuficiente para "${product.name}"`);
      }
      const updated = await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });
      if (isStockAlert(updated.stock)) {
        lowStockProducts.push(updated);
      }
    }
  }

  let movementCreatorId = createdByAccountId ?? null;
  if (!movementCreatorId) {
    const account = await tx.account.findFirst({
      where: { userId: appointment.userId, isActive: true },
      select: { id: true },
    });
    movementCreatorId = account?.id ?? null;
  }
  if (movementCreatorId) {
    await recordStockMovements(
      tx,
      movementCreatorId,
      "salida",
      appointment.products.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
      })),
      {
        description: `Uso en cita #${appointmentId}`,
        reason: "cita",
        referenceType: "appointment",
        referenceId: appointmentId,
        date: appointment.appointmentDate,
      },
    );
  }

  await tx.appointment.update({
    where: { id: appointmentId },
    data: { stockDeducted: true },
  });

  if (lowStockProducts.length === 0) return;

  const admins = await tx.account.findMany({
    where: {
      isActive: true,
      userId: { not: null },
      roles: { some: { role: { name: "admin" } } },
    },
    select: { userId: true },
  });

  for (const product of lowStockProducts) {
    const title =
      product.stock <= 0
        ? `Sin stock: ${product.name}`
        : `Stock bajo: ${product.name}`;
    const message =
      product.stock <= 0
        ? `"${product.name}" se quedó sin unidades. Reponer inventario.`
        : `"${product.name}" tiene solo ${product.stock} unidad(es) (mínimo ${LOW_STOCK_THRESHOLD}).`;

    for (const admin of admins) {
      const personId = admin.userId;
      if (!personId) continue;

      const existing = await tx.notification.findFirst({
        where: {
          userId: personId,
          type: "alert",
          title,
          seen: false,
        },
        select: { id: true },
      });
      if (existing) continue;

      await tx.notification.create({
        data: {
          userId: personId,
          title,
          message,
          type: "alert",
        },
      });
    }
  }
}

export async function restoreStockForAppointment(tx: Tx, appointmentId: number) {
  const appointment = await tx.appointment.findUnique({
    where: { id: appointmentId },
    include: { products: true },
  });

  if (!appointment || !appointment.stockDeducted || appointment.products.length === 0) {
    return;
  }

  if (appointment.branchId) {
    await incrementBranchStock(
      tx,
      appointment.branchId,
      appointment.products.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
      })),
    );
  } else {
    for (const { productId, quantity } of appointment.products) {
      await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
      });
    }
  }

  await tx.appointment.update({
    where: { id: appointmentId },
    data: { stockDeducted: false },
  });
}

export async function deleteAppointmentRecord(tx: Tx, appointmentId: number) {
  const appointment = await tx.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, stockDeducted: true },
  });

  if (!appointment) {
    throw new Error("Turno no encontrado");
  }

  if (appointment.stockDeducted) {
    await restoreStockForAppointment(tx, appointmentId);
  }

  await tx.payment.deleteMany({ where: { appointmentId } });
  await tx.appointmentService.deleteMany({ where: { appointmentId } });
  await tx.appointmentProduct.deleteMany({ where: { appointmentId } });
  await tx.appointment.delete({ where: { id: appointmentId } });
}

export function parsePaymentMethod(value: unknown): PaymentMethodValue {
  const method = String(value ?? "cash");
  if (!paymentMethodOptions.includes(method as PaymentMethodValue)) {
    throw new Error("Método de pago inválido");
  }
  return method as PaymentMethodValue;
}
