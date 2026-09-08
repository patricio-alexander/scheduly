"use client";

import { useEffect, useMemo, useState } from "react";
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
import Plus from "@gravity-ui/icons/Plus";
import TrashBin from "@gravity-ui/icons/TrashBin";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { useProducts } from "@/src/features/products";
import { useSuppliers } from "@/src/features/purchases";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney, lineTotal } from "@/shared/utils/money";

type Line = {
  key: string;
  productId: number;
  name: string;
  quantity: number;
  unitCost: number;
};

type Props = {
  state: ReturnType<typeof useOverlayState>;
  defaultDate?: string;
  onSuccess?: () => void;
};

export function SupplierOrderDialog({ state, defaultDate, onSuccess }: Props) {
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { products, loading: productsLoading } = useProducts();
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [cost, setCost] = useState(0);
  const [date, setDate] = useState(
    defaultDate ?? new Date().toISOString().slice(0, 10),
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [pending, setPending] = useState(false);
  const [receiveNow, setReceiveNow] = useState(true);
  const [payNow, setPayNow] = useState(true);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<
    Array<{ id: number; name: string }>
  >([]);

  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
  }, [defaultDate]);

  useEffect(() => {
    if (!state.isOpen) return;
    fetch(apiUrl("/api/branches"), { credentials: "include" })
      .then((r) => r.json())
      .then((rows: unknown) => {
        if (!Array.isArray(rows)) return;
        const list = rows
          .map((b) => b as { id?: number; name?: string })
          .filter((b): b is { id: number; name: string } => Boolean(b.id))
          .map((b) => ({ id: b.id, name: b.name ?? `Local #${b.id}` }));
        setBranches(list);
        if (!branchId && list[0]) setBranchId(String(list[0].id));
      })
      .catch(() => {});
  }, [state.isOpen, branchId]);

  const selectedProduct = products.find((p) => String(p.id) === productId);
  const total = useMemo(
    () => cart.reduce((s, l) => s + lineTotal(l.unitCost, l.quantity), 0),
    [cart],
  );

  const addLine = () => {
    if (!selectedProduct) {
      toast.danger("Selecciona un producto");
      return;
    }
    setCart((prev) => [
      {
        key: crypto.randomUUID(),
        productId: selectedProduct.id,
        name: selectedProduct.name,
        quantity: qty,
        unitCost: cost || Number(selectedProduct.price) || 0,
      },
      ...prev,
    ]);
    setProductId("");
    setQty(1);
    setCost(0);
  };

  const reset = () => {
    setCart([]);
    setNotes("");
    setInvoiceNumber("");
    setSupplierId("");
    setProductId("");
    setQty(1);
    setCost(0);
  };

  const save = async () => {
    if (!supplierId) {
      toast.danger("Selecciona un proveedor");
      return;
    }
    if (cart.length === 0) {
      toast.danger("Agrega productos");
      return;
    }
    if (receiveNow && !branchId) {
      toast.danger("Selecciona el local que recibe la mercadería");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/purchases"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: Number(supplierId),
          purchasedAt: date,
          invoiceNumber: invoiceNumber.trim() || null,
          notes,
          method: "cash",
          branchId: branchId ? Number(branchId) : null,
          receiveNow,
          payNow,
          lines: cart.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitCost: l.unitCost,
          })),
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!res.ok) throw new Error(json?.message ?? "No se pudo guardar");
      toast.success(
        payNow
          ? "Compra registrada y pagada (gasto en Finanzas)"
          : "Pedido a proveedor guardado",
      );
      reset();
      state.close();
      onSuccess?.();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error");
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable>
        <Modal.Container placement="center" size="lg" scroll="inside">
          <Modal.Dialog className="!max-w-4xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Nuevo pedido a proveedor</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="mb-3 rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-xs text-muted">
                Si marcás recibir y pagar, entra el stock y el gasto aparece en
                Finanzas. Si solo pedís, queda pendiente de abono en Cobranzas.
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-3">
                  <ComboBox
                    selectedKey={supplierId || null}
                    onSelectionChange={(k) =>
                      setSupplierId(k ? String(k) : "")
                    }
                    isDisabled={suppliersLoading}
                    variant="secondary"
                  >
                    <Label>Proveedor</Label>
                    <ComboBox.InputGroup>
                      <Input placeholder="Seleccionar proveedor" />
                      <ComboBox.Trigger />
                    </ComboBox.InputGroup>
                    <ComboBox.Popover>
                      <ListBox>
                        {suppliers.map((s) => (
                          <ListBox.Item
                            key={s.id}
                            id={String(s.id)}
                            textValue={s.name}
                          >
                            {s.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </ComboBox.Popover>
                  </ComboBox>

                  <ComboBox
                    selectedKey={branchId || null}
                    onSelectionChange={(k) =>
                      setBranchId(k ? String(k) : "")
                    }
                    variant="secondary"
                  >
                    <Label>Local que recibe</Label>
                    <ComboBox.InputGroup>
                      <Input placeholder="Sucursal" />
                      <ComboBox.Trigger />
                    </ComboBox.InputGroup>
                    <ComboBox.Popover>
                      <ListBox>
                        {branches.map((b) => (
                          <ListBox.Item
                            key={b.id}
                            id={String(b.id)}
                            textValue={b.name}
                          >
                            {b.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </ComboBox.Popover>
                  </ComboBox>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={receiveNow}
                      onChange={(e) => setReceiveNow(e.target.checked)}
                    />
                    Recibir mercadería ahora (suma stock)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={payNow}
                      onChange={(e) => setPayNow(e.target.checked)}
                    />
                    Pagar ahora (registra gasto en Finanzas)
                  </label>

                  <ComboBox
                    selectedKey={productId || null}
                    onSelectionChange={(k) => {
                      const id = k ? String(k) : "";
                      setProductId(id);
                      const p = products.find((x) => String(x.id) === id);
                      if (p) setCost(Number(p.price) || 0);
                    }}
                    isDisabled={productsLoading}
                    variant="secondary"
                  >
                    <Label>Producto</Label>
                    <ComboBox.InputGroup>
                      <Input placeholder="Buscar producto" />
                      <ComboBox.Trigger />
                    </ComboBox.InputGroup>
                    <ComboBox.Popover>
                      <ListBox>
                        {products.slice(0, 120).map((p) => (
                          <ListBox.Item
                            key={p.id}
                            id={String(p.id)}
                            textValue={p.name}
                          >
                            {p.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </ComboBox.Popover>
                  </ComboBox>

                  <div className="grid grid-cols-2 gap-2">
                    <AppNumberField
                      label="Cantidad"
                      value={qty}
                      minValue={0.01}
                      step={1}
                      onChange={setQty}
                    />
                    <AppNumberField
                      label="Costo unitario"
                      value={cost}
                      minValue={0}
                      step={0.01}
                      onChange={setCost}
                    />
                  </div>

                  <Button variant="secondary" onPress={addLine}>
                    <Plus width={14} height={14} />
                    Agregar al carrito
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="mb-1">Fecha del pedido</Label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="mb-1">Nº factura / guía</Label>
                      <Input
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="001-001-000000123"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1">Notas</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas del pedido"
                    />
                  </div>

                  <Button
                    variant="primary"
                    className="w-full"
                    isDisabled={pending}
                    onPress={() => void save()}
                  >
                    {pending ? "Guardando…" : "Guardar pedido proveedor"}
                  </Button>
                </div>

                <div className="rounded-2xl border border-separator bg-surface-secondary/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">Carrito del pedido</h3>
                    <span className="text-xs text-muted">
                      Productos ({cart.length}) · {formatMoney(total)}
                    </span>
                  </div>
                  {invoiceNumber.trim() ? (
                    <p className="mb-2 text-[11px] text-muted">
                      Guía / factura:{" "}
                      <span className="font-semibold text-foreground">
                        {invoiceNumber.trim()}
                      </span>
                    </p>
                  ) : null}
                  {cart.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted">
                      Aún no hay productos. Agregá líneas a la izquierda.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {cart.map((line) => (
                        <li
                          key={line.key}
                          className="flex items-center justify-between gap-2 rounded-xl border border-separator bg-surface px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{line.name}</p>
                            <p className="text-xs text-muted">
                              {line.quantity} u. × {formatMoney(line.unitCost)} ={" "}
                              {formatMoney(
                                lineTotal(line.unitCost, line.quantity),
                              )}
                            </p>
                          </div>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="ghost"
                            aria-label="Quitar"
                            onPress={() =>
                              setCart((prev) =>
                                prev.filter((l) => l.key !== line.key),
                              )
                            }
                          >
                            <TrashBin width={14} height={14} />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
