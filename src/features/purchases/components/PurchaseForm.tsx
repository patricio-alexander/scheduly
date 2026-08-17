"use client";

import { useMemo, useState } from "react";
import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
  SearchField,
  toast,
} from "@heroui/react";
import Plus from "@gravity-ui/icons/Plus";
import TrashBin from "@gravity-ui/icons/TrashBin";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { useProducts } from "@/src/features/products";
import { formatMoney, lineTotal } from "@/shared/utils/money";
import {
  paymentMethodLabel,
  paymentMethodOptions,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";
import { createPurchase } from "../services/purchase-service";
import type { PurchaseLineDraft, Supplier } from "../types";
import { BranchSelector, useBranches } from "@/src/features/branches";
import { useAuth } from "@/src/features/auth";
import { isOwnerRole } from "@/shared/utils/roles";

interface Props {
  suppliers: Supplier[];
  onSuccess?: () => void;
}

type LineRow = PurchaseLineDraft & { key: string };

function emptyLine(): LineRow {
  return { key: crypto.randomUUID(), productId: 0, quantity: 1, unitCost: 0 };
}

export function PurchaseForm({ suppliers, onSuccess }: Props) {
  const { user } = useAuth();
  const { products, loading: productsLoading } = useProducts();
  const { branches } = useBranches();
  const owner = user ? isOwnerRole(user.role) : false;
  const lockedBranch = user?.branch ?? null;
  const [supplierId, setSupplierId] = useState<string>("none");
  const [branchId, setBranchId] = useState<number | "all">("all");
  const [method, setMethod] = useState<PaymentMethodValue>("cash");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineRow[]>([emptyLine()]);
  const [productSearch, setProductSearch] = useState("");
  const [pending, setPending] = useState(false);

  const effectiveBranchId = owner
    ? branchId === "all"
      ? null
      : branchId
    : (lockedBranch?.id ?? null);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const selectedIds = new Set(
      lines.map((l) => l.productId).filter((id) => id > 0),
    );
    return products.filter((p) => {
      const matches =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category?.name ?? "").toLowerCase().includes(q);
      return matches || selectedIds.has(p.id);
    });
  }, [products, productSearch, lines]);

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          line.productId > 0
            ? sum + lineTotal(line.unitCost, line.quantity)
            : sum,
        0,
      ),
    [lines],
  );

  const updateLine = (key: string, patch: Partial<LineRow>) => {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (key: string) => {
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((l) => l.key !== key),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.productId > 0 && l.quantity > 0);
    if (validLines.length === 0) {
      toast.danger("Agrega al menos un producto");
      return;
    }
    if (!owner && !effectiveBranchId) {
      toast.danger("No tienes una sucursal asignada");
      return;
    }

    setPending(true);
    try {
      await createPurchase({
        supplierId: supplierId === "none" ? null : Number(supplierId),
        branchId: effectiveBranchId,
        method,
        notes,
        lines: validLines.map(({ productId, quantity, unitCost }) => ({
          productId,
          quantity,
          unitCost,
        })),
      });
      toast.success("Compra registrada · stock actualizado");
      setSupplierId("none");
      setBranchId("all");
      setMethod("cash");
      setNotes("");
      setLines([emptyLine()]);
      onSuccess?.();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ComboBox
          selectedKey={supplierId}
          onSelectionChange={(key) => setSupplierId(String(key ?? "none"))}
          variant="secondary"
        >
          <Label className="text-sm font-medium">Proveedor (opcional)</Label>
          <ComboBox.InputGroup>
            <Input placeholder="Seleccionar proveedor..." />
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox>
              <ListBox.Item id="none" textValue="Sin proveedor">
                Sin proveedor
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {suppliers.map((supplier) => (
                <ListBox.Item
                  key={supplier.id}
                  id={String(supplier.id)}
                  textValue={supplier.name}
                >
                  {supplier.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </ComboBox.Popover>
        </ComboBox>

        <div>
          <Label className="text-sm font-medium">Sucursal destino</Label>
          {owner ? (
            <div className="mt-1">
              <BranchSelector
                branches={branches}
                value={branchId}
                onChange={setBranchId}
                className="w-full"
              />
            </div>
          ) : (
            <p className="mt-2 rounded-xl border border-separator bg-surface-secondary/40 px-3 py-2.5 text-sm">
              {lockedBranch ? lockedBranch.name : "Sin sucursal asignada"}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            El stock se incrementa en la sucursal seleccionada.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ComboBox
          selectedKey={method}
          onSelectionChange={(key) =>
            setMethod((key as PaymentMethodValue) ?? "cash")
          }
          variant="secondary"
        >
          <Label className="text-sm font-medium">Método de pago</Label>
          <ComboBox.InputGroup>
            <Input />
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox>
              {paymentMethodOptions.map((option) => (
                <ListBox.Item
                  key={option}
                  id={option}
                  textValue={paymentMethodLabel[option]}
                >
                  {paymentMethodLabel[option]}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </ComboBox.Popover>
        </ComboBox>
      </div>

      <div className="rounded-2xl border border-separator bg-surface-secondary/30 p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Productos</h3>
            <p className="text-xs text-muted">
              Al guardar se incrementa el stock de cada producto.
            </p>
          </div>
          <SearchField value={productSearch} onChange={setProductSearch}>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                className="w-full sm:w-56"
                placeholder="Buscar producto..."
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>

        <div className="flex flex-col gap-3">
          {lines.map((line) => {
            const product = products.find((p) => p.id === line.productId);
            return (
              <div
                key={line.key}
                className="flex flex-col gap-3 rounded-xl border border-separator bg-surface p-3 sm:grid sm:grid-cols-2 sm:items-end lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <ComboBox
                  className="min-w-0 sm:col-span-2 lg:col-span-1"
                  selectedKey={line.productId > 0 ? String(line.productId) : ""}
                  onSelectionChange={(key) => {
                    const id = Number(key);
                    const selected = products.find((p) => p.id === id);
                    updateLine(line.key, {
                      productId: id,
                      unitCost: selected ? selected.price : line.unitCost,
                    });
                  }}
                  variant="secondary"
                  isDisabled={productsLoading}
                >
                  <Label className="text-xs font-medium">Producto</Label>
                  <ComboBox.InputGroup>
                    <Input placeholder="Seleccionar..." />
                    <ComboBox.Trigger />
                  </ComboBox.InputGroup>
                  <ComboBox.Popover>
                    <ListBox>
                      {filteredProducts.map((p) => (
                        <ListBox.Item
                          key={p.id}
                          id={String(p.id)}
                          textValue={p.name}
                        >
                          <span className="flex w-full items-center justify-between gap-2">
                            <span className="truncate">{p.name}</span>
                            <span className="shrink-0 text-xs text-muted">
                              Stock {p.stock}
                            </span>
                          </span>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </ComboBox.Popover>
                </ComboBox>

                <div className="min-w-0">
                  <AppNumberField
                    id={`qty-${line.key}`}
                    label="Cantidad"
                    minValue={1}
                    value={line.quantity}
                    onChange={(quantity) =>
                      updateLine(line.key, {
                        quantity: Math.max(1, quantity),
                      })
                    }
                    className="mt-1 w-full"
                  />
                </div>

                <div className="min-w-0">
                  <AppNumberField
                    id={`cost-${line.key}`}
                    label="Costo unit."
                    minValue={0}
                    step={0.01}
                    value={line.unitCost}
                    onChange={(unitCost) =>
                      updateLine(line.key, {
                        unitCost: Math.max(0, unitCost),
                      })
                    }
                    className="mt-1 w-full"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end lg:pb-0.5">
                  <p className="text-sm font-semibold tabular-nums">
                    {product
                      ? formatMoney(lineTotal(line.unitCost, line.quantity))
                      : "—"}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    isDisabled={lines.length <= 1}
                    onPress={() => removeLine(line.key)}
                    aria-label="Quitar línea"
                  >
                    <TrashBin width={14} height={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-3"
          onPress={addLine}
        >
          <Plus width={14} height={14} />
          Agregar producto
        </Button>
      </div>

      <div>
        <Label htmlFor="purchase-notes" className="text-sm font-medium">
          Notas
        </Label>
        <textarea
          id="purchase-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Factura, referencia, observaciones..."
          className="mt-1 w-full rounded-xl border border-separator bg-field-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-separator pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg font-bold tabular-nums">
          Total: {formatMoney(total)}
        </p>
        <Button
          type="submit"
          variant="primary"
          isDisabled={pending || total <= 0}
        >
          {pending ? "Guardando..." : "Registrar compra"}
        </Button>
      </div>
    </form>
  );
}
