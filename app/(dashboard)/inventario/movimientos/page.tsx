"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, toast } from "@heroui/react";
import ArrowDownToLine from "@gravity-ui/icons/ArrowDownToLine";
import ArrowsRotateLeft from "@gravity-ui/icons/ArrowsRotateLeft";
import { PageHeader } from "@/shared/components/ui";
import {
  TablePro,
  type TableProColumn,
} from "@/shared/components/TablePro";
import { apiUrl } from "@/shared/utils/api";

type MovementRow = {
  id: number;
  date: string;
  type: string;
  kind: string;
  quantity: number;
  description: string;
  reason: string;
  product: { id: number; name: string };
  createdBy: string;
};

const KIND_LABEL: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
  traspaso: "Traspaso",
  produccion: "Producción",
};

const KIND_CLASS: Record<string, string> = {
  entrada: "text-success",
  salida: "text-danger",
  ajuste: "text-warning",
  traspaso: "text-accent",
  produccion: "text-muted",
};

export default function InventoryMovementsPage() {
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/inventory/movements?take=300"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("No se pudo cargar el kardex");
      const json: unknown = await res.json();
      setRows(Array.isArray(json) ? (json as MovementRow[]) : []);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (kindFilter === "all") return rows;
    return rows.filter((r) => r.kind === kindFilter);
  }, [rows, kindFilter]);

  const columns: TableProColumn<MovementRow>[] = [
    {
      id: "date",
      label: "Fecha",
      getSearchValue: (r) => r.date,
      render: (r) =>
        new Date(r.date).toLocaleString("es-EC", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
    },
    {
      id: "kind",
      label: "Tipo",
      getSearchValue: (r) => r.kind,
      render: (r) => (
        <span className={`font-semibold ${KIND_CLASS[r.kind] ?? ""}`}>
          {KIND_LABEL[r.kind] ?? r.kind}
        </span>
      ),
    },
    {
      id: "product",
      label: "Producto",
      getSearchValue: (r) => r.product?.name ?? "",
      render: (r) => r.product?.name ?? "—",
    },
    {
      id: "qty",
      label: "Cant.",
      align: "right",
      getSearchValue: (r) => String(r.quantity),
      render: (r) => (
        <span className="font-mono">
          {r.kind === "salida" || (r.kind === "traspaso" && r.type === "salida")
            ? "−"
            : "+"}
          {r.quantity}
        </span>
      ),
    },
    {
      id: "desc",
      label: "Detalle",
      getSearchValue: (r) => `${r.description} ${r.reason}`,
      render: (r) => (
        <span className="text-sm text-muted">
          {r.description || r.reason || "—"}
        </span>
      ),
    },
    {
      id: "by",
      label: "Usuario",
      getSearchValue: (r) => r.createdBy,
      render: (r) => r.createdBy,
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <PageHeader
        title="Movimientos de inventario"
        description="Kardex: entradas (compras), salidas (ventas), ajustes y traspasos entre locales."
        icon={<ArrowDownToLine width={22} height={22} />}
        action={
          <Button variant="secondary" onPress={() => void load()}>
            <ArrowsRotateLeft width={14} height={14} />
            Actualizar
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {[
          "all",
          "entrada",
          "salida",
          "ajuste",
          "traspaso",
        ].map((k) => (
          <Button
            key={k}
            size="sm"
            variant={kindFilter === k ? "primary" : "secondary"}
            onPress={() => setKindFilter(k)}
          >
            {k === "all" ? "Todos" : KIND_LABEL[k] ?? k}
          </Button>
        ))}
      </div>

      <TablePro
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        loading={loading}
        emptyMessage="Sin movimientos todavía. Las compras, ventas y traspasos aparecen aquí."
      />
    </div>
  );
}
