"use client";

import { useRef, useState } from "react";
import {
  Alert,
  Button,
  Modal,
  Spinner,
  useOverlayState,
} from "@heroui/react";
import ArrowDownToLine from "@gravity-ui/icons/ArrowDownToLine";
import ArrowUpFromSquare from "@gravity-ui/icons/ArrowUpFromSquare";
import ArrowsRotateLeft from "@gravity-ui/icons/ArrowsRotateLeft";
import Clock from "@gravity-ui/icons/Clock";
import Database from "@gravity-ui/icons/Database";
import FloppyDisk from "@gravity-ui/icons/FloppyDisk";
import Layers from "@gravity-ui/icons/Layers";
import StarFill from "@gravity-ui/icons/StarFill";
import ArrowRotateLeft from "@gravity-ui/icons/ArrowRotateLeft";
import { PageHeader } from "@/shared/components/ui";
import { useBackups } from "../hooks/useBackups";

function formatSize(mb: number, bytes: number) {
  if (mb >= 0.01) return `${mb} MB`;
  if (bytes > 0) return `${(bytes / 1024).toFixed(1)} KB`;
  return "—";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-EC");
  } catch {
    return iso;
  }
}

function summaryLine(counts: Record<string, number> | undefined) {
  if (!counts) return "";
  const persons = counts.Person ?? 0;
  const products = counts.Product ?? 0;
  const customers = counts.Customer ?? 0;
  const sales = counts.Sale ?? 0;
  const branches = counts.Branch ?? 0;
  return `${persons} personas · ${products} productos · ${customers} clientes · ${sales} ventas · ${branches} sucursales`;
}

function previewBackupJson(raw: string) {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("El JSON debe ser un objeto con tablas");
  }
  const counts: Record<string, number> = {};
  let totalRows = 0;
  for (const [key, value] of Object.entries(parsed)) {
    if (!Array.isArray(value)) continue;
    counts[key] = value.length;
    totalRows += value.length;
  }
  if (totalRows === 0) {
    throw new Error("El JSON no contiene filas para importar");
  }
  return { counts, totalRows };
}

type BackupsManagerProps = {
  /** Sin título de página (pestaña dentro de Configuración). */
  embedded?: boolean;
};

