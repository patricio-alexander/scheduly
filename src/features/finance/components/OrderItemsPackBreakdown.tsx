"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/shared/utils/money";
import { getBillableQty, lineTotal } from "@/shared/utils/collections-pending";
import {
  buildDisplayBoardOrder,
  hydratePacksForDisplay,
  type PackBreakdownItem,
} from "@/shared/utils/order-pack-breakdown";

type Props = {
  items: PackBreakdownItem[];
  variant?: "customer" | "supplier";
  canSelect?: boolean;
  selectedItemIds?: number[];
  onToggleItem?: (id: number) => void;
};

function supplierLineTotal(it: PackBreakdownItem) {
  if (it.lineTotal != null) return Number(it.lineTotal);
  const qty = Number(it.quantity ?? 0);
  const price = Number(it.unitPrice ?? it.price ?? 0);
  const tax = Number(it.taxRate ?? 0);
  return Number((qty * price * (1 + tax / 100)).toFixed(2));
}

function customerLineTotal(it: PackBreakdownItem) {
  return lineTotal(it);
}

function ItemRow({
  it,
  variant,
  canSelect,
  selectedItemIds,
  onToggleItem,
}: {
  it: PackBreakdownItem;
  variant: "customer" | "supplier";
  canSelect: boolean;
  selectedItemIds: number[];
  onToggleItem?: (id: number) => void;
}) {
  const qty = Number(it.quantity ?? it.qty ?? 0);
  const price = Number(
    variant === "customer" ? (it.price ?? it.unitPrice) : (it.unitPrice ?? it.price),
  );
  const total =
    variant === "customer" ? customerLineTotal(it) : supplierLineTotal(it);
  const inFinancePack = Boolean(it.packId);
  const checked = selectedItemIds.includes(it.id);
  const name = it.product ?? it.name ?? "(sin nombre)";

  return (
    <tr className="border-b border-separator/30">
      {canSelect ? (
        <td className="w-8 px-1 py-1">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[var(--accent)]"
            checked={checked}
            disabled={inFinancePack}
            onChange={() => onToggleItem?.(it.id)}
          />
        </td>
      ) : null}
      <td className="px-2 py-1">
        <div>{name}</div>
        {inFinancePack ? (
          <span className="mt-0.5 inline-block rounded border border-warning/40 px-1 py-0 text-[10px] text-[var(--warning)]">
            Paca finanzas #{it.packId}
          </span>
        ) : null}
      </td>
      <td className="px-2 py-1 text-right tabular-nums">{qty}</td>
      <td className="px-2 py-1 text-right tabular-nums">{formatMoney(price)}</td>
      <td className="px-2 py-1 text-right tabular-nums font-semibold">
        {formatMoney(total)}
      </td>
    </tr>
  );
}

export function OrderItemsPackBreakdown({
  items,
  variant = "customer",
  canSelect = false,
  selectedItemIds = [],
  onToggleItem,
}: Props) {
  const normalized = useMemo(
    () =>
      (items || []).map((it) => ({
        ...it,
        quantity: Number(it.quantity ?? it.qty ?? 0),
        price: Number(it.price ?? it.unitPrice ?? 0),
        unitPrice: Number(it.unitPrice ?? it.price ?? 0),
      })),
    [items],
  );

  const { hydratedItems, packs } = useMemo(
    () =>
      hydratePacksForDisplay(
        normalized,
        variant === "customer" ? "price" : "unitPrice",
      ),
    [normalized, variant],
  );

  const boardOrder = useMemo(
    () => buildDisplayBoardOrder(hydratedItems, packs),
    [hydratedItems, packs],
  );

  const itemsByLineId = useMemo(
    () => new Map(hydratedItems.map((it) => [it.lineId, it])),
    [hydratedItems],
  );

  const rawById = useMemo(
    () => new Map(normalized.map((it) => [it.id, it])),
    [normalized],
  );

  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(() => new Set());

  const togglePack = (key: string) => {
    setExpandedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isPackExpanded = (key: string) =>
    expandedPacks.size === 0 ? true : expandedPacks.has(key);

  if (!normalized.length) {
    return (
      <p className="py-1 text-[11px] text-muted">Sin productos en este pedido.</p>
    );
  }

  const colSpan = canSelect ? 5 : 4;

  return (
    <div className="rounded-lg border border-separator bg-surface-secondary/40 p-2">
      <table className="w-full min-w-[420px] text-left text-[11px]">
        <thead>
          <tr className="text-muted">
            {canSelect ? <th className="w-8" /> : null}
            <th className="px-2 py-1 font-bold">Producto</th>
            <th className="px-2 py-1 text-right font-bold">Cant.</th>
            <th className="px-2 py-1 text-right font-bold">P/U</th>
            <th className="px-2 py-1 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {boardOrder.map((entry) => {
            if (entry.type === "item") {
              const it = itemsByLineId.get(entry.key);
              if (!it) return null;
              const raw = rawById.get(it.id);
              if (!raw) return null;
              return (
                <ItemRow
                  key={entry.key}
                  it={raw}
                  variant={variant}
                  canSelect={canSelect}
                  selectedItemIds={selectedItemIds}
                  onToggleItem={onToggleItem}
                />
              );
            }

            const pack = packs.find((p) => p.key === entry.key);
            if (!pack) return null;
            const packItems = hydratedItems.filter((it) => it.packKey === pack.key);
            const packTotal = packItems.reduce((acc, it) => {
              const raw = rawById.get(it.id);
              if (!raw) return acc;
              return (
                acc +
                (variant === "customer"
                  ? customerLineTotal(raw)
                  : supplierLineTotal(raw))
              );
            }, 0);
            const expanded = isPackExpanded(pack.key);

            return (
              <tr key={pack.key} className="border-b border-separator/30">
                <td colSpan={colSpan} className="px-1 py-1">
                  <div className="flex flex-wrap items-center gap-1 rounded-md bg-accent/10 px-2 py-1">
                    <button
                      type="button"
                      className="text-muted hover:text-foreground"
                      onClick={() => togglePack(pack.key)}
                      aria-label={expanded ? "Colapsar paca" : "Expandir paca"}
                    >
                      <span
                        className="inline-block transition-transform"
                        style={{
                          transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
                        }}
                      >
                        ▾
                      </span>
                    </button>
                    <span className="font-bold text-accent">📦 {pack.name || "Paca"}</span>
                    <span className="rounded border border-separator px-1 py-0 text-[10px]">
                      {packItems.length} prod.
                    </span>
                    <span className="tabular-nums text-muted">
                      {formatMoney(packTotal)}
                    </span>
                    {pack.expiresAt ? (
                      <span className="text-[10px] text-muted">
                        · vence {pack.expiresAt}
                      </span>
                    ) : null}
                  </div>
                  {expanded ? (
                    <table className="mt-1 w-full">
                      <tbody>
                        {packItems.map((it) => {
                          const raw = rawById.get(it.id);
                          if (!raw) return null;
                          return (
                            <ItemRow
                              key={it.lineId}
                              it={raw}
                              variant={variant}
                              canSelect={canSelect}
                              selectedItemIds={selectedItemIds}
                              onToggleItem={onToggleItem}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
