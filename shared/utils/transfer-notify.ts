import { prisma } from "@/shared/utils/prisma";
import { appRoutes } from "@/shared/utils/app-routes";

type TransferLine = {
  productName: string;
  quantity: number;
};

function formatLinesSummary(lines: TransferLine[]) {
  return lines.map((line) => `${line.productName} ×${line.quantity}`).join(" · ");
}

/**
 * Notifica al owner y al personal de la sucursal destinataria.
 * No notifica otras sucursales ni al origen (salvo que coincida con el destino).
 */
export async function notifyStockTransfer(input: {
  fromBranchName: string;
  toBranchName: string;
  toBranchId: number;
  actorUserId: number;
  lines: TransferLine[];
  notes?: string;
}) {
  if (input.lines.length === 0) return;

  const summary = formatLinesSummary(input.lines);
  const link = appRoutes.branches.stock;
  const notesSuffix = input.notes?.trim()
    ? ` · Nota: ${input.notes.trim()}`
    : "";

  const [owners, branchUsers] = await Promise.all([
    prisma.user.findMany({
      where: { role: "owner" },
      select: { id: true },
    }),
    prisma.userBranch.findMany({
      where: { branchId: input.toBranchId },
      select: { userId: true },
    }),
  ]);

  const ownerIds = new Set(owners.map((user) => user.id));
  const recipientIds = new Set<number>(ownerIds);

  for (const row of branchUsers) {
    recipientIds.add(row.userId);
  }

  if (!ownerIds.has(input.actorUserId)) {
    recipientIds.delete(input.actorUserId);
  }

  if (recipientIds.size === 0) return;

  await prisma.notification.createMany({
    data: [...recipientIds].map((userId) => {
      const isOwner = ownerIds.has(userId);
      return {
        userId,
        title: isOwner
          ? "Transferencia entre sucursales"
          : "Stock recibido",
        message: isOwner
          ? `${input.fromBranchName} → ${input.toBranchName}: ${summary}${notesSuffix}`
          : `Inventario desde ${input.fromBranchName}: ${summary}${notesSuffix}`,
        type: "info",
        link,
      };
    }),
  });
}
