import { prisma } from "@/shared/utils/prisma";
import {
  isOutOfStock,
  isStockAlert,
  LOW_STOCK_THRESHOLD,
} from "@/shared/utils/stock";

/**
 * Crea notificaciones de warning para dueños cuando un producto
 * llega al mínimo o se queda sin stock. Evita duplicados no vistos.
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
  const link = `/inventario/productos?productId=${product.id}`;

  const ownerRole = await prisma.role.findFirst({
    where: {
      OR: [{ name: "Dueño" }, { name: "owner" }],
    },
  });
  if (!ownerRole) return;

  const links = await prisma.accountRole.findMany({
    where: { roleId: ownerRole.id },
    select: { account: { select: { userId: true, isActive: true } } },
  });

  const personIds = [
    ...new Set(
      links
        .map((l) => l.account.userId)
        .filter((id): id is number => typeof id === "number" && id > 0),
    ),
  ];

  for (const userId of personIds) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: "alert",
        seen: false,
        OR: [{ title }, { link }],
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: "alert",
        link,
      },
    });
  }
}
