"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
  Modal,
  toast,
  useOverlayState,
} from "@heroui/react";
import CircleCheck from "@gravity-ui/icons/CircleCheck";
import CircleXmark from "@gravity-ui/icons/CircleXmark";
import CircleDollar from "@gravity-ui/icons/CircleDollar";
import ArrowUpRightFromSquare from "@gravity-ui/icons/ArrowUpRightFromSquare";
import LayoutCellsLarge from "@gravity-ui/icons/LayoutCellsLarge";
import PersonPlus from "@gravity-ui/icons/PersonPlus";
import SquarePlus from "@gravity-ui/icons/SquarePlus";
import Pencil from "@gravity-ui/icons/Pencil";
import TrashBin from "@gravity-ui/icons/TrashBin";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";
import { useAuth } from "@/src/features/auth";
import {
  CustomerForm,
  useCustomers,
  type CustomerFormData,
} from "@/src/features/customers";
import * as customerService from "@/src/features/customers/services/customer-service";
import {
  ProductForm,
  useProducts,
  type Product,
  type ProductFormData,
} from "@/src/features/products";
import * as productService from "@/src/features/products/services/product-service";
import { useCategories } from "@/src/features/categories";
import { useUnits } from "@/src/features/units";
import { useBranches } from "@/src/features/branches";
import { useOperationFlags } from "@/src/features/settings/hooks/useOperationFlags";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { formatMoney, lineTotal } from "@/shared/utils/money";
import { type PaymentMethodValue } from "@/shared/utils/payment-methods";
import { isManagementRole, isOwnerRole } from "@/shared/utils/roles";
import { createDirectProductSale } from "../services/product-sale-service";
import {
  CreditPlanFields,
  buildCreditInstallmentsPayload,
  type CreditPlanMode,
  type InstallmentDraft,
} from "./CreditPlanFields";
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
/** Cantidad con −/+: para bajar a cero está el botón de quitar la línea. */
function QuantityStepper({
  value,
  onChange,
  label,
  over,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  over?: boolean;
}) {
  const step = (delta: number) =>
    onChange(Math.max(1, Math.round((value + delta) * 100) / 100));

  return (
    <span className={`pos-qty ${over ? "pos-qty--over" : ""}`}>
      <button
        type="button"
        className="pos-qty__btn"
        aria-label={`Quitar una unidad de ${label}`}
        onClick={() => step(-1)}
      >
        −
      </button>
      <input
        type="number"
        className="pos-qty__input"
        aria-label={`Cantidad de ${label}`}
        value={Number.isFinite(value) ? String(value) : ""}
        min={0}
        step={1}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
      <button
        type="button"
        className="pos-qty__btn"
        aria-label={`Agregar una unidad de ${label}`}
        onClick={() => step(1)}
      >
        +
      </button>
    </span>
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
  const {
    products,
    loading: productsLoading,
    refetch: refetchProducts,
  } = useProducts();
  const {
    customers,
    loading: customersLoading,
    refetch: refetchCustomers,
  } = useCustomers();
  const { categories } = useCategories();
  const { units } = useUnits();
  const { branches } = useBranches();
  const flags = useOperationFlags();
  const quickModal = useOverlayState();
  const customerModal = useOverlayState();
  const productModal = useOverlayState();

  const [sriReady, setSriReady] = useState(false);

  const canSell = user ? isManagementRole(user.role) : false;
  const owner = user ? isOwnerRole(user.role) : false;

  const [cash, setCash] = useState<CashStatus | null>(null);
  const [cashLoading, setCashLoading] = useState(true);
  const [cart, setCart] = useState<CartRow[]>([]);
  const [productInput, setProductInput] = useState("");
  const [productPickerKey, setProductPickerKey] = useState(0);
  const [showStock, setShowStock] = useState(true);
  const [documentType, setDocumentType] = useState<DocumentType>("documento");
  const [saleType, setSaleType] = useState<SaleType>("contado");
  const [creditMode, setCreditMode] = useState<CreditPlanMode>("open");
  const [installments, setInstallments] = useState<InstallmentDraft[]>([]);
  const [useCustomerData, setUseCustomerData] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethodValue>("cash");
  const [notes, setNotes] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [pending, setPending] = useState(false);
  const [showShiftBanner, setShowShiftBanner] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const allowCreateProduct = flags.cajaAllowCreateProductFromSelect;
  const allowEditProduct = flags.cajaAllowEditProductFromCart;
  const allowShowStockToggle = flags.cajaShowStockToggle;
  const allowAutocompleteStock = flags.cajaAllowAutocompleteStock;
  const stockVisible = allowShowStockToggle && showStock;

  useEffect(() => {
    if (!allowShowStockToggle) setShowStock(false);
  }, [allowShowStockToggle]);

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

  useEffect(() => {
    void fetch(apiUrl("/api/sri"), { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const sri = (await res.json()) as {
          readyForInvoicing?: boolean;
          hasCertificate?: boolean;
        };
        setSriReady(Boolean(sri.readyForInvoicing ?? sri.hasCertificate));
      })
      .catch(() => setSriReady(false));
  }, []);

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

  const openCreateProduct = () => {
    setEditingProduct(null);
    productModal.open();
  };

  const openEditProduct = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      toast.danger("No se encontró el producto en el catálogo.");
      return;
    }
    setEditingProduct(product);
    productModal.open();
  };

  const handleCreateCustomer = async (data: CustomerFormData) => {
    setSavingCustomer(true);
    try {
      const created = await customerService.createCustomer(data);
      toast.success("Cliente creado");
      customerModal.close();
      setCustomerId(String(created.id));
      setUseCustomerData(true);
      await refetchCustomers();
    } catch (err) {
      toast.danger(
        err instanceof Error ? err.message : "No se pudo crear el cliente",
      );
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleSaveProduct = async (data: ProductFormData) => {
    setSavingProduct(true);
    try {
      if (editingProduct) {
        const updated = await productService.updateProduct(
          editingProduct.id,
          data,
        );
        toast.success("Producto actualizado");
        setCart((prev) =>
          prev.map((row) =>
            row.productId === updated.id
              ? {
                  ...row,
                  name: updated.name,
                  code: productCode(updated),
                  price: Number(updated.price) || 0,
                  stock: Number(updated.stock) || 0,
                  taxRate: Number(updated.taxRate ?? row.taxRate),
                }
              : row,
          ),
        );
      } else {
        const created = await productService.createProduct(data);
        toast.success("Producto creado");
        addProduct(created, 1);
      }
      productModal.close();
      setEditingProduct(null);
      await refetchProducts();
    } catch (err) {
      toast.danger(
        err instanceof Error ? err.message : "No se pudo guardar el producto",
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const openOtherCaja = () => {
    window.open(
      `${window.location.origin}${appRoutes.operation.cash}`,
      "_blank",
    );
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
    if (
      (useCustomerData ||
        documentType === "factura" ||
        saleType === "credito") &&
      !customerId
    ) {
      toast.danger("Selecciona un cliente");
      return;
    }
    if (saleType === "credito" && creditMode === "installments") {
      if (
        installments.length === 0 ||
        installments.some((r) => !(r.amount > 0))
      ) {
        toast.danger("Revisá las cuotas del crédito");
        return;
      }
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
          useCustomerData ||
          documentType === "factura" ||
          saleType === "credito"
            ? Number(customerId)
            : null,
        method: saleType === "credito" ? "cash" : method,
        saleType,
        documentType,
        notes: notes.trim() || undefined,
        ...(saleType === "credito"
          ? {
              installments: buildCreditInstallmentsPayload(
                creditMode,
                installments,
                totals.total,
              ),
            }
          : {}),
        lines: cart.map((row) => ({
          productId: row.productId,
          quantity: row.quantity,
          unitPrice: row.price,
        })),
      });
      toast.success(
        saleType === "credito" ? "Venta a crédito registrada" : "Venta cobrada",
      );
      clearCart();
      setAmountReceived("");
      setNotes("");
      setCreditMode("open");
      setInstallments([]);
      void loadCash();
      void refetchProducts();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al cobrar");
    } finally {
      setPending(false);
    }
  };

  if (!user) return null;

  const needCustomer =
    useCustomerData || documentType === "factura" || saleType === "credito";
  const colCount = stockVisible ? 8 : 7;

  return (
    <div
      className="mx-auto w-full max-w-[1400px] pb-2 text-[12px] leading-snug [&_label]:text-[11px] [&_input]:text-[12px] [&_button]:text-[12px]"
      data-tour="caja-root"
    >
      <div
        className="mb-1 flex flex-wrap items-center justify-between gap-1.5"
        data-tour="caja-header"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <h1 className="text-sm font-bold tracking-tight sm:text-base">
            Punto de Venta
          </h1>
          {cashLoading ? null : openShift ? (
            <span
              title={`Turno abierto · ${openShift.branch?.name ?? ""} · capital ${formatMoney(openShift.openingCashTotal)} · ${openShift.cashier}`}
              className="pos-chip pos-chip--ok"
            >
              <CircleCheck width={12} height={12} />
              Turno abierto
            </span>
          ) : (
            <span
              title="No hay turno abierto"
              className="pos-chip pos-chip--danger"
            >
              <CircleXmark width={12} height={12} />
              Sin turno
            </span>
          )}
          <a
            href={appRoutes.posDocs.sriSettings}
            className={`pos-chip ${sriReady ? "pos-chip--ok" : "pos-chip--warn"}`}
          >
            {sriReady ? "SRI listo" : "SRI no listo"}
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
        <section className="pos-panel lg:col-span-8">
          <div className="pos-panel__head">
            <p className="pos-panel__title">
              <ShoppingCart width={14} height={14} />
              Carrito
              <span className="pos-panel__count">{cart.length}</span>
            </p>
            <div
              className="flex shrink-0 flex-wrap gap-1.5"
              data-tour="caja-sell-actions"
            >
              <Button
                size="sm"
                variant="primary"
                isDisabled={pending || cart.length === 0 || !canSell}
                onPress={() => void onCheckout()}
              >
                <CircleDollar width={13} height={13} />
                Cobrar
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

          <div className="pos-panel__body">
            <div className="mb-1.5 flex flex-col gap-1.5 md:flex-row md:items-end">
              <div
                className="flex min-w-0 flex-1 items-end gap-1"
                data-tour="caja-product-search"
              >
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
                                {stockVisible ? ` · stk ${p.stock}` : ""}
                              </span>
                            </span>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </ComboBox.Popover>
                  </ComboBox>
                </div>
                {allowCreateProduct ? (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="secondary"
                    className="mb-0.5 shrink-0"
                    aria-label="Crear producto"
                    data-tour="caja-create-product"
                    onPress={openCreateProduct}
                  >
                    <SquarePlus width={16} height={16} />
                  </Button>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="secondary"
                data-tour="caja-quick-access"
                onPress={() => quickModal.open()}
              >
                <LayoutCellsLarge width={14} height={14} />
                Accesos rápidos
              </Button>
            </div>

            {allowShowStockToggle ? (
              <div className="mb-1.5" data-tour="caja-show-stock">
                <PosCheckbox checked={showStock} onChange={setShowStock}>
                  Mostrar stock
                </PosCheckbox>
              </div>
            ) : null}

            <div className="pos-scroll" data-tour="caja-cart">
              <table className="pos-table min-w-[640px]">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    {stockVisible ? (
                      <th className="text-center">Stock</th>
                    ) : null}
                    <th className="text-center">Cantidad</th>
                    <th className="text-right">Precio</th>
                    <th className="text-right">IVA</th>
                    <th className="text-right">Total</th>
                    <th className="text-center">Opciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} className="!py-6 text-center">
                        <Boxes3
                          width={24}
                          height={24}
                          className="mx-auto mb-1 text-muted opacity-40"
                        />
                        <p className="font-medium">Carrito vacío</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          Buscá un producto arriba o abrí los accesos rápidos.
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-1.5"
                          onPress={() => quickModal.open()}
                        >
                          <LayoutCellsLarge width={14} height={14} />
                          Accesos rápidos
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    cart.map((row) => {
                      const b = lineBreakdown(row);
                      const over = row.quantity > row.stock;
                      return (
                        <tr key={row.key}>
                          <td className="text-[11px] text-muted">
                            {row.code || "—"}
                          </td>
                          <td className="font-medium">
                            {row.name}
                            {over ? (
                              <span className="ml-1.5 text-[10px] font-normal text-danger">
                                supera el stock ({row.stock})
                              </span>
                            ) : null}
                          </td>
                          {stockVisible ? (
                            <td
                              className={`text-center tabular-nums ${
                                over ? "font-semibold text-danger" : ""
                              }`}
                            >
                              {row.stock}
                            </td>
                          ) : null}
                          <td className="text-center">
                            <QuantityStepper
                              label={row.name}
                              value={row.quantity}
                              over={over}
                              onChange={(v) =>
                                updateRow(row.key, { quantity: v })
                              }
                            />
                          </td>
                          <td>
                            <CompactNumberInput
                              aria-label={`Precio ${row.name}`}
                              value={row.price}
                              min={0}
                              step={0.01}
                              onChange={(v) => updateRow(row.key, { price: v })}
                              className="ml-auto w-[5.5rem]"
                            />
                          </td>
                          <td className="text-right tabular-nums">
                            {formatMoney(b.iva)}
                          </td>
                          <td className="text-right font-semibold tabular-nums">
                            {formatMoney(b.total)}
                          </td>
                          <td className="text-center">
                            <div className="inline-flex items-center justify-center gap-0.5">
                              {allowAutocompleteStock ? (
                                // El title va en el span: el Button de HeroUI no
                                // acepta esa prop y el tooltip no se mostraba.
                                <span
                                  className="inline-flex"
                                  title="Poner cantidad = stock disponible"
                                >
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="ghost"
                                    aria-label="Autocompletar stock"
                                    data-tour="caja-autocomplete-stock"
                                    onPress={() =>
                                      updateRow(row.key, {
                                        quantity: Math.max(
                                          0,
                                          Number(row.stock) || 0,
                                        ),
                                      })
                                    }
                                  >
                                    <Boxes3 width={13} height={13} />
                                  </Button>
                                </span>
                              ) : null}
                              {allowEditProduct ? (
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="ghost"
                                  aria-label="Editar producto"
                                  data-tour="caja-edit-product"
                                  onPress={() => openEditProduct(row.productId)}
                                >
                                  <Pencil width={13} height={13} />
                                </Button>
                              ) : null}
                              <Button
                                isIconOnly
                                size="sm"
                                variant="ghost"
                                aria-label="Quitar"
                                onPress={() => removeRow(row.key)}
                              >
                                <TrashBin width={13} height={13} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {cart.length > 0 ? (
                  <tfoot>
                    <tr>
                      <td colSpan={colCount - 3}>
                        Subtotal {formatMoney(totals.subtotal)}
                      </td>
                      <td className="text-right">{formatMoney(totals.iva)}</td>
                      <td className="text-right">
                        {formatMoney(totals.total)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>
        </section>

        <aside className="pos-panel lg:col-span-4">
          <div className="pos-panel__head pos-panel__head--accent">
            <p className="pos-panel__title">
              <CircleDollar width={14} height={14} />
              Cobro
            </p>
            <span className="pos-panel__total">
              {formatMoney(totals.total)}
            </span>
          </div>

          <div className="pos-panel__body flex min-w-0 flex-col gap-1.5">
            <p className="pos-group">Comprobante</p>
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
                if (next === "credito") {
                  setMethod("cash");
                  setUseCustomerData(true);
                }
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
              <>
                <p className="text-[10px] text-muted">
                  Queda pendiente de cobro; no suma al turno hasta que se
                  registre el pago. Elegí cliente y plan de pago.
                </p>
                <CreditPlanFields
                  compact
                  mode={creditMode}
                  onModeChange={setCreditMode}
                  installments={installments}
                  onInstallmentsChange={setInstallments}
                  total={totals.total}
                />
              </>
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
              <div className="flex items-end gap-1">
                <div className="min-w-0 flex-1">
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
                </div>
                <Button
                  isIconOnly
                  size="sm"
                  variant="secondary"
                  className="mb-0.5 shrink-0"
                  aria-label="Agregar cliente"
                  onPress={() => customerModal.open()}
                >
                  <PersonPlus width={16} height={16} />
                </Button>
              </div>
            ) : null}

            <p className="pos-group mt-0.5">Pago</p>
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

            <div className="my-0.5 border-t border-separator" />

            {/* Primero lo que se cobra, después el botón: antes el total y el
             * vuelto quedaban debajo de Cobrar. */}
            <div className="pos-summary">
              <p className="pos-summary__row">
                <span>Subtotal</span>
                <span>{formatMoney(totals.subtotal)}</span>
              </p>
              <p className="pos-summary__row">
                <span>IVA</span>
                <span>{formatMoney(totals.iva)}</span>
              </p>
              <p className="pos-summary__row pos-summary__row--total">
                <span>Total</span>
                <span>{formatMoney(totals.total)}</span>
              </p>
            </div>

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
                <p className="pos-change">
                  <span className="pos-change__label">Vuelto</span>
                  <span className="pos-change__value">
                    {formatMoney(change)}
                  </span>
                </p>
              </>
            ) : saleType === "contado" ? (
              <p className="text-[10px] text-muted">
                {method === "transfer"
                  ? "Pago por transferencia: no suma al arqueo de efectivo del turno."
                  : "Pago con tarjeta: no suma al arqueo de efectivo del turno."}
              </p>
            ) : null}

            <Button
              variant="primary"
              className="w-full"
              isDisabled={pending || cart.length === 0 || !canSell}
              onPress={() => void onCheckout()}
            >
              <CircleDollar width={16} height={16} />
              {pending ? "Guardando..." : `Cobrar ${formatMoney(totals.total)}`}
            </Button>
          </div>
        </aside>
      </div>

      <PosQuickAccessModal
        state={quickModal}
        products={productsSorted}
        onAdd={(product, qty) => addProduct(product, qty)}
      />

      <Modal state={customerModal}>
        <Modal.Backdrop>
          <Modal.Container placement="center">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Nuevo cliente</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <CustomerForm
                  formId="pos-customer-form"
                  onSubmit={handleCreateCustomer}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onPress={() => customerModal.close()}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  isDisabled={savingCustomer}
                  form="pos-customer-form"
                  type="submit"
                >
                  {savingCustomer ? "Guardando…" : "Guardar cliente"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {allowCreateProduct || allowEditProduct ? (
        <Modal state={productModal}>
          <Modal.Backdrop>
            <Modal.Container placement="center">
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>
                    {editingProduct ? "Editar producto" : "Crear producto"}
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <ProductForm
                    key={editingProduct?.id ?? "new"}
                    formId="pos-product-form"
                    defaultValues={editingProduct ?? undefined}
                    categories={categories}
                    units={units}
                    onSubmit={handleSaveProduct}
                  />
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="secondary"
                    onPress={() => {
                      productModal.close();
                      setEditingProduct(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={savingProduct}
                    form="pos-product-form"
                    type="submit"
                  >
                    {savingProduct
                      ? "Guardando…"
                      : editingProduct
                        ? "Actualizar"
                        : "Guardar"}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}
    </div>
  );
}
