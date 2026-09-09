"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Modal, toast, useOverlayState } from "@heroui/react";
import Database from "@gravity-ui/icons/Database";
import ArrowsRotateLeft from "@gravity-ui/icons/ArrowsRotateLeft";
import TrashBin from "@gravity-ui/icons/TrashBin";
import Eye from "@gravity-ui/icons/Eye";
import { PageHeader } from "@/shared/components/ui";
import {
  TablePro,
  type TableProColumn,
} from "@/shared/components/TablePro";
import { apiUrl } from "@/shared/utils/api";
import { formatDateTime } from "@/shared/utils/datetime-display";
import { displayLogAction } from "@/shared/utils/log-action-catalog";
import { useAuth } from "@/src/features/auth";
import { isProgrammerRole } from "@/shared/utils/roles";

type LogRow = {
  id: number;
  httpMethod: string | null;
  action: string | null;
  endPoint: string | null;
  description: string | null;
  system: string | null;
  date: string;
  ip?: string | null;
  browser?: string | null;
};

const METHODS = ["ALL", "POST", "PUT", "PATCH", "DELETE"] as const;

export default function SystemLogsPage() {
  const { user } = useAuth();
  const canDelete = isProgrammerRole(user?.role);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<LogRow | null>(null);
  const detail = useOverlayState();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q =
        methodFilter !== "ALL"
          ? `?limit=2000&method=${encodeURIComponent(methodFilter)}`
          : "?limit=2000";
      const res = await fetch(apiUrl(`/api/system/logs${q}`), {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No se pudo cargar");
      const json: unknown = await res.json();
      setRows(Array.isArray(json) ? (json as LogRow[]) : []);
    } catch {
      toast.danger("Error al cargar logs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [methodFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      ALL: rows.length,
      POST: 0,
      PUT: 0,
      PATCH: 0,
      DELETE: 0,
    };
    for (const r of rows) {
      const m = String(r.httpMethod ?? "").toUpperCase();
      if (m in c) c[m] += 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (methodFilter === "ALL") return rows;
    return rows.filter(
      (r) => String(r.httpMethod ?? "").toUpperCase() === methodFilter,
    );
  }, [rows, methodFilter]);

  const removeOne = async (id: number) => {
    if (!canDelete) return;
    const res = await fetch(apiUrl("/api/system/logs"), {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      toast.danger("No se pudo borrar");
      return;
    }
    toast.success("Log eliminado");
    void load();
  };

  const removeAll = async () => {
    if (!canDelete) return;
    if (!window.confirm("¿Borrar todos los logs del sistema?")) return;
    const res = await fetch(apiUrl("/api/system/logs"), {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (!res.ok) {
      toast.danger("No se pudo vaciar");
      return;
    }
    toast.success("Logs vaciados");
    void load();
  };

  const columns: TableProColumn<LogRow>[] = [
    {
      id: "id",
      label: "Id",
      getSearchValue: (r) => r.id,
      render: (r) => r.id,
    },
    {
      id: "date",
      label: "Fecha / hora",
      getSearchValue: (r) => r.date,
      render: (r) => (
        <span className="font-mono text-xs whitespace-nowrap">
          {formatDateTime(r.date)}
        </span>
      ),
    },
    {
      id: "method",
      label: "Método",
      getSearchValue: (r) => r.httpMethod ?? "",
      render: (r) => (
        <span className="font-semibold text-xs">{r.httpMethod ?? "—"}</span>
      ),
    },
    {
      id: "action",
      label: "Acción",
      getSearchValue: (r) => r.action ?? "",
      render: (r) => (
        <span className="text-xs font-medium">{displayLogAction(r.action)}</span>
      ),
    },
    {
      id: "description",
      label: "Detalle",
      getSearchValue: (r) => r.description ?? "",
      render: (r) => (
        <span
          className="block max-w-[320px] truncate text-xs"
          title={r.description ?? ""}
        >
          {r.description ?? "—"}
        </span>
      ),
    },
    {
      id: "browser",
      label: "Navegador",
      getSearchValue: (r) => r.browser ?? r.system ?? "",
      render: (r) => (
        <span className="block max-w-[140px] truncate text-xs text-muted" title={r.system ?? ""}>
          {r.browser || "—"}
        </span>
      ),
    },
    {
      id: "ip",
      label: "IP",
      getSearchValue: (r) => r.ip ?? "",
      render: (r) => (
        <span className="font-mono text-xs">{r.ip || "—"}</span>
      ),
    },
    {
      id: "endPoint",
      label: "Ruta",
      getSearchValue: (r) => r.endPoint ?? "",
      render: (r) => (
        <span className="block max-w-[180px] truncate text-xs" title={r.endPoint ?? ""}>
          {r.endPoint ?? "—"}
        </span>
      ),
    },
    {
      id: "ops",
      label: "",
      render: (r) => (
        <div className="flex gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Ver"
            onPress={() => {
              setSelected(r);
              detail.open();
            }}
          >
            <Eye width={14} height={14} />
          </Button>
          {canDelete ? (
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Borrar"
              onPress={() => void removeOne(r.id)}
            >
              <TrashBin width={14} height={14} />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <PageHeader
        title="Logs del sistema"
        description="Mutaciones HTTP con hora, quién, IP, navegador y User-Agent (estilo EdDeli enriquecido)."
        icon={<Database width={22} height={22} />}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onPress={() => void load()}>
              <ArrowsRotateLeft width={14} height={14} />
              Actualizar
            </Button>
            {canDelete ? (
              <Button variant="danger" onPress={() => void removeAll()}>
                <TrashBin width={14} height={14} />
                Vaciar
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {METHODS.map((m) => (
          <Button
            key={m}
            size="sm"
            variant={methodFilter === m ? "primary" : "secondary"}
            onPress={() => setMethodFilter(m)}
          >
            {m}
            {m === "ALL" || methodFilter === "ALL" || methodFilter === m
              ? ` (${m === "ALL" ? counts.ALL : counts[m] ?? 0})`
              : ""}
          </Button>
        ))}
      </div>

      <TablePro
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        loading={loading}
        emptyMessage="Sin logs todavía. Las acciones de escritura aparecerán aquí."
      />

      <Modal state={detail}>
        <Modal.Backdrop isDismissable>
          <Modal.Container placement="center" size="md">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Detalle del log #{selected?.id}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {selected ? (
                  <dl className="flex flex-col gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Fecha</dt>
                      <dd className="font-mono">{formatDateTime(selected.date)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Método</dt>
                      <dd>{selected.httpMethod}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Acción</dt>
                      <dd>{displayLogAction(selected.action)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Ruta</dt>
                      <dd className="break-all text-xs">{selected.endPoint}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Descripción</dt>
                      <dd className="whitespace-pre-wrap">{selected.description || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">IP</dt>
                      <dd className="font-mono text-xs">{selected.ip || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Navegador</dt>
                      <dd className="text-xs">{selected.browser || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Cliente (IP · navegador · User-Agent)</dt>
                      <dd className="break-all text-xs text-muted">
                        {selected.system || "—"}
                      </dd>
                    </div>
                  </dl>
                ) : null}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
