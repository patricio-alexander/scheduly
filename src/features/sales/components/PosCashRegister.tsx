"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
  toast,
  useOverlayState,
} from "@heroui/react";
import CircleCheck from "@gravity-ui/icons/CircleCheck";
import CircleXmark from "@gravity-ui/icons/CircleXmark";
import CircleDollar from "@gravity-ui/icons/CircleDollar";
import ArrowUpRightFromSquare from "@gravity-ui/icons/ArrowUpRightFromSquare";
import LayoutCellsLarge from "@gravity-ui/icons/LayoutCellsLarge";
import TrashBin from "@gravity-ui/icons/TrashBin";
import { useAuth } from "@/src/features/auth";
import { useCustomers } from "@/src/features/customers";
import { useProducts } from "@/src/features/products";
import type { Product } from "@/src/features/products";
import { useBranches } from "@/src/features/branches";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { formatMoney, lineTotal } from "@/shared/utils/money";
import { type PaymentMethodValue } from "@/shared/utils/payment-methods";
import { isManagementRole, isOwnerRole } from "@/shared/utils/roles";
import { createDirectProductSale } from "../services/product-sale-service";
import { PosQuickAccessModal } from "./PosQuickAccessModal";

/** Input numérico compacto (sin botones ± grandes de NumberField). */
function CompactNumberInput({
  value,
  onChange,
  min = 0,
  step = 1,
  className = "",
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Input
      type="number"
      aria-label={ariaLabel}
      className={`tabular-nums ${className}`}
      value={Number.isFinite(value) ? String(value) : ""}
      min={min}
      step={step}
      onChange={(e) => {
        const n = Number(e.target.value);
        onChange(Number.isFinite(n) ? n : 0);
      }}
    />
  );
}
type CartRow = {
  key: string;
  productId: number;
  name: string;
  code: string;
  quantity: number;
  price: number;
  stock: number;
  taxRate: number;
};

type CashStatus = {
  openShifts: Array<{
    id: number;
    openingCashTotal: number;
    storeId: number | null;
    branch: { id: number; name: string } | null;
    cashRegister: { id: number; name: string } | null;
    cashier: string;
  }>;
  registers: Array<{ id: number; name: string; storeId: number }>;
};

type DocumentType = "documento" | "factura" | "nota_venta";
type SaleType = "contado" | "credito";

function to2(n: number) {
  return Math.round(n * 100) / 100;
}

function lineBreakdown(row: CartRow) {
  const total = to2(lineTotal(row.price, row.quantity));
  const rate = Math.max(0, Number(row.taxRate) || 0) / 100;
  if (rate <= 0) return { total, base: total, iva: 0 };
  const base = to2(total / (1 + rate));
  return { total, base, iva: to2(total - base) };
}

function productCode(p: Product) {
  return String(p.barcode || p.sku || p.id);
}

