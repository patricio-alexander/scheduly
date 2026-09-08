"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Label,
  toast,
  useOverlayState,
} from "@heroui/react";
import ArrowRotateLeft from "@gravity-ui/icons/ArrowRotateLeft";
import Eye from "@gravity-ui/icons/Eye";
import Flag from "@gravity-ui/icons/Flag";
import Key from "@gravity-ui/icons/Key";
import Printer from "@gravity-ui/icons/Printer";
import ArrowChevronDown from "@gravity-ui/icons/ArrowChevronDown";
import ArrowChevronUp from "@gravity-ui/icons/ArrowChevronUp";
import { SelectField } from "@/shared/components/SelectField";
import {
  TablePro,
  type TableProColumn,
} from "@/shared/components/TablePro";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { formatMoney } from "@/shared/utils/money";
import {
  printInvoiceHubReceipt,
  type InvoiceHubItem,
  type InvoiceHubRow,
} from "@/shared/utils/invoice-hub";
import { InvoiceHubDetailDialog } from "@/src/features/orders/components/InvoiceHubDetailDialog";

type PosSaleItem = InvoiceHubItem & {
  productId?: number | null;
  price?: number;
};

type PosSaleSri = {
  estabPtoEmi?: string;
  sequential?: string | null;
  sequentialLabel?: string;
  environment?: string;
  environmentLabel?: string;
  status?: string | null;
  statusLabel?: string;
  accessKey?: string | null;
  authorizationNumber?: string | null;
  authorizedAt?: string | null;
  customerName?: string;
};

type PosSaleRaw = InvoiceHubRow & {
  date: string;
  dateKey?: string;
  paidAt?: string | null;
  sellerName?: string;
  documentType?: string;
  ice?: number;
  customer?: { id?: number; name?: string };
  sri?: PosSaleSri;
  items: PosSaleItem[];
};

type PosRow = PosSaleRaw & {
  dateIso: string;
  emissionDateLabel: string;
  customerLabel: string;
  sellerLabel: string;
  sequentialLabel: string;
  environment: string;
  environmentLabel: string;
  sriStatusLabel: string;
  paymentState: "pagado" | "pendiente";
  paymentStateLabel: string;
  subtotalLabel: string;
  iceLabel: string;
  ivaLabel: string;
  totalLabel: string;
  hasAccessKey: boolean;
};

const EMPTY_FILTERS = {
  dateFrom: "",
  dateTo: "",
  status: "",
  environment: "",
  seller: "",
  paymentState: "",
  productId: "",
};

function money(n: number) {
  return Number(n || 0).toFixed(2);
}

