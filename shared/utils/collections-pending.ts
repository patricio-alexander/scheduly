/** Lógica de cobranzas alineada con EdDeli (billable + por cobrar). */

export function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Cantidad cobrable = entregado − dañado − yapa */
export function getBillableQty(it: {
  qty?: number;
  quantity?: number;
  damagedQty?: number;
  giftQty?: number;
}): number {
  const delivered = toNum(it.qty ?? it.quantity, 0);
  const damaged = toNum(it.damagedQty, 0);
  const gift = toNum(it.giftQty, 0);
  return Math.max(0, delivered - damaged - gift);
}

export function lineTotal(it: {
  qty?: number;
  quantity?: number;
  damagedQty?: number;
  giftQty?: number;
  price?: number;
}): number {
  return Number((getBillableQty(it) * toNum(it.price, 0)).toFixed(2));
}

export type PendingCustomerRow = {
  customerId: number;
  customerName: string;
  ungrouped: number;
  groups: number;
  total: number;
};

export type PendingCollectionsBreakdown = {
  futureIncome: number;
  groupsTotal: number;
  ungroupedTotal: number;
  byCustomer: PendingCustomerRow[];
  openGroups: Array<{
    groupId: number;
    concept: string;
    customerId: number;
    customerName: string;
    total: number;
    paid: number;
    remaining: number;
    itemsCount: number;
  }>;
};

type WorkbenchItem = {
  id: number;
  quantity?: number;
  qty?: number;
  damagedQty?: number;
  giftQty?: number;
  price?: number;
  paidAt?: string | null;
  groupId?: number | null;
  product?: string;
};

type WorkbenchOrder = {
  id: number;
  customerId: number;
  date?: string;
  items: WorkbenchItem[];
};

type WorkbenchGroup = {
  id: number;
  customerId: number;
  concept?: string | null;
  status: string;
};

type WorkbenchPayment = {
  groupId: number;
  amount: number;
  status: string;
};

/**
 * Calcula dinero por cobrar (grupos open + ítems sin grupo no pagados).
 */
export function buildPendingCollectionsBreakdown({
  customers = [],
  orders = [],
  groups = [],
  payments = [],
}: {
  customers?: Array<{ id: number; name: string }>;
  orders?: WorkbenchOrder[];
  groups?: WorkbenchGroup[];
  payments?: WorkbenchPayment[];
}): PendingCollectionsBreakdown {
  const groupIdByItemId = new Map<number, number>();
  for (const o of orders) {
    for (const it of o.items || []) {
      const gid = it.groupId != null ? Number(it.groupId) : NaN;
      if (Number.isFinite(gid)) groupIdByItemId.set(it.id, gid);
    }
  }

  const itemsByGroupId = new Map<number, number[]>();
  for (const [itemId, groupId] of groupIdByItemId.entries()) {
    if (!itemsByGroupId.has(groupId)) itemsByGroupId.set(groupId, []);
    itemsByGroupId.get(groupId)!.push(itemId);
  }

  const paidByGroupId = new Map<number, number>();
  for (const p of payments) {
    if (p.status !== "completed") continue;
    const pg = Number(p.groupId);
    if (!Number.isFinite(pg)) continue;
    paidByGroupId.set(
      pg,
      Number(((paidByGroupId.get(pg) || 0) + toNum(p.amount)).toFixed(2)),
    );
  }

  const customerNameById = new Map(
    customers.map((c) => [c.id, c.name || `Cliente #${c.id}`]),
  );

  const findItem = (itemId: number) => {
    for (const o of orders) {
      for (const it of o.items || []) {
        if (it.id === itemId) {
          return { ...it, orderId: o.id, customerId: o.customerId };
        }
      }
    }
    return null;
  };

  const byCustomer = new Map<number, PendingCustomerRow>();
  const ensureCustomer = (customerId: number) => {
    if (!byCustomer.has(customerId)) {
      byCustomer.set(customerId, {
        customerId,
        customerName:
          customerNameById.get(customerId) || `Cliente #${customerId}`,
        ungrouped: 0,
        groups: 0,
        total: 0,
      });
    }
    return byCustomer.get(customerId)!;
  };

  const openGroups: PendingCollectionsBreakdown["openGroups"] = [];
  let groupsTotal = 0;

  for (const g of groups) {
    if (g.status !== "open" && g.status !== "partial") continue;
    const itemIds = itemsByGroupId.get(Number(g.id)) || [];
    let groupTotalCalc = 0;
    for (const itemId of itemIds) {
      const it = findItem(itemId);
      if (!it) continue;
      groupTotalCalc = Number((groupTotalCalc + lineTotal(it)).toFixed(2));
    }
    const paid = paidByGroupId.get(Number(g.id)) || 0;
    const remaining = Number(Math.max(0, groupTotalCalc - paid).toFixed(2));
    if (remaining <= 0) continue;

    groupsTotal = Number((groupsTotal + remaining).toFixed(2));
    const row = ensureCustomer(g.customerId);
    row.groups = Number((row.groups + remaining).toFixed(2));
    row.total = Number((row.total + remaining).toFixed(2));

    openGroups.push({
      groupId: g.id,
      concept: g.concept || `Grupo #${g.id}`,
      customerId: g.customerId,
      customerName:
        customerNameById.get(g.customerId) || `Cliente #${g.customerId}`,
      total: groupTotalCalc,
      paid,
      remaining,
      itemsCount: itemIds.length,
    });
  }

  let ungroupedTotal = 0;
  for (const o of orders) {
    for (const it of o.items || []) {
      if (it.paidAt) continue;
      if (it.groupId != null) continue;
      const line = lineTotal(it);
      if (line <= 0) continue;
      ungroupedTotal = Number((ungroupedTotal + line).toFixed(2));
      const row = ensureCustomer(o.customerId);
      row.ungrouped = Number((row.ungrouped + line).toFixed(2));
      row.total = Number((row.total + line).toFixed(2));
    }
  }

  const byCustomerList = [...byCustomer.values()]
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  return {
    futureIncome: Number((groupsTotal + ungroupedTotal).toFixed(2)),
    groupsTotal,
    ungroupedTotal,
    byCustomer: byCustomerList,
    openGroups,
  };
}