/** Casilla visible estilo EdDeli (el Switch de HeroUI no muestra el control con hijos). */
function PosCheckbox({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={`inline-flex max-w-full items-center gap-2 text-[12px] ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        className="h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="leading-tight">{children}</span>
    </label>
  );
}

export function PosCashRegister() {
  const { user } = useAuth();
  const { products, loading: productsLoading, refetch: refetchProducts } =
    useProducts();
  const { customers, loading: customersLoading } = useCustomers();
  const { branches } = useBranches();
  const quickModal = useOverlayState();

  const canSell = user ? isManagementRole(user.role) : false;
  const owner = user ? isOwnerRole(user.role) : false;

  const [cash, setCash] = useState<CashStatus | null>(null);
  const [cashLoading, setCashLoading] = useState(true);
  const [cart, setCart] = useState<CartRow[]>([]);
  const [productInput, setProductInput] = useState("");
  const [productPickerKey, setProductPickerKey] = useState(0);
  const [showStock, setShowStock] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>("documento");
  const [saleType, setSaleType] = useState<SaleType>("contado");
  const [useCustomerData, setUseCustomerData] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethodValue>("cash");
  const [notes, setNotes] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [pending, setPending] = useState(false);
  const [showShiftBanner, setShowShiftBanner] = useState(false);

  const openShift = cash?.openShifts[0] ?? null;

  const branchId = useMemo(() => {
    if (openShift?.storeId) return openShift.storeId;
    if (!owner && user?.branch?.id) return user.branch.id;
    const main = branches.find((b) => b.isMain && b.isActive);
    return main?.id ?? branches.find((b) => b.isActive)?.id ?? null;
  }, [openShift, owner, user, branches]);

  const loadCash = useCallback(async () => {
    setCashLoading(true);
    try {
      const res = await fetch(apiUrl("/api/cash"));
      if (!res.ok) throw new Error("cash");
      setCash((await res.json()) as CashStatus);
    } catch {
      setCash(null);
    } finally {
      setCashLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCash();
  }, [loadCash]);

  // Banner de turno: se muestra un momento y se oculta (el check del header queda)
  useEffect(() => {
    if (cashLoading) return;
    if (!openShift) {
      setShowShiftBanner(true);
      return;
    }
    setShowShiftBanner(true);
    const t = window.setTimeout(() => setShowShiftBanner(false), 3500);
    return () => window.clearTimeout(t);
  }, [cashLoading, openShift?.id]);

  const productsSorted = useMemo(
    () =>
      [...products].sort(
        (a, b) =>
          Number(b.stock ?? 0) - Number(a.stock ?? 0) ||
          a.name.localeCompare(b.name),
      ),
    [products],
  );

  /** Productos ya en carrito: salen del ComboBox (se reincorporan al quitar la línea). */
  const cartProductIds = useMemo(
    () => new Set(cart.map((r) => r.productId)),
    [cart],
  );

  const selectableProducts = useMemo(
    () => productsSorted.filter((p) => !cartProductIds.has(p.id)),
    [productsSorted, cartProductIds],
  );

  const totals = useMemo(() => {
    let subtotal = 0;
    let iva = 0;
    let total = 0;
    for (const row of cart) {
      const b = lineBreakdown(row);
      subtotal += b.base;
      iva += b.iva;
      total += b.total;
    }
    return { subtotal: to2(subtotal), iva: to2(iva), total: to2(total) };
  }, [cart]);

  const change = useMemo(() => {
    if (saleType !== "contado" || method !== "cash") return 0;
    const received = Number(amountReceived);
    if (!Number.isFinite(received)) return 0;
    return to2(Math.max(0, received - totals.total));
  }, [amountReceived, method, saleType, totals.total]);

  useEffect(() => {
    if (saleType === "contado" && method === "cash" && totals.total > 0) {
      setAmountReceived(String(totals.total));
    }
  }, [totals.total, saleType, method]);

  const addProduct = useCallback((product: Product, qty = 1) => {
    const quantity = Math.max(0.01, Number(qty) || 1);
    const taxRate = Number(product.taxRate ?? 15);
    setCart((prev) => {
      const existing = prev.find((r) => r.productId === product.id);
      if (existing) {
        return prev.map((r) =>
          r.productId === product.id
            ? { ...r, quantity: to2(r.quantity + quantity) }
            : r,
        );
      }
      return [
        {
          key: crypto.randomUUID(),
          productId: product.id,
          name: product.name,
          code: productCode(product),
          quantity,
          price: Number(product.price) || 0,
          stock: Number(product.stock) || 0,
          taxRate: Number.isFinite(taxRate) ? taxRate : 15,
        },
        ...prev,
      ];
    });
  }, []);

  const handleProductPick = (id: string | number | null) => {
    if (id == null) return;
    const product = products.find((p) => String(p.id) === String(id));
    if (!product) return;
    addProduct(product, 1);
    setProductInput("");
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // Remonta el ComboBox para cerrar el popover y limpiar el filtro.
    setProductPickerKey((k) => k + 1);
  };

  const updateRow = (key: string, patch: Partial<CartRow>) => {
    setCart((prev) =>
      prev
        .map((row) => (row.key === key ? { ...row, ...patch } : row))
        .filter((row) => row.quantity > 0),
    );
  };

  const removeRow = (key: string) => {
    setCart((prev) => prev.filter((r) => r.key !== key));
  };

  const clearCart = () => setCart([]);

  const openOtherCaja = () => {
    window.open(`${window.location.origin}${appRoutes.operation.cash}`, "_blank");
  };

  const onCheckout = async () => {
    if (!canSell) {
      toast.danger("No tienes permiso para cobrar");
      return;
    }
    if (cart.length === 0) {
      toast.danger("Agrega productos al carrito");
      return;
    }
    if (!branchId) {
      toast.danger("No hay sucursal para la venta");
      return;
    }
    if ((useCustomerData || documentType === "factura") && !customerId) {
      toast.danger("Selecciona un cliente");
      return;
    }
    if (saleType === "contado" && method === "cash") {
      const received = Number(amountReceived);
      if (!Number.isFinite(received) || received + 0.001 < totals.total) {
        toast.danger("El monto recibido debe cubrir el total");
        return;
      }
    }

    setPending(true);
    try {
      await createDirectProductSale({
        branchId,
        customerId:
          useCustomerData || documentType === "factura"
            ? Number(customerId)
            : null,
        method: saleType === "credito" ? "cash" : method,
        saleType,
        documentType,
        notes: notes.trim() || undefined,
        lines: cart.map((row) => ({
          productId: row.productId,
          quantity: row.quantity,
          unitPrice: row.price,
        })),
      });
      toast.success(
        saleType === "credito"
          ? "Pedido a crédito registrado"
          : "Venta cobrada",
      );
      clearCart();
      setAmountReceived("");
      setNotes("");
      void loadCash();
      void refetchProducts();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al cobrar");
    } finally {
      setPending(false);
    }
  };

  if (!user) return null;

  const needCustomer = useCustomerData || documentType === "factura";
  const colCount = showStock ? 8 : 7;

  return (
    <div className="mx-auto w-full max-w-[1400px] pb-2 text-[12px] leading-snug [&_label]:text-[11px] [&_input]:text-[12px] [&_button]:text-[12px]">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <h1 className="text-sm font-bold tracking-tight sm:text-base">
            Punto de Venta
          </h1>
          {cashLoading ? null : openShift ? (
            <span
              title={`Turno abierto · ${openShift.branch?.name ?? ""} · capital ${formatMoney(openShift.openingCashTotal)} · ${openShift.cashier}`}
              className="text-success"
            >
              <CircleCheck width={16} height={16} />
            </span>
          ) : (
            <span title="No hay turno abierto" className="text-danger">
              <CircleXmark width={16} height={16} />
            </span>
          )}
          <a
            href={appRoutes.electronicDocs.sriSettings}
            className="inline-flex items-center rounded-full border border-warning/50 bg-warning/10 px-2 py-px text-[10px] font-semibold text-warning"
          >
            SRI no listo
          </a>
        </div>
        <Button size="sm" variant="secondary" onPress={openOtherCaja}>
          <ArrowUpRightFromSquare width={13} height={13} />
          Abrir otra caja
        </Button>
      </div>

      {showShiftBanner && !cashLoading && openShift ? (
        <div className="mb-1 rounded-lg border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] transition-opacity">
          Turno abierto
          {openShift.branch?.name ? ` · ${openShift.branch.name}` : ""}
          {openShift.cashRegister?.name
            ? ` · ${openShift.cashRegister.name}`
            : ""}
          {` · capital inicial ${formatMoney(openShift.openingCashTotal)}`}
          {` · ${openShift.cashier}`}
        </div>
      ) : null}
      {showShiftBanner && !cashLoading && !openShift ? (
        <div className="mb-1 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px]">
          Abre un turno en el local para vender en caja. Podés vender igual; se
          asociará al turno cuando exista uno.
        </div>
      ) : null}

      {/* 8 / 4 fijos — sin estrechar el panel de cobro */}
      <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-12">
        <section className="min-w-0 overflow-hidden rounded-xl border border-separator bg-surface p-2 lg:col-span-8">
          <p className="mb-1 text-[12px] font-bold">
            Total Venta: {formatMoney(totals.total)}
          </p>

          <div className="mb-1.5 flex flex-col gap-1.5 md:flex-row md:items-end">
            <div className="min-w-0 flex-1">
              <ComboBox
                key={productPickerKey}
                aria-label="Producto"
                selectedKey={null}
                inputValue={productInput}
                onInputChange={setProductInput}
                onSelectionChange={(key) => handleProductPick(key)}
                isDisabled={productsLoading}
                variant="secondary"
              >
                <Label>Producto</Label>
                <ComboBox.InputGroup>
                  <Input placeholder="Buscar, clic o Enter para agregar al carrito" />
                  <ComboBox.Trigger />
                </ComboBox.InputGroup>
                <ComboBox.Popover>
                  <ListBox>
                    {selectableProducts.slice(0, 120).map((p) => (
                      <ListBox.Item
                        key={p.id}
                        id={String(p.id)}
                        textValue={`${p.name} ${productCode(p)} ${p.sku ?? ""} ${p.barcode ?? ""}`}
                      >
                        <span className="flex w-full items-center justify-between gap-2">
                          <span className="truncate">{p.name}</span>
                          <span className="shrink-0 text-[11px] text-muted tabular-nums">
                            {formatMoney(p.price)}
                            {showStock ? ` · stk ${p.stock}` : ""}
                          </span>
                        </span>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </ComboBox.Popover>
              </ComboBox>
            </div>
            <Button size="sm" variant="secondary" onPress={() => quickModal.open()}>
              <LayoutCellsLarge width={14} height={14} />
              Accesos rápidos
            </Button>
          </div>

          <div className="mb-1.5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted">
              <span>Registros en venta: {cart.length}</span>
              <PosCheckbox checked={showStock} onChange={setShowStock}>
                Mostrar stock
              </PosCheckbox>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="primary"
                isDisabled={pending || cart.length === 0 || !canSell}
                onPress={() => void onCheckout()}
              >
                <CircleDollar width={13} height={13} />
                Realizar venta
              </Button>
              <Button
                size="sm"
                variant="danger"
                isDisabled={cart.length === 0}
                onPress={clearCart}
              >
                Vaciar listado
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-separator">
            <table className="w-full min-w-[640px] text-left text-[12px]">
              <thead className="border-b border-separator bg-surface-secondary/60 text-[11px] text-muted">
                <tr>
                  <th className="px-2.5 py-1.5 font-medium">Código</th>
                  <th className="px-2.5 py-1.5 font-medium">Producto</th>
                  {showStock ? (
                    <th className="px-2.5 py-1.5 text-center font-medium">Stock</th>
                  ) : null}
                  <th className="px-2.5 py-1.5 text-center font-medium">Cantidad</th>
                  <th className="px-2.5 py-1.5 text-right font-medium">Precio</th>
                  <th className="px-2.5 py-1.5 text-right font-medium">IVA</th>
                  <th className="px-2.5 py-1.5 text-right font-medium">Total</th>
                  <th className="px-2.5 py-1.5 text-center font-medium">Opciones</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colCount}
                      className="px-2.5 py-5 text-[12px] text-muted"
                    >
                      Aún no hay productos agregados.
                    </td>
                  </tr>
                ) : (
                  cart.map((row) => {
                    const b = lineBreakdown(row);
                    return (
                      <tr
                        key={row.key}
                        className="border-b border-separator/70 last:border-0"
                      >
                        <td className="px-2.5 py-1 text-[11px] text-muted">
                          {row.code || "—"}
                        </td>
                        <td className="px-2.5 py-1 font-medium">{row.name}</td>
                        {showStock ? (
                          <td className="px-2.5 py-1 text-center tabular-nums">
                            {row.stock}
                          </td>
                        ) : null}
                        <td className="px-2.5 py-1">
                          <CompactNumberInput
                            aria-label={`Cantidad ${row.name}`}
                            value={row.quantity}
                            min={0}
                            step={1}
                            onChange={(v) =>
                              updateRow(row.key, { quantity: v })
                            }
                            className="mx-auto w-[4.5rem]"
                          />
                        </td>
                        <td className="px-2.5 py-1">
                          <CompactNumberInput
                            aria-label={`Precio ${row.name}`}
                            value={row.price}
                            min={0}
                            step={0.01}
                            onChange={(v) => updateRow(row.key, { price: v })}
                            className="ml-auto w-[5.5rem]"
                          />
                        </td>
                        <td className="px-2.5 py-1 text-right tabular-nums">
                          {formatMoney(b.iva)}
                        </td>
                        <td className="px-2.5 py-1 text-right font-semibold tabular-nums">
                          {formatMoney(b.total)}
                        </td>
                        <td className="px-2.5 py-1 text-center">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="ghost"
                            aria-label="Quitar"
                            onPress={() => removeRow(row.key)}
                          >
                            <TrashBin width={13} height={13} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="min-w-0 overflow-hidden rounded-xl border border-separator bg-surface p-2 lg:col-span-4">
          <p className="mb-1 text-[12px] font-bold">
            Total Venta: {formatMoney(totals.total)}
          </p>

          <div className="flex min-w-0 flex-col gap-1.5">
            <ComboBox
              aria-label="Documento"
              selectedKey={documentType}
              onSelectionChange={(key) => {
                const next = String(key || "documento") as DocumentType;
                setDocumentType(next);
                if (next === "factura") setUseCustomerData(true);
              }}
            >
              <Label>Documento</Label>
              <ComboBox.InputGroup>
                <Input />
                <ComboBox.Trigger />
              </ComboBox.InputGroup>
              <ComboBox.Popover>
                <ListBox>
                  <ListBox.Item id="documento" textValue="Documento">
                    Documento
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="factura" textValue="Factura">
                    Factura
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="nota_venta" textValue="Nota de venta">
                    Nota de venta
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </ComboBox.Popover>
            </ComboBox>
            <p className="-mt-0.5 text-[10px] leading-tight text-muted">
              {documentType === "documento"
                ? "Por defecto: Consumidor Final y al contado (sin pedir datos de cliente)."
                : documentType === "factura"
                  ? "Factura POS local. Configura SRI para emitir al fisco."
                  : null}
            </p>

            <ComboBox
              aria-label="Condición de pago"
              selectedKey={saleType}
              onSelectionChange={(key) => {
                const next = String(key || "contado") as SaleType;
                setSaleType(next);
                if (next === "credito") setMethod("cash");
              }}
            >
              <Label>Condición de pago</Label>
              <ComboBox.InputGroup>
                <Input />
                <ComboBox.Trigger />
              </ComboBox.InputGroup>
              <ComboBox.Popover>
                <ListBox>
                  <ListBox.Item id="contado" textValue="Contado">
                    Contado
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="credito" textValue="Crédito">
                    Crédito
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </ComboBox.Popover>
            </ComboBox>
            {saleType === "credito" ? (
              <p className="text-[10px] text-muted">
                Queda pendiente de cobro; no suma al turno hasta cobrarla en
                Cobranzas.
              </p>
            ) : null}

            <PosCheckbox
              checked={needCustomer}
              disabled={documentType === "factura"}
              onChange={setUseCustomerData}
            >
              Registrar datos del cliente
            </PosCheckbox>
            <p className="-mt-0.5 text-[10px] leading-tight text-muted">
              {documentType === "factura"
                ? "En factura es obligatorio registrar cliente."
                : "Si no marcas la casilla, se usa Consumidor Final automáticamente."}
            </p>

            {needCustomer ? (
              <ComboBox
                aria-label="Cliente"
                selectedKey={customerId || null}
                onSelectionChange={(key) =>
                  setCustomerId(key ? String(key) : "")
                }
                isDisabled={customersLoading}
                variant="secondary"
              >
                <Label>Cliente</Label>
                <ComboBox.InputGroup>
                  <Input placeholder="Buscar cliente" />
                  <ComboBox.Trigger />
                </ComboBox.InputGroup>
                <ComboBox.Popover>
                  <ListBox>
                    {customers.map((c) => (
                      <ListBox.Item
                        key={c.id}
                        id={String(c.id)}
                        textValue={`${c.name} ${c.lastnames}`}
                      >
                        {c.name} {c.lastnames}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </ComboBox.Popover>
              </ComboBox>
            ) : null}

            <ComboBox
              aria-label="Método de pago"
              selectedKey={method}
              isDisabled={saleType === "credito"}
              onSelectionChange={(key) => {
                const next = String(key || "cash") as PaymentMethodValue;
                setMethod(next);
                if (next !== "cash") setAmountReceived("");
              }}
            >
              <Label>Método de pago</Label>
              <ComboBox.InputGroup>
                <Input />
                <ComboBox.Trigger />
              </ComboBox.InputGroup>
              <ComboBox.Popover>
                <ListBox>
                  {(
                    [
                      ["cash", "Efectivo"],
                      ["transfer", "Transferencia"],
                      ["card", "Tarjeta"],
                    ] as const
                  ).map(([id, label]) => (
                    <ListBox.Item key={id} id={id} textValue={label}>
                      {label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </ComboBox.Popover>
            </ComboBox>

            <div className="min-w-0">
              <Label className="mb-1">Notas (opcional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas de la venta"
              />
            </div>

            <Button
              variant="primary"
              className="w-full"
              isDisabled={pending || cart.length === 0 || !canSell}
              onPress={() => void onCheckout()}
            >
              <CircleDollar width={16} height={16} />
              {pending ? "Guardando..." : "Cobrar"}
            </Button>

            <div className="my-0.5 border-t border-separator" />

            {saleType === "contado" && method === "cash" ? (
              <>
                <div>
                  <Label className="mb-1">Monto recibido</Label>
                  <CompactNumberInput
                    aria-label="Monto recibido"
                    value={
                      amountReceived === "" ? 0 : Number(amountReceived) || 0
                    }
                    min={0}
                    step={0.01}
                    onChange={(v) => setAmountReceived(String(v))}
                    className="w-full"
                  />
                </div>
                <p className="text-[12px]">Vuelto: {formatMoney(change)}</p>
              </>
            ) : saleType === "contado" ? (
              <p className="text-[10px] text-muted">
                {method === "transfer"
                  ? "Pago por transferencia: no suma al arqueo de efectivo del turno."
                  : "Pago con tarjeta: no suma al arqueo de efectivo del turno."}
              </p>
            ) : null}

            <p className="text-[12px]">SUBTOTAL: {formatMoney(totals.subtotal)}</p>
            <p className="text-[12px]">IVA: {formatMoney(totals.iva)}</p>
            <p className="pb-0.5 text-[13px] font-bold">
              TOTAL: {formatMoney(totals.total)}
            </p>
          </div>
        </aside>
      </div>

      <PosQuickAccessModal
        state={quickModal}
        products={productsSorted}
        onAdd={(product, qty) => addProduct(product, qty)}
      />
    </div>
  );
}
