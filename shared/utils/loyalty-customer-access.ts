import { prisma } from "@/shared/utils/prisma";
import { getUserPrimaryBranchId } from "@/shared/utils/branches";
import { isBranchAdminRole, isOwnerRole } from "@/shared/utils/roles";

export async function assertLoyaltyCustomerAccess(params: {
  customerId: number;
  role: string;
  userId: number;
}) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.customerId },
    select: {
      id: true,
      name: true,
      firstLastName: true,
      secondLastName: true,
      loyalty: { select: { points: true, tier: true } },
    },
  });

  if (!customer) {
    return { ok: false as const, status: 404, message: "Cliente no encontrado" };
  }

  if (!isOwnerRole(params.role) && isBranchAdminRole(params.role)) {
    const branchId = await getUserPrimaryBranchId(prisma, params.userId);
    if (!branchId) {
      return { ok: false as const, status: 403, message: "No autorizado" };
    }

    const linked = await prisma.customer.findFirst({
      where: {
        id: params.customerId,
        OR: [
          { appointments: { some: { branchId } } },
          { sales: { some: { shift: { storeId: branchId } } } },
        ],
      },
      select: { id: true },
    });

    if (!linked) {
      return {
        ok: false as const,
        status: 403,
        message: "Cliente fuera de tu sucursal",
      };
    }
  }

  return { ok: true as const, customer };
}
