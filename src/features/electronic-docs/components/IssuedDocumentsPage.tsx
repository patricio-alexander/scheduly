"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Modal, useOverlayState, toast } from "@heroui/react";
import FileCheck from "@gravity-ui/icons/FileCheck";
import { PageHeader, Skeleton } from "@/shared/components/ui";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { formatMoney } from "@/shared/utils/money";
import { resolveSriAuthorizationStatus, sriStatusLabel } from "../lib/sri-status";
import { SriStatusBadge } from "./SriStatusBadge";
import type { ElectronicDocumentSummary } from "../types";

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function IssuedDocumentsPage() {
  const [documents, setDocuments] = useState<ElectronicDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ElectronicDocumentSummary | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [issuingId, setIssuingId] = useState<number | null>(null);
  const detailModal = useOverlayState();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/electronic-documents"), {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? "Error al cargar");
      setDocuments(json as ElectronicDocumentSummary[]);
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Error al cargar");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (doc: ElectronicDocumentSummary) => {
    setSelected(doc);
    detailModal.open();
    try {
      const res = await fetch(apiUrl(`/api/electronic-documents/${doc.id}`), {
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (res.ok) setDetail(json as Record<string, unknown>);
    } catch {
      setDetail(null);
    }
  };

  const retryIssue = async (id: number) => {
    setIssuingId(id);
    try {
      const res = await fetch(apiUrl(`/api/electronic-documents/${id}/issue`), {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? "Error al emitir");

      notifySriResult(String(json?.status ?? ""));
      await load();
      if (selected?.id === id) {
        setSelected(serializeDoc(json));
        setDetail(json as Record<string, unknown>);
      }
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Error al emitir");
    } finally {
      setIssuingId(null);
    }
  };

  const refreshAuthorization = async (id: number) => {
    setIssuingId(id);
    try {
      const res = await fetch(apiUrl(`/api/electronic-documents/${id}/authorize`), {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? "Error al consultar autorización");

      notifySriResult(String(json?.status ?? ""));
      await load();
      if (selected?.id === id) {
        setSelected(serializeDoc(json));
        setDetail(json as Record<string, unknown>);
      }
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Error al consultar");
    } finally {
      setIssuingId(null);
    }
  };

  function notifySriResult(status: string) {
    const sriStatus = resolveSriAuthorizationStatus(status);
    if (sriStatus === "authorized") {
      toast.success("Factura autorizada por el SRI");
    } else if (sriStatus === "rejected") {
      toast.danger("El SRI rechazó la factura");
    } else if (sriStatus === "processing") {
      toast.success("Comprobante en procesamiento SRI");
    } else {
      toast.success("Consulta al SRI registrada");
    }
  }

  function serializeDoc(json: Record<string, unknown>): ElectronicDocumentSummary {
    return json as unknown as ElectronicDocumentSummary;
  }

  const authorizedCount = documents.filter(
    (d) => resolveSriAuthorizationStatus(d.status) === "authorized",
  ).length;
  const rejectedCount = documents.filter(
    (d) => resolveSriAuthorizationStatus(d.status) === "rejected",
  ).length;
  const processingCount = documents.filter(
    (d) => resolveSriAuthorizationStatus(d.status) === "processing",
  ).length;

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          icon={<FileCheck width={24} height={24} />}
          title="Comprobantes emitidos"
          description="Historial de facturas y respuesta del SRI"
          action={
            <Link
              href={appRoutes.electronicDocs.invoices}
              className="text-sm font-semibold text-accent hover:underline"
            >
              Facturar ventas
            </Link>
          }
        />

        {documents.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-2 text-sm">
              <span className="font-semibold text-success">{authorizedCount}</span>
              <span className="text-muted"> autorizadas SRI</span>
            </div>
            {processingCount > 0 ? (
              <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-2 text-sm">
                <span className="font-semibold text-accent">{processingCount}</span>
                <span className="text-muted"> en procesamiento SRI</span>
              </div>
            ) : null}
            {rejectedCount > 0 ? (
              <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-2 text-sm">
                <span className="font-semibold text-danger">{rejectedCount}</span>
                <span className="text-muted"> rechazadas SRI</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-separator bg-surface">
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : documents.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">
              Aún no hay comprobantes emitidos
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-separator text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 md:px-5">Serie</th>
                    <th className="px-2 py-3">Cliente</th>
                    <th className="px-2 py-3">Fecha</th>
                    <th className="px-2 py-3">Estado SRI</th>
                    <th className="px-2 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right md:px-5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-separator">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-surface-secondary/40">
                      <td className="px-4 py-3 font-mono text-xs md:px-5">
                        {doc.series}
                      </td>
                      <td className="px-2 py-3">
                        <p className="font-medium">{doc.buyerName}</p>
                        <p className="text-xs text-muted">{doc.buyerIdentification}</p>
                      </td>
                      <td className="px-2 py-3 text-muted">
                        {formatDate(doc.issueDate)}
                      </td>
                      <td className="px-2 py-3">
                        <SriStatusBadge status={doc.status} />
                      </td>
                      <td className="px-2 py-3 text-right font-medium tabular-nums">
                        {formatMoney(doc.total)}
                      </td>
                      <td className="px-4 py-3 text-right md:px-5">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onPress={() => void openDetail(doc)}
                          >
                            Ver
                          </Button>
                          {doc.status === "received" ? (
                            <Button
                              size="sm"
                              variant="primary"
                              isDisabled={issuingId === doc.id}
                              onPress={() => void refreshAuthorization(doc.id)}
                            >
                              {issuingId === doc.id ? "..." : "Consultar"}
                            </Button>
                          ) : null}
                          {doc.status === "rejected" ? (
                            <Button
                              size="sm"
                              variant="primary"
                              isDisabled={issuingId === doc.id}
                              onPress={() => void retryIssue(doc.id)}
                            >
                              {issuingId === doc.id ? "..." : "Reintentar"}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal.Backdrop isOpen={detailModal.isOpen} onOpenChange={detailModal.setOpen}>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex flex-wrap items-center gap-2">
                Factura {selected?.series ?? ""}
                {selected ? <SriStatusBadge status={selected.status} /> : null}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-3 text-sm">
              {selected ? (
                <>
                  <p>
                    <span className="text-muted">Estado SRI:</span>{" "}
                    <span className="font-medium">{sriStatusLabel(selected.status)}</span>
                  </p>
                  <p>
                    <span className="text-muted">Cliente:</span> {selected.buyerName}
                  </p>
                  <p>
                    <span className="text-muted">Clave de acceso:</span>{" "}
                    <span className="break-all font-mono text-xs">
                      {selected.accessKey}
                    </span>
                  </p>
                  {selected.authorizationNumber ? (
                    <p>
                      <span className="text-muted">N.º autorización:</span>{" "}
                      <span className="font-mono text-xs">
                        {selected.authorizationNumber}
                      </span>
                    </p>
                  ) : null}
                  {Array.isArray(detail?.sriMessages) &&
                  (detail.sriMessages as Array<{ message?: string }>).length > 0 ? (
                    <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-warning">
                        Mensajes del SRI
                      </p>
                      <ul className="space-y-1 text-xs">
                        {(detail.sriMessages as Array<{ message?: string }>).map(
                          (msg, index) => (
                            <li key={index}>{msg.message ?? "—"}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              {selected?.status === "received" ? (
                <Button
                  variant="primary"
                  isDisabled={issuingId === selected.id}
                  onPress={() => void refreshAuthorization(selected.id)}
                >
                  {issuingId === selected.id ? "..." : "Consultar autorización"}
                </Button>
              ) : null}
              {selected?.status === "rejected" ? (
                <Button
                  variant="primary"
                  isDisabled={issuingId === selected.id}
                  onPress={() => void retryIssue(selected.id)}
                >
                  {issuingId === selected.id ? "..." : "Reintentar emisión"}
                </Button>
              ) : null}
              <Button variant="secondary" onPress={detailModal.close}>
                Cerrar
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
