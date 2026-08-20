"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Label,
  Modal,
  toast,
  useOverlayState,
} from "@heroui/react";
import Persons from "@gravity-ui/icons/Persons";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";
import ArrowRotateRight from "@gravity-ui/icons/ArrowRotateRight";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import FileText from "@gravity-ui/icons/FileText";
import { SelectField } from "@/shared/components/SelectField";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import {
  getBillableQty,
  lineTotal,
} from "@/shared/utils/collections-pending";

type Mode = "customers" | "suppliers";
type CustomerTab = "vista" | "pagados" | "grupos" | "detalle" | "creditos";
type SupplierTab = "vista" | "pagados";
type VistaSub = "orders" | "product" | "date";

type CustomerItem = {
  id: number;
  orderId: number;
  product: string;
  quantity: number;
  damagedQty: number;
  giftQty: number;
  replacedQty: number;
  price: number;
  lineTotal: number;
  paidAt: string | null;
  groupId: number | null;
  deliveredAt: string | null;
};

type CustomerOrder = {
  id: number;
  customerId: number;
  date: string;
  items: CustomerItem[];
};

type Group = {
  id: number;
  customerId: number;
  concept: string | null;
  status: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  itemIds: number[];
  payments?: Array<{
    id: number;
    amount: number;
    date: string;
    method: string | null;
    note: string | null;
  }>;
};

type PendingCustomer = {
  customerId: number;
  customerName: string;
  ungrouped: number;
  groups: number;
  total: number;
};

type SupplierPending = {
  supplierId: number;
  supplierName: string;
  remaining: number;
  orders: number;
};

