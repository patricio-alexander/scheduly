"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Label,
  Modal,
  SearchField,
  useOverlayState,
} from "@heroui/react";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";
import { formatMoney } from "@/shared/utils/money";
import type { Product } from "@/src/features/products";

const QUICK_QTY = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

type Props = {
  state: ReturnType<typeof useOverlayState>;
  products: Product[];
  onAdd: (product: Product, qty: number) => void;
};

function productSearchText(p: Product) {
  return [p.name, p.barcode, p.sku, String(p.id)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function PosQuickAccessModal({
  state,
  products,
  onAdd,
}: Props) {
  const [selectedQty, setSelectedQty] = useState(1);
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...products]
      .filter((p) => {
        if (p.type && p.type !== "final") return false;
        return Number(p.stock ?? 0) > 0;
      })
      .sort(
        (a, b) =>
          Number(b.stock ?? 0) - Number(a.stock ?? 0) ||
          a.name.localeCompare(b.name, "es"),
      );
    if (!q) return list;
    return list.filter((p) => productSearchText(p).includes(q));
  }, [products, search]);

  const preview = useMemo(
    () => items.find((p) => p.id === hoveredId) ?? null,
    [items, hoveredId],
  );

  useEffect(() => {
    if (!state.isOpen) {
      setSearch("");
      setSelectedQty(1);
      setHoveredId(null);
      return;
    }

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (QUICK_QTY.map(String).includes(e.key)) {
        e.preventDefault();
        setSelectedQty(Number(e.key));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedQty((q) => Math.min(9, q + 1));
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedQty((q) => Math.max(1, q - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.isOpen]);

  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable>
        <Modal.Container placement="center" size="cover" scroll="inside">
          <Modal.Dialog className="flex max-h-[88vh] w-[min(1180px,94vw)] flex-col overflow-hidden !max-w-none">
            <Modal.CloseTrigger />
            <Modal.Header className="shrink-0 border-b border-separator">
              <div>
                <Modal.Heading>Accesos rápidos</Modal.Heading>
                <p className="text-[11px] text-muted">
                  Teclado 1-9 o ↑ ↓ · clic en producto agrega
                </p>
              </div>
            </Modal.Header>

            <div className="shrink-0 border-b border-separator bg-surface px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="shrink-0">
                  <p className="mb-1 text-[11px] text-muted">Cantidad</p>
                  <div className="grid w-[108px] grid-cols-3 gap-1">
                    {QUICK_QTY.map((qty) => {
                      const selected = selectedQty === qty;
                      return (
                        <button
                          key={qty}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setSelectedQty(qty)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-extrabold transition-colors ${
                            selected
                              ? "bg-success text-[var(--success-foreground)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--success)_40%,transparent)]"
                              : "border border-separator bg-transparent text-foreground hover:border-accent"
                          }`}
                        >
                          {qty}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 ${
                    preview
                      ? "border-accent/50 bg-accent/10"
                      : "border-separator bg-surface-secondary/30"
                  }`}
                >
                  <ShoppingCart
                    width={16}
                    height={16}
                    className="shrink-0 text-accent"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold">
                      {preview
                        ? `${preview.name} · +${selectedQty} u.`
                        : `Clic suma ${selectedQty} u. al carrito`}
                    </p>
                    {preview ? (
                      <p className="truncate text-[11px] text-muted tabular-nums">
                        {formatMoney(preview.price)} c/u
                      </p>
                    ) : null}
                  </div>
                  {preview ? (
                    <span className="shrink-0 text-base font-black tabular-nums text-accent">
                      {formatMoney(preview.price * selectedQty)}
                    </span>
                  ) : null}
                </div>
              </div>

              <SearchField
                aria-label="Buscar producto rápido"
                value={search}
                onChange={setSearch}
                className="mt-3 w-full min-w-0"
              >
                <Label className="sr-only">Buscar</Label>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Nombre, código o SKU" />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
            </div>

            <Modal.Body className="min-h-0 flex-1 overflow-auto bg-background p-3 sm:p-4">
              {items.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">
                  No hay productos con stock para accesos rápidos.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {items.map((p) => {
                    const line = Number(p.price || 0) * selectedQty;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onMouseEnter={() => setHoveredId(p.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => onAdd(p, selectedQty)}
                        className="flex h-full flex-col rounded-xl border border-separator bg-surface p-2.5 text-left transition-all hover:-translate-y-px hover:border-accent hover:shadow-md"
                      >
                        <p className="line-clamp-2 min-h-[2.4em] text-[12px] font-extrabold leading-tight">
                          {p.name}
                        </p>
                        <p className="mt-1 text-[15px] font-extrabold tabular-nums text-accent">
                          {formatMoney(p.price)}
                        </p>
                        <div className="mt-2 rounded-lg border border-success/35 bg-success/15 px-2 py-1">
                          <p className="text-[12px] font-bold text-[var(--success)]">
                            +{selectedQty} → {formatMoney(line)}
                          </p>
                        </div>
                        <p className="mt-1.5 text-[10px] text-muted">
                          Stock: {Number(p.stock ?? 0)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </Modal.Body>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-separator px-4 py-2.5">
              <Button size="sm" variant="secondary" onPress={() => state.close()}>
                Cerrar
              </Button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
