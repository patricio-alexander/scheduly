"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Label, toast, useOverlayState } from "@heroui/react";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";
import ArrowUpRightFromSquare from "@gravity-ui/icons/ArrowUpRightFromSquare";
import Plus from "@gravity-ui/icons/Plus";
import Eye from "@gravity-ui/icons/Eye";
import Printer from "@gravity-ui/icons/Printer";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { formatMoney } from "@/shared/utils/money";
import {
  printInvoiceHubReceipt,
  type InvoiceHubRow,
} from "@/shared/utils/invoice-hub";
import {
  ORDER_SEVERITY_META,
  type OrderSeverity,
} from "@/shared/utils/order-status";
import { InvoiceHubDetailDialog } from "@/src/features/orders/components/InvoiceHubDetailDialog";
import { SupplierOrderDialog } from "@/src/features/orders/components/SupplierOrderDialog";

type PurchaseRow = InvoiceHubRow & {
  date: string;
  supplierName?: string;
};

type Payload = {
  rows: PurchaseRow[];
  totals: {
    count: number;
    total: number;
    cash: number;
    checkBank: number;
    card: number;
    other: number;
    retention: number;
  };
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthStartKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function moneyCell(n: number) {
  if (!n) return "—";
  return formatMoney(n);
}

export function PurchasesReportHub() {
  const router = useRouter();
  const detailModal = useOverlayState();
  const createModal = useOverlayState();
  const [from, setFrom] = useState(monthStartKey);
  const [to, setTo] = useState(todayKey);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailRow, setDetailRow] = useState<PurchaseRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(
        apiUrl(`/api/orders/supplier-orders?${params}`),
      );
      if (!res.ok) throw new Error("No se pudieron cargar las compras");
      setData((await res.json()) as Payload);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = (row: PurchaseRow) => {
    setDetailRow(row);
    detailModal.open();
  };

  const openPrint = (row: PurchaseRow) => {
    printInvoiceHubReceipt(row);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <ShoppingCart width={24} height={24} />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Compras</h1>
            <p className="text-sm text-muted">
              Compras a proveedores y reporte por día.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onPress={() => router.push(appRoutes.sales.orders)}
          >
            <ArrowUpRightFromSquare width={14} height={14} />
            Ver pedidos
          </Button>
          <Button size="sm" variant="primary" onPress={() => createModal.open()}>
            <Plus width={14} height={14} />
            Nueva compra
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-separator bg-surface p-3">
        <div>
          <Label className="mb-1">Desde</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-1">Hasta</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => {
            setFrom(monthStartKey());
            setTo(todayKey());
          }}
        >
          Limpiar
        </Button>
        <Button size="sm" variant="secondary" onPress={() => void load()}>
          Actualizar
        </Button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-xl border border-separator bg-surface px-3 py-2 text-xs">
        <span>
          <span className="text-muted">Docs: </span>
          <strong className="tabular-nums">{data?.totals.count ?? 0}</strong>
        </span>
        <span>
          <span className="text-muted">Total: </span>
          <strong className="tabular-nums">
            {formatMoney(data?.totals.total ?? 0)}
          </strong>
        </span>
        <span>
          <span className="text-muted">Efectivo: </span>
          <strong className="tabular-nums">
            {formatMoney(data?.totals.cash ?? 0)}
          </strong>
        </span>
        <span>
          <span className="text-muted">Chq/Bco: </span>
          <strong className="tabular-nums">
            {formatMoney(data?.totals.checkBank ?? 0)}
          </strong>
        </span>
        <span>
          <span className="text-muted">Tarjeta: </span>
          <strong className="tabular-nums">
            {formatMoney(data?.totals.card ?? 0)}
          </strong>
        </span>
        <span>
          <span className="text-muted">Otros: </span>
          <strong className="tabular-nums">
            {formatMoney(data?.totals.other ?? 0)}
          </strong>
        </span>
        <span>
          <span className="text-muted">Ret.: </span>
          <strong className="tabular-nums">
            {formatMoney(data?.totals.retention ?? 0)}
          </strong>
        </span>
      </div>

      <section className="overflow-hidden rounded-2xl border border-separator bg-surface">
        <div className="border-b border-separator px-3 py-2">
          <h2 className="text-sm font-bold">Compras × día</h2>
        </div>
        {loading ? (
          <p className="px-3 py-8 text-center text-sm text-muted">Cargando…</p>
        ) : !data?.rows.length ? (
          <p className="px-3 py-8 text-center text-sm text-muted">
            Sin compras en el rango.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-[11px]">
              <thead className="border-b border-separator bg-surface-secondary/40 text-muted">
                <tr>
                  <th className="px-2 py-2 font-medium">Fecha</th>
                  <th className="px-2 py-2 font-medium">Estab</th>
                  <th className="px-2 py-2 font-medium">Nº factura</th>
                  <th className="px-2 py-2 font-medium">Proveedor</th>
                  <th className="px-2 py-2 text-right font-medium">Subtotal</th>
                  <th className="px-2 py-2 text-right font-medium">Desc.</th>
                  <th className="px-2 py-2 text-right font-medium">IVA</th>
                  <th className="px-2 py-2 text-right font-medium">Total</th>
                  <th className="px-2 py-2 text-right font-medium">Efectivo</th>
                  <th className="px-2 py-2 text-right font-medium">Chq/Bco</th>
                  <th className="px-2 py-2 text-right font-medium">Tarjeta</th>
                  <th className="px-2 py-2 text-right font-medium">Otros</th>
                  <th className="px-2 py-2 text-right font-medium">Ret.</th>
                  <th className="px-2 py-2 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-separator/50 last:border-0"
                  >
                    <td className="whitespace-nowrap px-2 py-1.5">
                      {row.emissionDate}
                    </td>
                    <td className="px-2 py-1.5">{row.estabPtoEmi}</td>
                    <td className="px-2 py-1.5 tabular-nums">{row.numero}</td>
                    <td className="max-w-[10rem] truncate px-2 py-1.5">
                      {row.partyName || row.supplierName}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {moneyCell(row.subtotal)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {moneyCell(row.discount)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {moneyCell(row.iva)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                      {formatMoney(row.total)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {moneyCell(row.cash)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {moneyCell(row.checkBank)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {moneyCell(row.card)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {moneyCell(row.other)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {moneyCell(row.retention)}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-center gap-0.5">
                        <span
                          title={row.statusLabel}
                          className={`inline-block h-2 w-2 rounded-full ${ORDER_SEVERITY_META[row.severity as OrderSeverity].chipClass}`}
                        />
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          aria-label="Ver detalle"
                          onPress={() => openDetail(row)}
                        >
                          <Eye width={14} height={14} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          aria-label="Imprimir"
                          onPress={() => openPrint(row)}
                        >
                          <Printer width={14} height={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <InvoiceHubDetailDialog
        state={detailModal}
        row={detailRow}
        rows={data?.rows ?? []}
        onPrint={openPrint}
      />
      <SupplierOrderDialog state={createModal} onSuccess={() => void load()} />
    </div>
  );
}
