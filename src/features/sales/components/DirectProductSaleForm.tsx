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
import { useAuth } from "@/src/features/auth";
import { useCustomers } from "@/src/features/customers";
import { useProducts } from "@/src/features/products";
import { BranchSelect, useBranches } from "@/src/features/branches";
import { formatMoney, lineTotal } from "@/shared/utils/money";
import {
  paymentMethodLabel,
  paymentMethodOptions,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";
import { isOwnerRole } from "@/shared/utils/roles";
import { createDirectProductSale } from "../services/product-sale-service";

interface Props {
  onSuccess?: () => void;
}

type LineRow = {
  key: string;
  productId: number;
  quantity: number;
  unitPrice: number;
};

function emptyLine(): LineRow {
  return { key: crypto.randomUUID(), productId: 0, quantity: 1, unitPrice: 0 };
}

export function DirectProductSaleForm({ onSuccess }: Props) {
  const { user } = useAuth();
  const { products, loading: productsLoading } = useProducts();
  const { customers, loading: customersLoading } = useCustomers();
  const { branches } = useBranches();

  const owner = user ? isOwnerRole(user.role) : false;
  const lockedBranch = user?.branch ?? null;

  const defaultBranchId = useMemo(() => {
    if (!owner) return lockedBranch?.id ?? null;
    const main = branches.find((b) => b.isMain && b.isActive);
    return main?.id ?? branches.find((b) => b.isActive)?.id ?? null;
  }, [owner, lockedBranch, branches]);

  const [branchId, setBranchId] = useState<number | null>(defaultBranchId);
  const [customerId, setCustomerId] = useState<string>("none");
  const [method, setMethod] = useState<PaymentMethodValue>("cash");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineRow[]>([emptyLine()]);
  const [productSearch, setProductSearch] = useState("");
  const [pending, setPending] = useState(false);

  const effectiveBranchId = owner ? branchId : lockedBranch?.id ?? null;

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
          line.productId > 0 ? sum + lineTotal(line.unitPrice, line.quantity) : sum,
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
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.productId > 0 && l.quantity > 0);
    if (validLines.length === 0) {
      toast.danger("Agrega al menos un producto");
      return;
    }
    if (!effectiveBranchId) {
      toast.danger(owner ? "Selecciona la sucursal" : "No tienes sucursal asignada");
      return;
    }

    setPending(true);
    try {
      await createDirectProductSale({
        customerId: customerId === "none" ? null : Number(customerId),
        branchId: effectiveBranchId,
        method,
        notes,
        lines: validLines.map(({ productId, quantity, unitPrice }) => ({
          productId,
          quantity,
          unitPrice,
        })),
      });
      toast.success("Venta registrada · stock actualizado");
      setCustomerId("none");
      setMethod("cash");
      setNotes("");
      setLines([emptyLine()]);
      if (owner) setBranchId(defaultBranchId);
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
          selectedKey={customerId}
          onSelectionChange={(key) => setCustomerId(String(key ?? "none"))}
          variant="secondary"
          isDisabled={customersLoading}
        >
          <Label className="text-sm font-medium">Cliente (opcional)</Label>
          <ComboBox.InputGroup>
            <Input placeholder="Mostrador o cliente registrado..." />
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox>
              <ListBox.Item id="none" textValue="Mostrador">
                Mostrador (sin cliente)
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {customers.map((customer) => (
                <ListBox.Item
                  key={customer.id}
                  id={String(customer.id)}
                  textValue={`${customer.name} ${customer.lastnames}`}
                >
                  {customer.name} {customer.lastnames}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </ComboBox.Popover>
        </ComboBox>

        {owner ? (
          <BranchSelect
            label="Sucursal"
            branches={branches}
            value={branchId}
            onChange={setBranchId}
            className="w-full"
          />
        ) : (
          <div>
            <Label className="text-sm font-medium">Sucursal</Label>
            <p className="mt-2 rounded-xl border border-separator bg-surface-secondary/40 px-3 py-2.5 text-sm">
              {lockedBranch ? lockedBranch.name : "Sin sucursal asignada"}
            </p>
          </div>
        )}
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
              Al guardar se descuenta el stock de la sucursal.
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
                      unitPrice: selected ? selected.price : line.unitPrice,
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
                              {formatMoney(p.price)}
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
                    id={`price-${line.key}`}
                    label="Precio unit."
                    minValue={0}
                    step={0.01}
                    value={line.unitPrice}
                    onChange={(unitPrice) =>
                      updateLine(line.key, {
                        unitPrice: Math.max(0, unitPrice),
                      })
                    }
                    className="mt-1 w-full"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end lg:pb-0.5">
                  <p className="text-sm font-semibold tabular-nums">
                    {product
                      ? formatMoney(lineTotal(line.unitPrice, line.quantity))
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
        <Label htmlFor="sale-notes" className="text-sm font-medium">
          Notas
        </Label>
        <textarea
          id="sale-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Referencia, observaciones..."
          className="mt-1 w-full rounded-xl border border-separator bg-field-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-separator pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg font-bold tabular-nums">
          Total: {formatMoney(total)}
        </p>
        <Button type="submit" variant="primary" isDisabled={pending || total <= 0}>
          {pending ? "Guardando..." : "Registrar venta"}
        </Button>
      </div>
    </form>
  );
}
