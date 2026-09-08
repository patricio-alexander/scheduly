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
import { useCustomers } from "@/src/features/customers";
import { useProducts } from "@/src/features/products";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney, lineTotal } from "@/shared/utils/money";
import {
  CreditPlanFields,
  buildCreditInstallmentsPayload,
  type CreditPlanMode,
  type InstallmentDraft,
} from "./CreditPlanFields";

type Line = {
  key: string;
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
};

type Props = {
  state: ReturnType<typeof useOverlayState>;
  defaultDate?: string;
  onSuccess?: () => void;
};

export function CustomerOrderDialog({ state, defaultDate, onSuccess }: Props) {
  const { customers, loading: customersLoading } = useCustomers();
  const { products, loading: productsLoading } = useProducts();
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [date, setDate] = useState(
    defaultDate ?? new Date().toISOString().slice(0, 10),
  );
  const [invoiceGuide, setInvoiceGuide] = useState("");
  const [saleType, setSaleType] = useState<"credito" | "contado">("credito");
  const [creditMode, setCreditMode] = useState<CreditPlanMode>("open");
  const [installments, setInstallments] = useState<InstallmentDraft[]>([]);
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
  }, [defaultDate]);

  const selectedProduct = products.find((p) => String(p.id) === productId);

  const total = useMemo(
    () => cart.reduce((s, l) => s + lineTotal(l.unitPrice, l.quantity), 0),
    [cart],
  );

  const addLine = () => {
    if (!selectedProduct) {
      toast.danger("Selecciona un producto");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === selectedProduct.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === selectedProduct.id
            ? {
                ...l,
                quantity: l.quantity + qty,
                unitPrice: price || l.unitPrice,
              }
            : l,
        );
      }
      return [
        {
          key: crypto.randomUUID(),
          productId: selectedProduct.id,
          name: selectedProduct.name,
          quantity: qty,
          unitPrice: price || Number(selectedProduct.price) || 0,
        },
        ...prev,
      ];
    });
    setProductId("");
    setQty(1);
    setPrice(0);
  };

  const reset = () => {
    setCart([]);
    setNotes("");
    setInvoiceGuide("");
    setCustomerId("");
    setProductId("");
    setQty(1);
    setPrice(0);
    setSaleType("credito");
    setCreditMode("open");
    setInstallments([]);
  };

  const save = async () => {
    if (!customerId) {
      toast.danger("Selecciona un cliente");
      return;
    }
    if (cart.length === 0) {
      toast.danger("Agrega productos al carrito");
      return;
    }
    if (saleType === "credito" && creditMode === "installments") {
      if (installments.length === 0) {
        toast.danger("Agrega al menos una cuota o elegí sin fecha");
        return;
      }
      if (installments.some((r) => !(r.amount > 0))) {
        toast.danger("Cada cuota debe tener monto mayor a 0");
        return;
      }
    }
    setPending(true);
    try {
      const guide = invoiceGuide.trim();
      const noteParts = [
        guide ? `Guía/factura: ${guide}` : "",
        notes.trim(),
      ].filter(Boolean);

      const res = await fetch(apiUrl("/api/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: Number(customerId),
          date,
          saleType,
          notes: noteParts.join(" · "),
          documentType: guide || "documento",
          lines: cart.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
          ...(saleType === "credito"
            ? {
                installments: buildCreditInstallmentsPayload(
                  creditMode,
                  installments,
                  total,
                ),
              }
            : {}),
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!res.ok) throw new Error(json?.message ?? "No se pudo guardar");
      toast.success("Pedido de cliente guardado");
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
              <Modal.Heading>Nuevo pedido de cliente</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="mb-3 rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-xs text-muted">
                Pedido de cliente (productos que te piden). También podés anotar
                crédito en Caja. Contado o a crédito; si es crédito, con cuotas
                y fechas o sin fecha. Los cobros se siguen en Cobranzas.
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-3">
                  <ComboBox
                    selectedKey={customerId || null}
                    onSelectionChange={(k) =>
                      setCustomerId(k ? String(k) : "")
                    }
                    isDisabled={customersLoading}
                    variant="secondary"
                  >
                    <Label>Cliente</Label>
                    <ComboBox.InputGroup>
                      <Input placeholder="Seleccionar cliente" />
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

                  <ComboBox
                    selectedKey={productId || null}
                    onSelectionChange={(k) => {
                      const id = k ? String(k) : "";
                      setProductId(id);
                      const p = products.find((x) => String(x.id) === id);
                      if (p) setPrice(Number(p.price) || 0);
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
                      label="Precio unitario"
                      value={price}
                      minValue={0}
                      step={0.01}
                      onChange={setPrice}
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
                        value={invoiceGuide}
                        onChange={(e) => setInvoiceGuide(e.target.value)}
                        placeholder="001-001-000000123"
                      />
                    </div>
                  </div>

                  <ComboBox
                    selectedKey={saleType}
                    onSelectionChange={(k) =>
                      setSaleType(
                        String(k || "credito") === "contado"
                          ? "contado"
                          : "credito",
                      )
                    }
                    variant="secondary"
                  >
                    <Label>Pago</Label>
                    <ComboBox.InputGroup>
                      <Input />
                      <ComboBox.Trigger />
                    </ComboBox.InputGroup>
                    <ComboBox.Popover>
                      <ListBox>
                        <ListBox.Item id="credito" textValue="A crédito">
                          A crédito
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="contado" textValue="Contado">
                          Contado
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      </ListBox>
                    </ComboBox.Popover>
                  </ComboBox>

                  {saleType === "credito" ? (
                    <CreditPlanFields
                      mode={creditMode}
                      onModeChange={setCreditMode}
                      installments={installments}
                      onInstallmentsChange={setInstallments}
                      total={total}
                    />
                  ) : null}

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
                    {pending ? "Guardando…" : "Guardar pedido de cliente"}
                  </Button>
                </div>

                <div className="rounded-2xl border border-separator bg-surface-secondary/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">Carrito del pedido</h3>
                    <span className="text-xs text-muted">
                      Productos ({cart.length}) · {formatMoney(total)}
                    </span>
                  </div>
                  {invoiceGuide.trim() ? (
                    <p className="mb-2 text-[11px] text-muted">
                      Guía / factura:{" "}
                      <span className="font-semibold text-foreground">
                        {invoiceGuide.trim()}
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
                              {line.quantity} u. × {formatMoney(line.unitPrice)}{" "}
                              ={" "}
                              {formatMoney(
                                lineTotal(line.unitPrice, line.quantity),
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
