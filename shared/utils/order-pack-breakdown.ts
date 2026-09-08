/** Utilidades read-only para desglosar ítems por pacas (cobranzas). */

export type PackBreakdownItem = {
  id: number;
  productId?: number;
  product?: string;
  name?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  unitPrice?: number;
  taxRate?: number;
  lineTotal?: number;
  packKey?: string | null;
  packName?: string | null;
  lotCode?: string | null;
  expiresAt?: string | null;
  manufacturedAt?: string | null;
  packId?: number | null;
};

type HydratedPack = {
  key: string;
  name: string;
  expiresAt?: string;
};

type HydratedItem = {
  lineId: string;
  id: number;
  name: string;
  packKey: string | null;
  quantity: number;
  unitPrice: number;
};

const dateOnly = (v: string | null | undefined) =>
  v ? String(v).slice(0, 10) : "";

function effectivePackKey(item: PackBreakdownItem) {
  if (item.packKey) return String(item.packKey);
  const name = String(item.packName || "").trim();
  if (name) return `name_${name}`;
  return null;
}

export function hydratePacksForDisplay(
  rawItems: PackBreakdownItem[],
  priceField: "price" | "unitPrice" = "unitPrice",
) {
  const packs: HydratedPack[] = [];
  const packByKey = new Map<string, HydratedPack>();

  for (const item of rawItems) {
    const packKey = effectivePackKey(item);
    if (!packKey || packByKey.has(packKey)) continue;
    const pack: HydratedPack = {
      key: packKey,
      name: item.packName || "Paca",
      expiresAt: dateOnly(item.expiresAt) || undefined,
    };
    packByKey.set(packKey, pack);
    packs.push(pack);
  }

  const items: HydratedItem[] = rawItems.map((item, index) => ({
    lineId: `line_${item.id ?? index}`,
    id: item.id,
    name: item.product ?? item.name ?? "(sin nombre)",
    packKey: effectivePackKey(item),
    quantity: Number(item.quantity ?? item.qty ?? 0),
    unitPrice: Number(
      priceField === "price"
        ? (item.price ?? item.unitPrice ?? 0)
        : (item.unitPrice ?? item.price ?? 0),
    ),
  }));

  return { items, packs };
}

export function buildDisplayBoardOrder(
  items: HydratedItem[],
  packs: HydratedPack[],
) {
  const order: Array<{ type: "item" | "pack"; key: string }> = [];
  const seenPacks = new Set<string>();
  for (const it of items) {
    if (!it.packKey) {
      order.push({ type: "item", key: it.lineId });
      continue;
    }
    if (!seenPacks.has(it.packKey)) {
      seenPacks.add(it.packKey);
      order.push({ type: "pack", key: it.packKey });
    }
  }
  for (const pack of packs) {
    if (!seenPacks.has(pack.key)) {
      order.push({ type: "pack", key: pack.key });
    }
  }
  return order;
}
