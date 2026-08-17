export type RewardApplyType = "general" | "service" | "product";

export const rewardApplyInclude = {
  service: { select: { id: true, name: true } },
  product: { select: { id: true, name: true } },
} as const;

export function rewardApplyTypeFromRecord(reward: {
  serviceId?: number | null;
  productId?: number | null;
}): RewardApplyType {
  if (reward.serviceId) return "service";
  if (reward.productId) return "product";
  return "general";
}

export function formatRewardApplyLabel(reward: {
  service?: { name: string } | null;
  product?: { name: string } | null;
}): string | null {
  if (reward.service?.name) return `Servicio: ${reward.service.name}`;
  if (reward.product?.name) return `Producto: ${reward.product.name}`;
  return null;
}

export function parseRewardBody(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const pointsCost = Number(body.pointsCost ?? 0);
  const sortOrder = Number(body.sortOrder ?? 0);
  const isActive = body.isActive !== false;
  const applyType = String(body.applyType ?? "general") as RewardApplyType;
  const discountPctRaw = body.discountPct;
  const discountPct =
    discountPctRaw == null || discountPctRaw === ""
      ? null
      : Number(discountPctRaw);

  if (!name) throw new Error("Nombre requerido");
  if (!Number.isInteger(pointsCost) || pointsCost <= 0) {
    throw new Error("Costo en puntos inválido");
  }

  let serviceId =
    body.serviceId != null && body.serviceId !== ""
      ? Number(body.serviceId)
      : null;
  let productId =
    body.productId != null && body.productId !== ""
      ? Number(body.productId)
      : null;

  if (applyType === "general") {
    serviceId = null;
    productId = null;
  } else if (applyType === "service") {
    productId = null;
    if (!Number.isInteger(serviceId) || (serviceId ?? 0) <= 0) {
      throw new Error("Selecciona un servicio");
    }
  } else   if (applyType === "product") {
    serviceId = null;
    if (!Number.isInteger(productId) || (productId ?? 0) <= 0) {
      throw new Error("Selecciona un producto");
    }
  }

  if (applyType !== "general" && discountPct != null) {
    if (!Number.isFinite(discountPct) || discountPct <= 0 || discountPct > 100) {
      throw new Error("Descuento inválido (1-100%)");
    }
  }

  const resolvedDiscountPct =
    applyType === "general" ? null : discountPct ?? null;

  return {
    name,
    description,
    pointsCost,
    sortOrder,
    isActive,
    serviceId,
    productId,
    discountPct: resolvedDiscountPct,
  };
}
