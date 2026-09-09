"use client";

import { useMemo, useState, type ReactNode } from "react";
import CircleDollar from "@gravity-ui/icons/CircleDollar";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import ArrowUp from "@gravity-ui/icons/ArrowUp";
import ArrowDown from "@gravity-ui/icons/ArrowDown";
import TriangleExclamation from "@gravity-ui/icons/TriangleExclamation";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import {
  TablePro,
  type TableProColumn,
} from "@/shared/components/TablePro";
import { formatMoney } from "@/shared/utils/money";
import type { InventoryValueItem, InventoryValueSummary } from "../types";

function costSourceLabel(source: InventoryValueItem["costSource"]) {
  if (source === "catalog") return "Catálogo";
  if (source === "purchase") return "Última compra";
  return "Sin costo";
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-separator bg-surface px-4 py-3">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

interface Props {
  items: InventoryValueItem[];
  summary: InventoryValueSummary;
  loading?: boolean;
}

export function InventoryValuePanel({ items, summary, loading }: Props) {
  const [onlyStock, setOnlyStock] = useState(true);
  const [onlyMissingCost, setOnlyMissingCost] = useState(false);

  const rows = useMemo(() => {
    return items.filter((i) => {
      if (onlyStock && !i.hasStock) return false;
      if (onlyMissingCost && !i.missingCost) return false;
      return true;
    });
  }, [items, onlyMissingCost, onlyStock]);

  const columns = useMemo<TableProColumn<InventoryValueItem>[]>(
    () => [
      {
        id: "name",
        label: "Producto",
        getSortValue: (r) => r.name.toLowerCase(),
        getSearchValue: (r) =>
          `${r.name} ${r.sku ?? ""} ${r.category ?? ""}`,
        render: (r) => (
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-muted">
              {[r.sku, r.category, r.unit].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        ),
      },
      {
        id: "stock",
        label: "Stock",
        align: "right",
        getSortValue: (r) => r.stock,
        render: (r) => (
          <span className="tabular-nums">{r.stock}</span>
        ),
      },
      {
        id: "unitCost",
        label: "Costo u.",
        align: "right",
        getSortValue: (r) => r.unitCost,
        render: (r) => (
          <span className="tabular-nums">{formatMoney(r.unitCost)}</span>
        ),
      },
      {
        id: "valueCost",
        label: "Valor costo",
        align: "right",
        getSortValue: (r) => r.valueCost,
        render: (r) => (
          <span className="tabular-nums font-medium">
            {formatMoney(r.valueCost)}
          </span>
        ),
      },
      {
        id: "salePrice",
        label: "P. venta",
        align: "right",
        getSortValue: (r) => r.salePrice,
        render: (r) => (
          <span className="tabular-nums">{formatMoney(r.salePrice)}</span>
        ),
      },
      {
        id: "valueSale",
        label: "Valor venta",
        align: "right",
        getSortValue: (r) => r.valueSale,
        render: (r) => (
          <span className="tabular-nums font-medium">
            {formatMoney(r.valueSale)}
          </span>
        ),
      },
      {
        id: "margin",
        label: "Margen",
        align: "right",
        getSortValue: (r) => r.margin,
        render: (r) => (
          <span
            className={`tabular-nums ${
              r.margin >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {formatMoney(r.margin)}
          </span>
        ),
      },
      {
        id: "costSource",
        label: "Fuente costo",
        getSortValue: (r) => r.costSource,
        render: (r) => (
          <span
            className={`text-sm ${
              r.missingCost ? "text-warning" : "text-muted"
            }`}
          >
            {costSourceLabel(r.costSource)}
          </span>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <ContentCard>
        <TableSkeleton rows={6} />
      </ContentCard>
    );
  }

  if (items.length === 0) {
    return (
      <ContentCard>
        <EmptyState
          icon={<Boxes3 width={40} height={40} />}
          title="Sin productos activos"
          description="Cuando haya productos en el catálogo, aquí verás el valor del stock a costo y a venta."
        />
      </ContentCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<ArrowDown width={16} height={16} />}
          label="Valor a costo"
          value={formatMoney(summary.totalValueCost)}
          hint={`${summary.withStockCount} con stock`}
        />
        <SummaryCard
          icon={<ArrowUp width={16} height={16} />}
          label="Valor a venta"
          value={formatMoney(summary.totalValueSale)}
        />
        <SummaryCard
          icon={<CircleDollar width={16} height={16} />}
          label="Margen potencial"
          value={formatMoney(summary.totalMargin)}
        />
        <SummaryCard
          icon={<TriangleExclamation width={16} height={16} />}
          label="Sin costo"
          value={String(summary.missingCostCount)}
          hint="Productos con stock y sin costo"
        />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2 text-muted">
          <input
            type="checkbox"
            checked={onlyStock}
            onChange={(e) => setOnlyStock(e.target.checked)}
          />
          Solo con stock
        </label>
        <label className="flex items-center gap-2 text-muted">
          <input
            type="checkbox"
            checked={onlyMissingCost}
            onChange={(e) => setOnlyMissingCost(e.target.checked)}
          />
          Solo sin costo
        </label>
      </div>

      {rows.length === 0 ? (
        <ContentCard>
          <EmptyState
            icon={<CircleDollar width={40} height={40} />}
            title="Sin filas para el filtro"
            description="Prueba quitar «Solo con stock» o «Solo sin costo»."
          />
        </ContentCard>
      ) : (
        <TablePro
          columns={columns}
          rows={rows}
          getRowId={(r) => r.id}
          searchPlaceholder="Producto, SKU o categoría..."
          emptyMessage="No se encontraron productos"
          defaultRowsPerPage={15}
        />
      )}
    </div>
  );
}