type SupplierOrder = {
  id: number;
  supplierId: number;
  supplierName: string;
  date: string;
  invoiceNumber: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

function shortName(name: string, max = 28) {
  const n = name.trim();
  return n.length > max ? `${n.slice(0, max - 1)}…` : n;
}

function formatDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function CollectionsPage() {
  const [mode, setMode] = useState<Mode>("customers");
  const [loading, setLoading] = useState(true);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [showAllSuppliers, setShowAllSuppliers] = useState(false);

  const [allCustomers, setAllCustomers] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [customersPending, setCustomersPending] = useState<PendingCustomer[]>(
    [],
  );
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null,
  );
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [customerTab, setCustomerTab] = useState<CustomerTab>("vista");
  const [vistaSub, setVistaSub] = useState<VistaSub>("orders");
  const [futureIncome, setFutureIncome] = useState(0);
  const [credits, setCredits] = useState<
    Array<{
      id: number;
      orderId: number;
      customerId: number;
      customerName: string;
      dueDate: string;
      amount: number;
      sequence: number;
    }>
  >([]);

  const [suppliersPending, setSuppliersPending] = useState<SupplierPending[]>(
    [],
  );
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(
    null,
  );
  const [supplierTab, setSupplierTab] = useState<SupplierTab>("vista");
  const [futurePayable, setFuturePayable] = useState(0);

  const groupModal = useOverlayState();
  const payModal = useOverlayState();
  const [groupConcept, setGroupConcept] = useState("");
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("efectivo");
  const [payNote, setPayNote] = useState("");
  const [payTarget, setPayTarget] = useState<{
    kind: "group" | "supplierOrder";
    id: number;
    max: number;
    label: string;
  } | null>(null);
  const [pending, setPending] = useState(false);

  const loadCustomers = useCallback(async () => {
    const res = await fetch(apiUrl("/api/orders/workbench/all"));
    if (!res.ok) throw new Error("No se pudo cargar cobranzas de clientes");
    const data = (await res.json()) as {
      customers: Array<{ id: number; name: string }>;
      orders: CustomerOrder[];
      groups: Group[];
      pendingByCustomer: PendingCustomer[];
      futureIncome: number;
      credits?: Array<{
        id: number;
        orderId: number;
        customerId: number;
        customerName: string;
        dueDate: string;
        amount: number;
        sequence: number;
      }>;
    };
    setAllCustomers(data.customers ?? []);
    setOrders(data.orders ?? []);
    setGroups(data.groups ?? []);
    setCredits(data.credits ?? []);
    const pendingList = [...(data.pendingByCustomer ?? [])].sort(
      (a, b) => b.total - a.total,
    );
    setCustomersPending(pendingList);
    setFutureIncome(data.futureIncome ?? 0);
    setSelectedCustomerId((prev) => {
      if (prev != null && pendingList.some((c) => c.customerId === prev)) {
        return prev;
      }
      return pendingList[0]?.customerId ?? data.customers?.[0]?.id ?? null;
    });
  }, []);

  const loadSuppliers = useCallback(async () => {
    const res = await fetch(
      apiUrl("/api/orders/supplier-payables/workbench"),
    );
    if (!res.ok) throw new Error("No se pudo cargar cuentas por pagar");
    const data = (await res.json()) as {
      orders: SupplierOrder[];
      pendingBySupplier: SupplierPending[];
      futurePayable: number;
    };
    const pendingList = [...(data.pendingBySupplier ?? [])].sort(
      (a, b) => b.remaining - a.remaining,
    );
    setSupplierOrders(data.orders ?? []);
    setSuppliersPending(pendingList);
    setFuturePayable(data.futurePayable ?? 0);
    setSelectedSupplierId((prev) => {
      if (prev != null && pendingList.some((s) => s.supplierId === prev)) {
        return prev;
      }
      return pendingList[0]?.supplierId ?? null;
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "customers") await loadCustomers();
      else await loadSuppliers();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [mode, loadCustomers, loadSuppliers]);

  useEffect(() => {
    void load();
  }, [load]);

  const debtByCustomerId = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of customersPending) m.set(c.customerId, c.total);
    return m;
  }, [customersPending]);

  const customerChips = useMemo(() => {
    if (showAllCustomers) {
      return [...allCustomers]
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map((c) => ({
          id: c.id,
          name: c.name,
          debt: debtByCustomerId.get(c.id) ?? 0,
        }));
    }
    return customersPending.map((c) => ({
      id: c.customerId,
      name: c.customerName,
      debt: c.total,
    }));
  }, [showAllCustomers, allCustomers, customersPending, debtByCustomerId]);

  const selectedCustomerName =
    customerChips.find((c) => c.id === selectedCustomerId)?.name ??
    allCustomers.find((c) => c.id === selectedCustomerId)?.name ??
    "—";

  const selectedCustomerDebt = debtByCustomerId.get(selectedCustomerId ?? -1) ?? 0;

  const customerItems = useMemo(() => {
    if (selectedCustomerId == null) return [];
    const items: Array<CustomerItem & { orderDate: string }> = [];
    for (const o of orders) {
      if (o.customerId !== selectedCustomerId) continue;
      for (const it of o.items) {
        items.push({ ...it, orderDate: o.date });
      }
    }
    return items;
  }, [orders, selectedCustomerId]);

  const pendingItems = customerItems.filter(
    (it) => !it.paidAt && it.groupId == null && lineTotal(it) > 0,
  );
  const paidItems = customerItems.filter((it) => Boolean(it.paidAt));

  const customerGroups = groups.filter(
    (g) => g.customerId === selectedCustomerId,
  );
  const openCustomerGroups = customerGroups.filter(
    (g) =>
      g.remainingAmount > 0 &&
      (g.status === "open" || g.status === "partial"),
  );

  const selectedGroup =
    customerGroups.find((g) => g.id === selectedGroupId) ?? null;

  const groupItems = useMemo(() => {
    if (!selectedGroup) return [];
    const ids = new Set(selectedGroup.itemIds);
    return customerItems.filter((it) => ids.has(it.id));
  }, [selectedGroup, customerItems]);

  const selectedPendingTotal = useMemo(() => {
    return pendingItems
      .filter((it) => selectedItemIds.includes(it.id))
      .reduce((s, it) => s + lineTotal(it), 0);
  }, [pendingItems, selectedItemIds]);

  const pendingByOrders = useMemo(() => {
    const map = new Map<
      number,
      {
        orderId: number;
        date: string;
        items: typeof pendingItems;
        total: number;
      }
    >();
    for (const it of pendingItems) {
      const oid = it.orderId;
      if (!map.has(oid)) {
        map.set(oid, {
          orderId: oid,
          date: it.orderDate || "",
          items: [],
          total: 0,
        });
      }
      const row = map.get(oid)!;
      row.items.push(it);
      row.total = Number((row.total + lineTotal(it)).toFixed(2));
    }
    return [...map.values()].sort((a, b) => {
      const da = String(b.date || "");
      const db = String(a.date || "");
      if (da !== db) return da.localeCompare(db);
      return b.orderId - a.orderId;
    });
  }, [pendingItems]);

  const pendingByProduct = useMemo(() => {
    const map = new Map<
      string,
      {
        product: string;
        unitPrice: number;
        qty: number;
        total: number;
        orderIds: number[];
        itemIds: number[];
      }
    >();
    for (const it of pendingItems) {
      const key = `${it.product}\0${it.price}`;
      if (!map.has(key)) {
        map.set(key, {
          product: it.product,
          unitPrice: it.price,
          qty: 0,
          total: 0,
          orderIds: [],
          itemIds: [],
        });
      }
      const row = map.get(key)!;
      const q = getBillableQty(it);
      row.qty += q;
      row.total = Number((row.total + lineTotal(it)).toFixed(2));
      row.itemIds.push(it.id);
      if (!row.orderIds.includes(it.orderId)) row.orderIds.push(it.orderId);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [pendingItems]);

  const pendingByDate = useMemo(() => {
    const map = new Map<
      string,
      { date: string; qty: number; total: number; itemIds: number[] }
    >();
    for (const it of pendingItems) {
      const d = it.orderDate
        ? new Date(it.orderDate).toISOString().slice(0, 10)
        : "—";
      if (!map.has(d)) {
        map.set(d, { date: d, qty: 0, total: 0, itemIds: [] });
      }
      const row = map.get(d)!;
      row.qty += getBillableQty(it);
      row.total = Number((row.total + lineTotal(it)).toFixed(2));
      row.itemIds.push(it.id);
    }
    return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [pendingItems]);

  const customerCredits = credits.filter(
    (c) => c.customerId === selectedCustomerId,
  );

  const idsAllSelected = (ids: number[]) =>
    ids.length > 0 && ids.every((id) => selectedItemIds.includes(id));
  const idsSomeSelected = (ids: number[]) =>
    ids.length > 0 &&
    ids.some((id) => selectedItemIds.includes(id)) &&
    !idsAllSelected(ids);

  const toggleIds = (ids: number[]) => {
    if (idsAllSelected(ids)) {
      setSelectedItemIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedItemIds((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const prepareOrderGroup = (itemIds: number[], concept: string) => {
    if (!itemIds.length) {
      toast.danger("Ese pedido no tiene ítems pendientes sin grupo");
      setCustomerTab("grupos");
      return;
    }
    setSelectedItemIds(itemIds);
    setGroupConcept(concept);
    groupModal.open();
  };

  const abonarOrder = async (itemIds: number[], concept: string) => {
    if (!selectedCustomerId || itemIds.length === 0) {
      toast.danger("No hay ítems sin grupo en este pedido");
      setCustomerTab("grupos");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/orders/workbench/item-groups"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          itemIds,
          concept,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        message?: string;
        group?: { id: number; remainingAmount?: number };
        grupo?: { id: number };
      } | null;
      if (!res.ok) throw new Error(json?.message ?? "No se pudo crear grupo");
      await loadCustomers();
      const gid = json?.group?.id ?? json?.grupo?.id;
      if (gid) {
        setSelectedGroupId(gid);
        setCustomerTab("detalle");
        const rem =
          json?.group?.remainingAmount ??
          itemIds.reduce((s, id) => {
            const it = pendingItems.find((x) => x.id === id);
            return s + (it ? lineTotal(it) : 0);
          }, 0);
        setPayTarget({
          kind: "group",
          id: gid,
          max: rem,
          label: concept,
        });
        setPayAmount(rem);
        setPayMethod("efectivo");
        setPayNote(`Abono al grupo del pedido`);
        payModal.open();
      }
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error");
    } finally {
      setPending(false);
    }
  };

  const downloadTxtPending = () => {
    const lines = [
      `REPORTE PENDIENTE SIN GRUPO`,
      `Cliente: ${selectedCustomerName}`,
      `Fecha: ${new Date().toLocaleString("es-EC")}`,
      `Total: ${formatMoney(selectedCustomerDebt)}`,
      "",
      ...pendingByProduct.map(
        (r) =>
          `${r.product} | cant ${r.qty} | P/U ${formatMoney(r.unitPrice)} | ${formatMoney(r.total)} | pedidos ${r.orderIds.map((id) => `#${id}`).join(",")}`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pendiente_${selectedCustomerName.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showAccountSummary = () => {
    toast.success(
      `${selectedCustomerName}: pendiente ${formatMoney(selectedCustomerDebt)} · sin grupo ${formatMoney(pendingItems.reduce((s, it) => s + lineTotal(it), 0))} · en grupos ${formatMoney(openCustomerGroups.reduce((s, g) => s + g.remainingAmount, 0))}`,
    );
  };

  const supplierChips = useMemo(() => {
    if (showAllSuppliers) {
      const map = new Map<number, { id: number; name: string; debt: number }>();
      for (const o of supplierOrders) {
        if (!map.has(o.supplierId)) {
          map.set(o.supplierId, {
            id: o.supplierId,
            name: o.supplierName,
            debt: 0,
          });
        }
      }
      for (const s of suppliersPending) {
        map.set(s.supplierId, {
          id: s.supplierId,
          name: s.supplierName,
          debt: s.remaining,
        });
      }
      return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
    }
    return suppliersPending.map((s) => ({
      id: s.supplierId,
      name: s.supplierName,
      debt: s.remaining,
    }));
  }, [showAllSuppliers, supplierOrders, suppliersPending]);

  const selectedSupplierName =
    supplierChips.find((s) => s.id === selectedSupplierId)?.name ?? "—";
  const selectedSupplierDebt =
    suppliersPending.find((s) => s.supplierId === selectedSupplierId)
      ?.remaining ?? 0;

  const supplierOrdersFiltered = supplierOrders.filter(
    (o) => o.supplierId === selectedSupplierId,
  );
  const supplierPendingOrders = supplierOrdersFiltered.filter(
    (o) => o.remainingAmount > 0,
  );
  const supplierPaidOrders = supplierOrdersFiltered.filter(
    (o) => o.remainingAmount <= 0,
  );

  const selectCustomer = (id: number) => {
    setSelectedCustomerId(id);
    setSelectedItemIds([]);
    setSelectedGroupId(null);
    setCustomerTab("vista");
    setVistaSub("orders");
  };

  const createGroup = async () => {
    if (!selectedCustomerId || selectedItemIds.length === 0) {
      toast.danger("Selecciona ítems pendientes");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/orders/workbench/item-groups"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          itemIds: selectedItemIds,
          concept:
            groupConcept ||
            `Cobro ${new Date().toLocaleDateString("es-EC")}`,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        message?: string;
        group?: { id: number };
        grupo?: { id: number };
      } | null;
      if (!res.ok) throw new Error(json?.message ?? "No se pudo crear grupo");
      toast.success("Grupo creado");
      setSelectedItemIds([]);
      groupModal.close();
      await loadCustomers();
      const gid = json?.group?.id ?? json?.grupo?.id;
      if (gid) {
        setSelectedGroupId(gid);
        setCustomerTab("detalle");
      } else {
        setCustomerTab("grupos");
      }
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error");
    } finally {
      setPending(false);
    }
  };

  const openPayGroup = (g: Group) => {
    setPayTarget({
      kind: "group",
      id: g.id,
      max: g.remainingAmount,
      label: g.concept || `Grupo #${g.id}`,
    });
    setPayAmount(g.remainingAmount);
    setPayMethod("efectivo");
    setPayNote("");
    payModal.open();
  };

  const openPaySupplier = (o: SupplierOrder) => {
    setPayTarget({
      kind: "supplierOrder",
      id: o.id,
      max: o.remainingAmount,
      label: `PO #${o.id} · ${o.supplierName}`,
    });
    setPayAmount(o.remainingAmount);
    setPayMethod("efectivo");
    setPayNote("");
    payModal.open();
  };

  const confirmPay = async () => {
    if (!payTarget || payAmount <= 0) return;
    setPending(true);
    try {
      const url =
        payTarget.kind === "group"
          ? apiUrl(`/api/orders/workbench/item-groups/${payTarget.id}/pay`)
          : apiUrl(
              `/api/orders/supplier-payables/orders/${payTarget.id}/pay`,
            );
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: payAmount,
          method: payMethod,
          note: payNote || "Abono",
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!res.ok) throw new Error(json?.message ?? "No se pudo abonar");
      toast.success("Abono registrado (también en Finanzas)");
      payModal.close();
      await load();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error");
    } finally {
      setPending(false);
    }
  };

  const customerTabs: Array<{ id: CustomerTab; label: string; count?: number }> =
    [
      { id: "vista", label: "Vista", count: pendingItems.length },
      { id: "pagados", label: "Pagados", count: paidItems.length },
      { id: "grupos", label: "Grupos", count: customerGroups.length },
      { id: "detalle", label: "Detalle" },
      { id: "creditos", label: "Créditos", count: customerCredits.length },
    ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3">
      {/* Header EdDeli */}
      <div
        className={`rounded-2xl border border-separator p-3 sm:p-4 ${
          mode === "customers"
            ? "bg-gradient-to-r from-accent/15 to-transparent"
            : "bg-gradient-to-r from-danger/15 to-transparent"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight">Cobranzas</h1>
            <p className="text-sm text-muted">
              {mode === "customers"
                ? "Cuentas por cobrar de clientes (ítems, grupos y abonos)."
                : "Cuentas por pagar a proveedores (pedidos de compra)."}
            </p>
          </div>
          <div className="inline-flex overflow-hidden rounded-xl border border-separator bg-surface">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${
                mode === "customers"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:bg-surface-secondary"
              }`}
              onClick={() => setMode("customers")}
            >
              <Persons width={14} height={14} />
              Clientes
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${
                mode === "suppliers"
                  ? "bg-danger text-danger-foreground"
                  : "text-muted hover:bg-surface-secondary"
              }`}
              onClick={() => setMode("suppliers")}
            >
              <ShoppingCart width={14} height={14} />
              Proveedores
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted">Cargando…</p>
      ) : mode === "customers" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">
                Clientes (por ítems / pedidos)
              </h2>
              <p className="text-xs text-muted">
                Cliente:{" "}
                <span className="font-semibold text-foreground">
                  {selectedCustomerName}
                </span>{" "}
                · Pendiente:{" "}
                <span className="font-bold text-[var(--warning)]">
                  {formatMoney(selectedCustomerDebt)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onPress={() => void load()}>
                <ArrowRotateRight width={14} height={14} />
                Refrescar
              </Button>
              <Button size="sm" variant="primary" onPress={showAccountSummary}>
                Resumen de cuenta
              </Button>
            </div>
          </div>

          {/* Chips clientes */}
          <section className="rounded-2xl border border-separator bg-surface p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted">
                Clientes con deuda (ordenados por saldo)
                {futureIncome > 0 ? (
                  <span className="ml-2 font-normal">
                    · Total {formatMoney(futureIncome)}
                  </span>
                ) : null}
              </p>
              <button
                type="button"
                className="text-[11px] font-semibold text-accent hover:underline"
                onClick={() => setShowAllCustomers((v) => !v)}
              >
                {showAllCustomers
                  ? "Ver solo con deuda"
                  : "Ver todos e historial"}
              </button>
            </div>
            <div className="flex max-h-[200px] flex-wrap gap-1.5 overflow-y-auto">
              {customerChips.length === 0 ? (
                <p className="py-4 text-xs text-muted">Sin clientes</p>
              ) : (
                customerChips.map((c) => {
                  const active = c.id === selectedCustomerId;
                  const hasDebt = c.debt > 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c.id)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        active
                          ? "border-accent bg-accent text-accent-foreground"
                          : hasDebt
                            ? "border-warning/50 bg-warning/10 text-[var(--warning)] hover:border-warning"
                            : "border-separator text-muted hover:bg-surface-secondary"
                      }`}
                    >
                      {shortName(c.name)} · {formatMoney(c.debt)}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Workbench tabs */}
          <section className="rounded-2xl border border-separator bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-separator px-3 py-2">
              <p className="text-xs font-semibold">
                Pendiente cobrable:{" "}
                <span className="text-[var(--warning)]">
                  {formatMoney(selectedCustomerDebt)}
                </span>
              </p>
              <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-bold text-[var(--warning)]">
                {formatMoney(selectedCustomerDebt)}
              </span>
            </div>
            <div className="flex gap-1 overflow-x-auto border-b border-separator px-2 pt-2">
              {customerTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`shrink-0 rounded-t-lg px-3 py-1.5 text-xs font-semibold ${
                    customerTab === t.id
                      ? "bg-surface-secondary text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                  onClick={() => setCustomerTab(t.id)}
                >
                  {t.label}
                  {t.count != null ? ` (${t.count})` : ""}
                </button>
              ))}
            </div>

            <div className="p-3">
              {customerTab === "vista" ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold">
                        Vista pendiente sin grupo
                      </h3>
                      <p className="text-[11px] text-muted">
                        Solo muestra y selecciona para agrupar. Agrupar prepara
                        el grupo; Abonar crea el grupo y abre el cobro.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        isDisabled={pendingItems.length === 0}
                        onPress={downloadTxtPending}
                      >
                        <FileText width={14} height={14} />
                        TXT
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        isDisabled={selectedItemIds.length === 0 || pending}
                        onPress={() => {
                          setGroupConcept("");
                          groupModal.open();
                        }}
                      >
                        Crear grupo
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-3 border-b border-separator text-xs">
                    {(
                      [
                        ["orders", "Por pedidos"],
                        ["product", "Por producto"],
                        ["date", "Por fecha"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={`pb-1.5 font-semibold ${
                          vistaSub === id
                            ? "border-b-2 border-accent text-accent"
                            : "text-muted hover:text-foreground"
                        }`}
                        onClick={() => setVistaSub(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {selectedItemIds.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs">
                      <span>
                        <b>{selectedItemIds.length}</b> ítem(s) ·{" "}
                        <b className="tabular-nums">
                          {formatMoney(selectedPendingTotal)}
                        </b>
                      </span>
                      <button
                        type="button"
                        className="font-semibold text-accent hover:underline"
                        onClick={() => setSelectedItemIds([])}
                      >
                        Limpiar
                      </button>
                    </div>
                  ) : null}

                  {pendingItems.length === 0 ? (
                    <p className="rounded-xl border border-separator bg-surface-secondary/30 px-3 py-6 text-center text-sm text-muted">
                      No hay ítems pendientes sin grupo.
                    </p>
                  ) : null}

                  {vistaSub === "orders" && pendingItems.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-separator">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead className="border-b border-separator bg-surface-secondary/50 text-muted">
                          <tr>
                            <th className="w-10 px-2 py-2" />
                            <th className="px-2 py-2 font-extrabold">Pedido</th>
                            <th className="px-2 py-2 font-extrabold">Fecha</th>
                            <th className="px-2 py-2 font-extrabold">Crédito</th>
                            <th className="px-2 py-2 text-right font-extrabold">
                              Ítems
                            </th>
                            <th className="px-2 py-2 text-right font-extrabold">
                              Total
                            </th>
                            <th className="px-2 py-2 text-right font-extrabold">
                              Acción
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingByOrders.map((ord) => {
                            const ids = ord.items.map((it) => it.id);
                            return (
                              <tr
                                key={ord.orderId}
                                className="border-b border-separator/50"
                              >
                                <td className="px-2 py-1.5">
                                  <input
                                    type="checkbox"
                                    className="h-3.5 w-3.5 accent-[var(--accent)]"
                                    checked={idsAllSelected(ids)}
                                    ref={(el) => {
                                      if (el) {
                                        el.indeterminate = idsSomeSelected(ids);
                                      }
                                    }}
                                    onChange={() => toggleIds(ids)}
                                  />
                                </td>
                                <td className="px-2 py-1.5 font-bold">
                                  #{ord.orderId}
                                </td>
                                <td className="px-2 py-1.5 whitespace-nowrap">
                                  {ord.date
                                    ? new Date(ord.date)
                                        .toISOString()
                                        .slice(0, 10)
                                    : "—"}
                                </td>
                                <td className="px-2 py-1.5 text-muted">—</td>
                                <td className="px-2 py-1.5 text-right tabular-nums">
                                  {ord.items.length}
                                </td>
                                <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                                  {formatMoney(ord.total)}
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="flex flex-wrap items-center justify-end gap-1">
                                    <Button
                                      isIconOnly
                                      size="sm"
                                      variant="ghost"
                                      aria-label="Editar pedido"
                                      onPress={() =>
                                        toast.success(
                                          `Pedido #${ord.orderId} — editar desde Pedidos`,
                                        )
                                      }
                                    >
                                      <Pencil width={14} height={14} />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      isDisabled={pending}
                                      onPress={() =>
                                        prepareOrderGroup(
                                          ids,
                                          `Pedido #${ord.orderId}${
                                            ord.date
                                              ? ` (${new Date(ord.date).toISOString().slice(0, 10)})`
                                              : ""
                                          }`,
                                        )
                                      }
                                    >
                                      Agrupar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      isDisabled={pending}
                                      onPress={() =>
                                        void abonarOrder(
                                          ids,
                                          `Pedido #${ord.orderId}${
                                            ord.date
                                              ? ` (${new Date(ord.date).toISOString().slice(0, 10)})`
                                              : ""
                                          }`,
                                        )
                                      }
                                    >
                                      Abonar
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {vistaSub === "product" && pendingItems.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-separator">
                      <table className="w-full min-w-[520px] text-left text-xs">
                        <thead className="border-b border-separator bg-surface-secondary/50 text-muted">
                          <tr>
                            <th className="w-10 px-2 py-2" />
                            <th className="px-2 py-2 font-extrabold">Producto</th>
                            <th className="px-2 py-2 font-extrabold">Pedidos</th>
                            <th className="px-2 py-2 text-right font-extrabold">
                              Cant.
                            </th>
                            <th className="px-2 py-2 text-right font-extrabold">
                              P/U
                            </th>
                            <th className="px-2 py-2 text-right font-extrabold">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingByProduct.map((r) => (
                            <tr
                              key={`${r.product}-${r.unitPrice}`}
                              className="border-b border-separator/50"
                            >
                              <td className="px-2 py-1.5">
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                                  checked={idsAllSelected(r.itemIds)}
                                  ref={(el) => {
                                    if (el) {
                                      el.indeterminate = idsSomeSelected(
                                        r.itemIds,
                                      );
                                    }
                                  }}
                                  onChange={() => toggleIds(r.itemIds)}
                                />
                              </td>
                              <td className="px-2 py-1.5 font-medium">
                                {r.product}
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex flex-wrap gap-1">
                                  {r.orderIds.map((oid) => (
                                    <span
                                      key={oid}
                                      className="rounded-full border border-separator px-1.5 py-0.5 text-[10px]"
                                    >
                                      #{oid}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums">
                                {r.qty}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums">
                                {formatMoney(r.unitPrice)}
                              </td>
                              <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                                {formatMoney(r.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {vistaSub === "date" && pendingItems.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-separator">
                      <table className="w-full min-w-[360px] text-left text-xs">
                        <thead className="border-b border-separator bg-surface-secondary/50 text-muted">
                          <tr>
                            <th className="w-10 px-2 py-2" />
                            <th className="px-2 py-2 font-extrabold">Fecha</th>
                            <th className="px-2 py-2 text-right font-extrabold">
                              Cant.
                            </th>
                            <th className="px-2 py-2 text-right font-extrabold">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingByDate.map((r) => (
                            <tr
                              key={r.date}
                              className="border-b border-separator/50"
                            >
                              <td className="px-2 py-1.5">
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                                  checked={idsAllSelected(r.itemIds)}
                                  ref={(el) => {
                                    if (el) {
                                      el.indeterminate = idsSomeSelected(
                                        r.itemIds,
                                      );
                                    }
                                  }}
                                  onChange={() => toggleIds(r.itemIds)}
                                />
                              </td>
                              <td className="px-2 py-1.5 font-medium">
                                {r.date}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums">
                                {r.qty}
                              </td>
                              <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                                {formatMoney(r.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {customerTab === "pagados" ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-bold">Ítems pagados</h3>
                  <ItemsTable
                    rows={paidItems}
                    empty="Sin ítems pagados"
                    showPaid
                  />
                </div>
              ) : null}

              {customerTab === "grupos" ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-bold">Grupos del cliente</h3>
                  {customerGroups.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted">
                      Sin grupos. Creá uno desde Vista.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {customerGroups.map((g) => {
                        const active = g.id === selectedGroupId;
                        const statusLabel =
                          g.remainingAmount <= 0
                            ? "Pagado"
                            : g.paidAmount > 0
                              ? "Parcial"
                              : "Pendiente";
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setSelectedGroupId(g.id);
                              setCustomerTab("detalle");
                            }}
                            className={`rounded-xl border p-3 text-left ${
                              active
                                ? "border-accent bg-accent/10"
                                : "border-separator hover:border-accent/40"
                            }`}
                          >
                            <p className="text-sm font-bold">
                              {g.concept || `Grupo #${g.id}`}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <span className="rounded-full border border-separator px-2 py-0.5 text-[10px] font-semibold">
                                {statusLabel}
                              </span>
                              <span className="rounded-full border border-separator px-2 py-0.5 text-[10px]">
                                Total {formatMoney(g.totalAmount)}
                              </span>
                              <span className="rounded-full border border-separator px-2 py-0.5 text-[10px]">
                                Abonado {formatMoney(g.paidAmount)}
                              </span>
                              <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-[var(--warning)]">
                                Saldo {formatMoney(g.remainingAmount)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {openCustomerGroups.length === 0 &&
                  customerGroups.length > 0 ? (
                    <p className="text-[11px] text-muted">
                      Todos los grupos están saldados.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {customerTab === "detalle" ? (
                <div className="flex flex-col gap-3">
                  {!selectedGroup ? (
                    <p className="py-8 text-center text-sm text-muted">
                      Elegí un grupo en la pestaña Grupos.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold">
                            {selectedGroup.concept ||
                              `Grupo #${selectedGroup.id}`}
                          </h3>
                          <p className="text-xs text-muted">
                            Total {formatMoney(selectedGroup.totalAmount)} ·
                            Abonado {formatMoney(selectedGroup.paidAmount)} ·
                            Saldo{" "}
                            <strong className="text-[var(--warning)]">
                              {formatMoney(selectedGroup.remainingAmount)}
                            </strong>
                          </p>
                        </div>
                        {selectedGroup.remainingAmount > 0 ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onPress={() => openPayGroup(selectedGroup)}
                          >
                            Abonar
                          </Button>
                        ) : null}
                      </div>
                      <ItemsTable
                        rows={groupItems}
                        empty="Grupo sin ítems"
                        showPaid
                      />
                      <div className="rounded-xl border border-separator p-3">
                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                          Abonos
                        </h4>
                        {(selectedGroup.payments ?? []).length === 0 ? (
                          <p className="text-xs text-muted">Sin abonos aún</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {(selectedGroup.payments ?? []).map((p) => (
                              <li
                                key={p.id}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="text-muted">
                                  {formatDay(p.date)}
                                  {p.method ? ` · ${p.method}` : ""}
                                  {p.note ? ` · ${p.note}` : ""}
                                </span>
                                <span className="font-bold tabular-nums text-success">
                                  {formatMoney(p.amount)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {customerTab === "creditos" ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-bold">Créditos / cuotas</h3>
                  {customerCredits.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted">
                      Sin cuotas pendientes para este cliente.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-separator">
                      <table className="w-full min-w-[480px] text-left text-xs">
                        <thead className="border-b border-separator bg-surface-secondary/50 text-muted">
                          <tr>
                            <th className="px-3 py-2 font-medium">Pedido</th>
                            <th className="px-3 py-2 font-medium">Cuota</th>
                            <th className="px-3 py-2 font-medium">Vence</th>
                            <th className="px-3 py-2 text-right font-medium">
                              Monto
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerCredits.map((c) => (
                            <tr
                              key={c.id}
                              className="border-b border-separator/50"
                            >
                              <td className="px-3 py-2 font-semibold">
                                #{c.orderId}
                              </td>
                              <td className="px-3 py-2">{c.sequence}</td>
                              <td className="px-3 py-2">{c.dueDate}</td>
                              <td className="px-3 py-2 text-right font-bold tabular-nums text-[var(--warning)]">
                                {formatMoney(c.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : (
        /* —— Proveedores —— */
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-danger/30 bg-danger/5 p-3">
            <div>
              <h2 className="text-base font-bold">
                Cuentas por pagar (proveedores)
              </h2>
              <p className="text-xs text-muted">
                Deuda total:{" "}
                <span className="font-bold text-danger">
                  {formatMoney(futurePayable)}
                </span>
              </p>
            </div>
            <Button size="sm" variant="secondary" onPress={() => void load()}>
              <ArrowRotateRight width={14} height={14} />
              Refrescar
            </Button>
          </div>

          <section className="rounded-2xl border border-separator bg-surface p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted">
                Proveedores · {selectedSupplierName} · Debes{" "}
                <span className="text-danger">
                  {formatMoney(selectedSupplierDebt)}
                </span>
              </p>
              <button
                type="button"
                className="text-[11px] font-semibold text-accent hover:underline"
                onClick={() => setShowAllSuppliers((v) => !v)}
              >
                {showAllSuppliers ? "Ver solo con deuda" : "Ver todos"}
              </button>
            </div>
            <div className="flex max-h-[200px] flex-wrap gap-1.5 overflow-y-auto">
              {supplierChips.length === 0 ? (
                <p className="py-4 text-xs text-muted">Sin proveedores</p>
              ) : (
                supplierChips.map((s) => {
                  const active = s.id === selectedSupplierId;
                  const hasDebt = s.debt > 0;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSupplierId(s.id);
                        setSupplierTab("vista");
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        active
                          ? "border-danger bg-danger text-danger-foreground"
                          : hasDebt
                            ? "border-warning/50 bg-warning/10 text-[var(--warning)]"
                            : "border-separator text-muted hover:bg-surface-secondary"
                      }`}
                    >
                      {shortName(s.name)} · {formatMoney(s.debt)}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-separator bg-surface">
            <div className="flex gap-1 overflow-x-auto border-b border-separator px-2 pt-2">
              {(
                [
                  ["vista", `Vista (${supplierPendingOrders.length})`],
                  ["pagados", `Pagados (${supplierPaidOrders.length})`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`shrink-0 rounded-t-lg px-3 py-1.5 text-xs font-semibold ${
                    supplierTab === id
                      ? "bg-surface-secondary text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                  onClick={() => setSupplierTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto p-3">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="border-b border-separator bg-surface-secondary/40 text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">Nº</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                    <th className="px-3 py-2 text-right font-medium">Pagado</th>
                    <th className="px-3 py-2 text-right font-medium">Saldo</th>
                    <th className="px-3 py-2 text-center font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {(supplierTab === "vista"
                    ? supplierPendingOrders
                    : supplierPaidOrders
                  ).length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-muted"
                      >
                        {supplierTab === "vista"
                          ? "Sin pedidos pendientes"
                          : "Sin pedidos saldados"}
                      </td>
                    </tr>
                  ) : (
                    (supplierTab === "vista"
                      ? supplierPendingOrders
                      : supplierPaidOrders
                    ).map((o) => (
                      <tr key={o.id} className="border-b border-separator/50">
                        <td className="whitespace-nowrap px-3 py-2">
                          {formatDay(o.date)}
                        </td>
                        <td className="px-3 py-2">
                          {o.invoiceNumber || `PO-${o.id}`}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(o.totalAmount)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(o.paidAmount)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-danger">
                          {formatMoney(o.remainingAmount)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {o.remainingAmount > 0 ? (
                            <Button
                              size="sm"
                              variant="danger"
                              onPress={() => openPaySupplier(o)}
                            >
                              Abonar
                            </Button>
                          ) : (
                            <span className="text-[10px] text-success">
                              Liquidado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      <Modal state={groupModal}>
        <Modal.Backdrop isDismissable>
          <Modal.Container placement="center">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Crear grupo de cobro</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="mb-2 text-xs text-muted">
                  {selectedItemIds.length} ítem(s) ·{" "}
                  {formatMoney(selectedPendingTotal)}
                </p>
                <Label className="mb-1">Concepto</Label>
                <Input
                  value={groupConcept}
                  onChange={(e) => setGroupConcept(e.target.value)}
                  placeholder="Ej. Cobro semanal"
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => groupModal.close()}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  isDisabled={pending}
                  onPress={() => void createGroup()}
                >
                  Crear
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal state={payModal}>
        <Modal.Backdrop isDismissable>
          <Modal.Container placement="center">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Registrar abono</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="mb-2 text-xs text-muted">{payTarget?.label}</p>
                <div className="flex flex-col gap-3">
                  <AppNumberField
                    label="Monto"
                    value={payAmount}
                    minValue={0.01}
                    maxValue={payTarget?.max}
                    step={0.01}
                    onChange={setPayAmount}
                  />
                  <SelectField
                    label="Método"
                    selectedKey={payMethod}
                    onSelectionChange={(k) =>
                      setPayMethod(k ?? "efectivo")
                    }
                    options={[
                      { id: "efectivo", label: "Efectivo" },
                      { id: "transferencia", label: "Transferencia" },
                      { id: "tarjeta", label: "Tarjeta" },
                      { id: "otro", label: "Otro" },
                    ]}
                  />
                  <div>
                    <Label className="mb-1">Nota</Label>
                    <Input
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => payModal.close()}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  isDisabled={pending}
                  onPress={() => void confirmPay()}
                >
                  Abonar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

function ItemsTable({
  rows,
  selectable,
  selectedIds = [],
  onToggle,
  empty,
  showPaid,
}: {
  rows: Array<
    CustomerItem & {
      orderDate?: string;
    }
  >;
  selectable?: boolean;
  selectedIds?: number[];
  onToggle?: (id: number) => void;
  empty: string;
  showPaid?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-separator">
      <table className="w-full min-w-[900px] text-left text-[11px]">
        <thead className="border-b border-separator bg-surface-secondary/50 text-muted">
          <tr>
            {selectable ? <th className="px-2 py-2" /> : null}
            <th className="px-2 py-2 font-medium">Producto</th>
            <th className="px-2 py-2 text-right font-medium">Entregado</th>
            <th className="px-2 py-2 text-right font-medium">Vendido</th>
            <th className="px-2 py-2 text-right font-medium">Dañado</th>
            <th className="px-2 py-2 text-right font-medium">Yapa</th>
            <th className="px-2 py-2 text-right font-medium">Cambiado</th>
            <th className="px-2 py-2 text-right font-medium">P/U</th>
            <th className="px-2 py-2 text-right font-medium">Total vendido</th>
            {showPaid ? (
              <th className="px-2 py-2 text-center font-medium">Pagado</th>
            ) : null}
            <th className="px-2 py-2 font-medium">Pedido</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={selectable ? 11 : 10}
                className="px-3 py-8 text-center text-muted"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((it) => {
              const billable = getBillableQty(it);
              const delivered =
                billable +
                Number(it.damagedQty || 0) +
                Number(it.giftQty || 0);
              return (
                <tr key={it.id} className="border-b border-separator/40">
                  {selectable ? (
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-[var(--accent)]"
                        checked={selectedIds.includes(it.id)}
                        onChange={() => onToggle?.(it.id)}
                      />
                    </td>
                  ) : null}
                  <td className="px-2 py-1.5 font-medium">{it.product}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {delivered}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {billable}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {it.damagedQty || 0}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {it.giftQty || 0}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {it.replacedQty || 0}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatMoney(it.price)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                    {formatMoney(lineTotal(it))}
                  </td>
                  {showPaid ? (
                    <td className="px-2 py-1.5 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          it.paidAt
                            ? "bg-success/20 text-success"
                            : "bg-warning/15 text-[var(--warning)]"
                        }`}
                      >
                        {it.paidAt ? "Sí" : "No"}
                      </span>
                    </td>
                  ) : null}
                  <td className="px-2 py-1.5 text-muted">#{it.orderId}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