export function BackupsManager({ embedded = false }: BackupsManagerProps) {
  const {
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
  } = useBackups();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importState = useOverlayState();
  const reloadState = useOverlayState();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<{
    counts: Record<string, number>;
    totalRows: number;
  } | null>(null);
  const [previewError, setPreviewError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPreviewError("");
    setPendingFile(file);

    try {
      const text = await file.text();
      setPendingPreview(previewBackupJson(text));
      importState.open();
    } catch (err) {
      setPendingFile(null);
      setPendingPreview(null);
      setPreviewError(
        err instanceof Error ? err.message : "No se pudo leer el archivo",
      );
      importState.open();
    }
  }

  async function confirmImport() {
    if (!pendingFile) return;
    try {
      await importFromFile(pendingFile);
      importState.close();
      setPendingFile(null);
      setPendingPreview(null);
      setPreviewError("");
    } catch {
      /* toast en hook */
    }
  }

  function cancelImport() {
    importState.close();
    setPendingFile(null);
    setPendingPreview(null);
    setPreviewError("");
  }

  async function confirmReload() {
    try {
      await reloadFromMain();
      reloadState.close();
    } catch {
      /* toast */
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />

      {embedded ? (
        <p className="text-sm text-muted">
          Exporta, guarda o restaura la BD en JSON. Acepta backup de Scheduly o
          EdDeli. Solo Dueño.
        </p>
      ) : (
        <PageHeader
          icon={<Database width={24} height={24} />}
          title="Backups JSON"
          description="Exporta, guarda o restaura la BD. Acepta backup.json de Scheduly o de EdDeli (se remapean Inventory*→Product, Store→Branch, Order→Sale, Users→Person, etc.). Solo Dueño."
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Button isDisabled={busy} onPress={() => void refresh()}>
          <ArrowsRotateLeft width={16} height={16} />
          Actualizar
        </Button>
        <Button
          isDisabled={busy}
          variant="secondary"
          onPress={() => fileInputRef.current?.click()}
        >
          <ArrowUpFromSquare width={16} height={16} />
          Subir JSON
        </Button>
        <Button isDisabled={busy} onPress={() => void saveOnly()}>
          <FloppyDisk width={16} height={16} />
          Guardar en servidor
        </Button>
        <Button
          isDisabled={busy || !main?.exists}
          variant="secondary"
          onPress={() => reloadState.open()}
        >
          <ArrowRotateLeft width={16} height={16} />
          Recargar BD
        </Button>
        <Button
          isDisabled={busy}
          variant="primary"
          onPress={() => void exportAndDownload()}
        >
          <ArrowDownToLine width={16} height={16} />
          Exportar BD (JSON)
        </Button>
      </div>

      <Alert status="warning">
        <Alert.Description>
          <strong>Recargar BD</strong> y <strong>Subir JSON</strong> reemplazan
          todos los datos actuales. Antes conviene exportar o guardar una copia.
          Tras restaurar puede que debas volver a iniciar sesión.
        </Alert.Description>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-separator bg-surface p-4">
          <div className="mb-2 flex items-center gap-2 text-muted">
            <Layers width={16} height={16} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Filas en backup fijo
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums">{main?.totalRows ?? 0}</p>
          <p className="mt-1 text-xs text-muted">{summaryLine(main?.counts)}</p>
        </div>
        <div className="rounded-2xl border border-separator bg-surface p-4">
          <div className="mb-2 flex items-center gap-2 text-muted">
            <Database width={16} height={16} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Tamaño backup.json
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {formatSize(main?.sizeMB ?? 0, main?.sizeBytes ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {main?.exists
              ? `Actualizado ${formatDate(main.modifiedAt)}`
              : "Aún no hay backup fijo"}
          </p>
        </div>
        <div className="rounded-2xl border border-separator bg-surface p-4">
          <div className="mb-2 flex items-center gap-2 text-muted">
            <Clock width={16} height={16} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Copias guardadas
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums">{stored.length}</p>
          <p className="mt-1 text-xs text-muted">backup-scheduly-*.json</p>
        </div>
      </div>

      <section className="rounded-2xl border border-separator bg-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <StarFill width={18} height={18} className="text-accent" />
          <h2 className="text-base font-semibold">backup.json (fijo)</h2>
        </div>
        <p className="mb-4 text-sm text-muted">
          Se actualiza al exportar, guardar o subir un JSON. Es el archivo que
          usa <strong>Recargar BD</strong>. Carpeta{" "}
          <code className="rounded bg-surface-secondary px-1 text-xs">
            backups/
          </code>
          .
        </p>
        {main?.exists ? (
          <p className="mb-4 text-sm">
            {summaryLine(main.counts)} · {main.totalRows} filas ·{" "}
            {formatSize(main.sizeMB, main.sizeBytes)}
          </p>
        ) : (
          <Alert status="warning" className="mb-4">
            <Alert.Description>
              Todavía no hay backup.json. Exporta, guarda o sube un JSON.
            </Alert.Description>
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            isDisabled={!main?.exists || busy}
            onPress={() => void downloadMain()}
          >
            <ArrowDownToLine width={16} height={16} />
            Descargar backup.json
          </Button>
          <Button
            variant="secondary"
            isDisabled={busy}
            onPress={() => fileInputRef.current?.click()}
          >
            <ArrowUpFromSquare width={16} height={16} />
            Restaurar desde JSON
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-separator bg-surface">
        <div className="border-b border-separator px-5 py-3">
          <h2 className="text-base font-semibold">Copias guardadas</h2>
          <p className="text-sm text-muted">
            Cada export o import genera un archivo fechado en{" "}
            <code className="text-xs">backups/</code>.
          </p>
        </div>
        {stored.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            No hay copias aún. Usa &quot;Exportar BD (JSON)&quot; o sube un
            backup.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-separator bg-surface-secondary/40 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Archivo</th>
                  <th className="px-5 py-2.5 font-medium">Fecha</th>
                  <th className="px-5 py-2.5 font-medium">Tamaño</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {stored.map((row) => (
                  <tr
                    key={row.filename}
                    className="border-b border-separator last:border-0"
                  >
                    <td className="px-5 py-3 font-mono text-xs">
                      {row.filename}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {formatDate(row.modifiedAt)}
                    </td>
                    <td className="px-5 py-3 tabular-nums">
                      {formatSize(row.sizeMB, row.sizeBytes)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="sm"
                        isDisabled={busy}
                        onPress={() => void downloadStored(row.filename)}
                      >
                        Descargar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal state={importState}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Restaurar desde JSON</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-3">
                {previewError ? (
                  <Alert status="danger">
                    <Alert.Description>{previewError}</Alert.Description>
                  </Alert>
                ) : (
                  <>
                    <Alert status="warning">
                      <Alert.Description>
                        Se borrarán <strong>todos los datos actuales</strong> y
                        se reemplazarán por el archivo. No se puede deshacer.
                      </Alert.Description>
                    </Alert>
                    {pendingFile ? (
                      <p className="text-sm">
                        Archivo:{" "}
                        <span className="font-mono">{pendingFile.name}</span>
                        {" · "}
                        {formatSize(0, pendingFile.size)}
                      </p>
                    ) : null}
                    {pendingPreview ? (
                      <p className="text-sm text-muted">
                        {summaryLine(pendingPreview.counts)} ·{" "}
                        {pendingPreview.totalRows} filas totales
                      </p>
                    ) : null}
                  </>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={cancelImport}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  isDisabled={busy || !!previewError || !pendingFile}
                  onPress={() => void confirmImport()}
                >
                  {busy ? <Spinner size="sm" /> : "Restaurar y reemplazar"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal state={reloadState}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Recargar BD desde backup.json</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Alert status="warning">
                  <Alert.Description>
                    Se vaciarán las tablas y se restaurará el contenido de{" "}
                    <strong>backup.json</strong> del servidor (
                    {main?.totalRows ?? 0} filas).
                  </Alert.Description>
                </Alert>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => reloadState.close()}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  isDisabled={busy || !main?.exists}
                  onPress={() => void confirmReload()}
                >
                  {busy ? <Spinner size="sm" /> : "Recargar ahora"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