function normalizeEnvironment(env?: string, label?: string) {
  const raw = String(env || "")
    .toLowerCase()
    .trim();
  if (raw === "produccion" || raw === "producción" || raw === "2") {
    return "produccion";
  }
  if (raw === "pruebas" || raw === "1") return "pruebas";
  const lbl = String(label || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (lbl.includes("produccion")) return "produccion";
  if (lbl.includes("prueba")) return "pruebas";
  return "";
}

function saleDateIso(sale: PosSaleRaw) {
  const raw = sale.dateKey || sale.date || sale.paidAt || "";
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatReceiptDate(raw?: string | null) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function paymentStateOf(sale: PosSaleRaw): "pagado" | "pendiente" {
  const method = String(sale.paymentMethod || "").toLowerCase();
  const status = String(sale.status || "").toLowerCase();
  if (method === "credito" || status === "pendiente") return "pendiente";
  if (sale.paidAt || status === "pagado") return "pagado";
  return "pendiente";
}

function saleItems(sale: PosSaleRaw): PosSaleItem[] {
  return Array.isArray(sale.items) ? sale.items : [];
}

function SaleItemsPanel({ row }: { row: PosRow }) {
  const items = saleItems(row);
  if (!items.length) {
    return (
      <p className="text-xs text-muted">Sin productos en este comprobante.</p>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted">
        Productos del comprobante
      </p>
      <table className="w-full min-w-[320px] border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-separator text-left text-muted">
            <th className="px-2 py-1 font-semibold">Producto</th>
            <th className="px-2 py-1 text-right font-semibold">Cant.</th>
            <th className="px-2 py-1 text-right font-semibold">P. unit.</th>
            <th className="px-2 py-1 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr
              key={`${it.name}-${i}`}
              className="border-b border-separator/50 last:border-0"
            >
              <td className="px-2 py-1 font-semibold">{it.name}</td>
              <td className="px-2 py-1 text-right">{it.quantity}</td>
              <td className="px-2 py-1 text-right">
                {formatMoney(it.unitPrice ?? it.price ?? 0)}
              </td>
              <td className="px-2 py-1 text-right">
                {formatMoney(it.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PosReceiptsPage() {
  const detailModal = useOverlayState();
  const [sales, setSales] = useState<PosSaleRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [sriReady, setSriReady] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [detailRow, setDetailRow] = useState<PosRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, sriRes] = await Promise.all([
        fetch(apiUrl("/api/orders/pos-sales?limit=500")),
        fetch(apiUrl("/api/sri"), { cache: "no-store" }).catch(() => null),
      ]);
      if (!salesRes.ok) throw new Error("No se pudieron cargar las ventas de caja");
      const payload = (await salesRes.json()) as {
        data?: PosSaleRaw[];
        rows?: PosSaleRaw[];
      };
      setSales(payload.data ?? payload.rows ?? []);

      if (sriRes?.ok) {
        const sri = (await sriRes.json()) as {
          hasCertificate?: boolean;
          readyForInvoicing?: boolean;
        };
        setSriReady(Boolean(sri.readyForInvoicing ?? sri.hasCertificate));
      } else {
        setSriReady(false);
      }
    } catch (err) {
      toast.danger(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las ventas de caja.",
      );
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sellerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of sales) {
      const name = String(s.sellerName || s.sellerLabel || "").trim();
      if (name && name !== "—") set.add(name);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [sales]);

  const productOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const s of sales) {
      for (const it of saleItems(s)) {
        const key =
          it.productId != null
            ? `id:${it.productId}`
            : `name:${String(it.name || "").toLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, { id: key, name: it.name });
        }
      }
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
  }, [sales]);

  const sriStatusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of sales) {
      const st = String(s.sri?.statusLabel || "Sin SRI").trim();
      if (st) set.add(st);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [sales]);

  const mappedSales = useMemo<PosRow[]>(
    () =>
      sales.map((s) => {
        const sri = s.sri || {};
        const paymentState = paymentStateOf(s);
        const dateIso = saleDateIso(s);
        const emissionRaw = sri.authorizedAt || s.date || s.paidAt;
        return {
          ...s,
          ice: Number(s.ice || 0),
          dateIso,
          emissionDateLabel: formatReceiptDate(emissionRaw),
          customerLabel:
            s.documentType === "consumidor_final"
              ? "CONSUMIDOR FINAL"
              : String(
                  s.customer?.name ||
                    s.partyName ||
                    sri.customerName ||
                    "—",
                ).toUpperCase(),
          sellerLabel: s.sellerName || s.sellerLabel || "—",
          estabPtoEmi: sri.estabPtoEmi || s.estabPtoEmi || "—",
          sequentialLabel: sri.sequentialLabel || "—",
          environment: normalizeEnvironment(
            sri.environment,
            sri.environmentLabel,
          ),
          environmentLabel: sri.environmentLabel || "—",
          sriStatusLabel: sri.statusLabel || "Sin SRI",
          paymentState,
          paymentStateLabel: paymentState === "pagado" ? "Pagado" : "Pendiente",
          subtotalLabel: money(s.subtotal),
          iceLabel: money(s.ice || 0),
          ivaLabel: money(s.iva),
          totalLabel: money(s.total),
          hasAccessKey: Boolean(sri.accessKey || sri.authorizationNumber),
        };
      }),
    [sales],
  );

  const filteredRows = useMemo(() => {
    const productKey = String(filters.productId || "").trim();
    return mappedSales.filter((row) => {
      if (filters.dateFrom && row.dateIso && row.dateIso < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && row.dateIso && row.dateIso > filters.dateTo) {
        return false;
      }
      if (filters.status && row.sriStatusLabel !== filters.status) return false;
      if (filters.environment && row.environment !== filters.environment) {
        return false;
      }
      if (filters.seller && row.sellerLabel !== filters.seller) return false;
      if (filters.paymentState && row.paymentState !== filters.paymentState) {
        return false;
      }
      if (productKey) {
        const hit = saleItems(row).some((it) => {
          const key =
            it.productId != null
              ? `id:${it.productId}`
              : `name:${String(it.name || "").toLowerCase()}`;
          return key === productKey;
        });
        if (!hit) return false;
      }
      return true;
    });
  }, [mappedSales, filters]);

  const pageTotals = useMemo(
    () => ({
      subtotal: filteredRows.reduce((a, r) => a + Number(r.subtotal || 0), 0),
      ice: filteredRows.reduce((a, r) => a + Number(r.ice || 0), 0),
      iva: filteredRows.reduce((a, r) => a + Number(r.iva || 0), 0),
      total: filteredRows.reduce((a, r) => a + Number(r.total || 0), 0),
    }),
    [filteredRows],
  );

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setExpandedRowId(null);
  };

  const openDetail = (row: PosRow) => {
    setDetailRow(row);
    detailModal.open();
  };

  const openPrint = (row: PosRow) => {
    printInvoiceHubReceipt(row);
  };

  const columns = useMemo<TableProColumn<PosRow>[]>(
    () => [
      {
        id: "keyIcon",
        label: "",
        sortable: false,
        minWidth: 36,
        className: "w-[36px]",
        render: (row) =>
          row.hasAccessKey ? (
            <span title={row.sri?.accessKey || "Clave acceso SRI"}>
              <Key width={14} height={14} className="text-muted" />
            </span>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
      {
        id: "emissionDateLabel",
        label: "Fecha",
        minWidth: 110,
        getSortValue: (r) => r.dateIso || r.emissionDateLabel || "",
        getSearchValue: (r) => r.emissionDateLabel,
      },
      {
        id: "estabPtoEmi",
        label: "Estab",
        minWidth: 72,
      },
      {
        id: "sequentialLabel",
        label: "Núm.",
        minWidth: 72,
        getSortValue: (r) => Number(r.sri?.sequential || 0),
      },
      {
        id: "customerLabel",
        label: "Cliente",
        minWidth: 120,
        className: "max-w-[140px] truncate",
      },
      {
        id: "environmentLabel",
        label: "Amb.",
        minWidth: 72,
        className: "max-w-[90px] truncate",
      },
      {
        id: "sellerLabel",
        label: "Vendedor",
        minWidth: 100,
        className: "max-w-[120px] truncate",
      },
      {
        id: "subtotalLabel",
        label: "Subtotal",
        align: "right",
        minWidth: 64,
        getSortValue: (r) => Number(r.subtotal || 0),
      },
      {
        id: "iceLabel",
        label: "ICE",
        align: "right",
        minWidth: 52,
        getSortValue: (r) => Number(r.ice || 0),
      },
      {
        id: "ivaLabel",
        label: "IVA",
        align: "right",
        minWidth: 52,
        getSortValue: (r) => Number(r.iva || 0),
      },
      {
        id: "totalLabel",
        label: "Total",
        align: "right",
        minWidth: 64,
        getSortValue: (r) => Number(r.total || 0),
      },
      {
        id: "sriStatusLabel",
        label: "Estado",
        minWidth: 80,
        className: "max-w-[100px] truncate",
      },
      {
        id: "paymentStateLabel",
        label: "Pago",
        minWidth: 72,
      },
      {
        id: "actions",
        label: "Acciones",
        sortable: false,
        minWidth: 120,
        align: "right",
        render: (row) => {
          const open = expandedRowId === row.id;
          return (
            <div className="inline-flex items-center justify-end gap-0.5">
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
                aria-label={open ? "Ocultar productos" : "Ver productos"}
                onPress={() =>
                  setExpandedRowId((prev) => (prev === row.id ? null : row.id))
                }
              >
                {open ? (
                  <ArrowChevronUp width={14} height={14} />
                ) : (
                  <ArrowChevronDown width={14} height={14} />
                )}
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
          );
        },
      },
    ],
    [expandedRowId],
  );

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold tracking-tight">Comprobantes POS</h1>
        {sriReady ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--success)]">
            <Flag width={12} height={12} />
            Facturación electrónica activa
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/50 bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--warning)]">
            <Flag width={12} height={12} />
            SRI no listo
          </span>
        )}
      </div>

      <div className="rounded-xl border border-separator bg-surface-secondary/40 px-3 py-2 text-[12px] text-muted">
        Reimpresión de ventas de caja. Estado SRI (autorizado, pendiente, rechazado) en{" "}
        <Link
          href={appRoutes.posDocs.issued}
          className="text-accent underline-offset-2 hover:underline"
        >
          Emitidos
        </Link>
        {" · "}
        <Link
          href={appRoutes.posDocs.hub}
          className="text-accent underline-offset-2 hover:underline"
        >
          Comprobantes POS
        </Link>
        {" · "}
        <Link
          href={appRoutes.posDocs.sriSettings}
          className="text-accent underline-offset-2 hover:underline"
        >
          Configurar SRI
        </Link>
      </div>

      <section className="rounded-2xl border border-separator bg-surface p-3 sm:p-4">
        <h2 className="mb-3 text-sm font-bold">Filtros de búsqueda</h2>
        <div className="filter-grid">
          <div className="min-w-0">
            <Label className="mb-1 text-[11px]">Fecha inicio</Label>
            <Input
              fullWidth
              type="date"
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
              }
            />
          </div>
          <div className="min-w-0">
            <Label className="mb-1 text-[11px]">Fecha fin</Label>
            <Input
              fullWidth
              type="date"
              value={filters.dateTo}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
              }
            />
          </div>
          <SelectField
            label="Estado"
            selectedKey={filters.status || "all"}
            onSelectionChange={(key) =>
              setFilters((prev) => ({
                ...prev,
                status: !key || key === "all" ? "" : key,
              }))
            }
            options={[
              { id: "all", label: "Todos" },
              ...sriStatusOptions.map((st) => ({ id: st, label: st })),
            ]}
          />
          <SelectField
            label="Ambiente"
            selectedKey={filters.environment || "all"}
            onSelectionChange={(key) =>
              setFilters((prev) => ({
                ...prev,
                environment: !key || key === "all" ? "" : key,
              }))
            }
            options={[
              { id: "all", label: "Todos" },
              { id: "produccion", label: "Producción" },
              { id: "pruebas", label: "Pruebas" },
            ]}
          />
          <SelectField
            label="Vendedor"
            selectedKey={filters.seller || "all"}
            onSelectionChange={(key) =>
              setFilters((prev) => ({
                ...prev,
                seller: !key || key === "all" ? "" : key,
              }))
            }
            options={[
              { id: "all", label: "Todos" },
              ...sellerOptions.map((name) => ({ id: name, label: name })),
            ]}
          />
          <SelectField
            label="Estado pago"
            selectedKey={filters.paymentState || "all"}
            onSelectionChange={(key) =>
              setFilters((prev) => ({
                ...prev,
                paymentState: !key || key === "all" ? "" : key,
              }))
            }
            options={[
              { id: "all", label: "Todos" },
              { id: "pagado", label: "Pagado" },
              { id: "pendiente", label: "Pendiente" },
            ]}
          />
          <div className="filter-span-2 min-w-0">
            <SelectField
              label="Producto"
              selectedKey={filters.productId || "all"}
              onSelectionChange={(key) =>
                setFilters((prev) => ({
                  ...prev,
                  productId: !key || key === "all" ? "" : key,
                }))
              }
              options={[
                { id: "all", label: "Todos los productos" },
                ...productOptions.map((p) => ({ id: p.id, label: p.name })),
              ]}
            />
          </div>
          <div className="filter-actions min-w-0">
            <Button
              fullWidth
              size="md"
              variant="secondary"
              onPress={resetFilters}
            >
              <ArrowRotateLeft width={14} height={14} />
              Limpiar
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Mostrando {filteredRows.length} de {mappedSales.length} comprobantes ·
          buscá en la tabla, ordená por columna o filtrá por producto
        </p>
      </section>

      <TablePro
        header={
          <h2 className="text-sm font-bold tracking-tight">Ventas de caja</h2>
        }
        columns={columns}
        rows={filteredRows}
        getRowId={(row) => row.id}
        dense
        loading={loading}
        maxHeight="calc(100vh - 340px)"
        defaultRowsPerPage={25}
        rowsPerPageOptions={[15, 25, 50, 100]}
        emptyMessage="No hay comprobantes POS"
        expandedRowId={expandedRowId}
        renderExpanded={(row) => <SaleItemsPanel row={row} />}
      />

      <div className="rounded-xl border border-separator bg-surface px-3 py-2 text-[12px]">
        <strong>Total general (filtro):</strong> Subtotal{" "}
        {money(pageTotals.subtotal)} · ICE {money(pageTotals.ice)} · IVA{" "}
        {money(pageTotals.iva)} · Total {money(pageTotals.total)}
      </div>

      <InvoiceHubDetailDialog
        state={detailModal}
        row={detailRow}
        rows={mappedSales}
        onPrint={(row) => {
          detailModal.close();
          openPrint(row as PosRow);
        }}
      />
    </div>
  );
}
