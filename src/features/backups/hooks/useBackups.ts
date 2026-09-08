"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@heroui/react";
import { apiUrl } from "@/shared/utils/api";

export type BackupMainInfo = {
  exists: boolean;
  filename: string;
  sizeBytes: number;
  sizeMB: number;
  modifiedAt: string | null;
  counts: Record<string, number>;
  totalRows: number;
};

export type StoredBackup = {
  filename: string;
  sizeBytes: number;
  sizeMB: number;
  modifiedAt: string;
};

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function readError(res: Response) {
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  return data.message || "Error en la operación";
}

export function useBackups() {
  const [main, setMain] = useState<BackupMainInfo | null>(null);
  const [stored, setStored] = useState<StoredBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/backups"), { credentials: "include" });
      const data = (await res.json()) as {
        main?: BackupMainInfo;
        stored?: StoredBackup[];
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Error al listar backups");
      setMain(data.main ?? null);
      setStored(data.stored ?? []);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al listar backups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function exportAndDownload() {
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/backups/export"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await readError(res));
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = /filename="?([^"]+)"?/.exec(cd);
      triggerBlobDownload(blob, match?.[1] || "backup-scheduly.json");
      await refresh();
      toast.success("Backup exportado y descargado");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al exportar");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function saveOnly() {
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/backups/export"), {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      await refresh();
      toast.success("Copia guardada en el servidor");
      return data;
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al guardar");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function downloadMain() {
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/backups/main/download"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await readError(res));
      const blob = await res.blob();
      triggerBlobDownload(blob, "backup.json");
      toast.success("Descarga de backup.json iniciada");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al descargar");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function downloadStored(filename: string) {
    setBusy(true);
    try {
      const res = await fetch(
        apiUrl(`/api/backups/stored/${encodeURIComponent(filename)}/download`),
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(await readError(res));
      const blob = await res.blob();
      triggerBlobDownload(blob, filename);
      toast.success(`Descarga de ${filename}`);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al descargar");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function importFromFile(file: File) {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch(apiUrl("/api/backups/import"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = (await res.json()) as {
        message?: string;
        totalRows?: number;
        importTables?: number;
        sourceKind?: string;
      };
      if (!res.ok) throw new Error(data.message || "Error al importar");
      await refresh();
      toast.success(
        `Reemplazo OK · ${data.importTables ?? "?"} tablas · ${data.totalRows ?? 0} filas (${data.sourceKind ?? "json"})`,
      );
      return data;
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al importar");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function reloadFromMain() {
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/backups/reload"), {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        message?: string;
        totalRows?: number;
      };
      if (!res.ok) throw new Error(data.message || "Error al recargar");
      await refresh();
      toast.success(
        `BD recargada desde backup.json · ${data.totalRows ?? 0} filas`,
      );
      return data;
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al recargar");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  return {
    main,
    stored,
    loading,
    busy,
    refresh,
    exportAndDownload,
    saveOnly,
    downloadMain,
    downloadStored,
    importFromFile,
    reloadFromMain,
  };
}
