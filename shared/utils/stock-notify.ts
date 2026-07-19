import { prisma } from "@/shared/utils/prisma";
import {
  isOutOfStock,
  isStockAlert,
  LOW_STOCK_THRESHOLD,
} from "@/shared/utils/stock";

/**
 * Crea notificaciones de warning para admins cuando un producto
 * llega al mínimo o se queda sin stock. Evita duplicados no leídos.
 * Solo usar en API / código de servidor (no importar desde client components).
 */
export async function notifyAdminsLowStock(product: {
  id: number;
  name: string;
  stock: number;
}) {
  if (!isStockAlert(product.stock)) return;

  const title = isOutOfStock(product.stock)
    ? `Sin stock: ${product.name}`
    : `Stock bajo: ${product.name}`;
  const message = isOutOfStock(product.stock)
    ? `"${product.name}" se quedó sin unidades. Reponer inventario.`
    : `"${product.name}" tiene solo ${product.stock} unidad(es) (mínimo ${LOW_STOCK_THRESHOLD}).`;

  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  });

  for (const admin of admins) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: admin.id,
        type: "warning",
        title,
        read: false,
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId: admin.id,
        title,
        message,
        type: "warning",
      },
    });
  }
}
