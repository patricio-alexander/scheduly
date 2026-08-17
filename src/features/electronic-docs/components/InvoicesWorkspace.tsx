"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Modal, Pagination, useOverlayState, toast } from "@heroui/react";
import FileDollar from "@gravity-ui/icons/FileDollar";
import ArrowRight from "@gravity-ui/icons/ArrowRight";
import { PageHeader, Skeleton } from "@/shared/components/ui";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { formatMoney } from "@/shared/utils/money";
import { resolveSriAuthorizationStatus, sriStatusLabel } from "../lib/sri-status";
import { formatSeries } from "../lib/access-key";
import { ElectronicInvoiceRide } from "./ElectronicInvoiceRide";
import { SriStatusBadge } from "./SriStatusBadge";
import type { InvoicePreviewData, PendingSale } from "../types";

const PAGE_SIZE = 10;

type EmitResult = {
  status: string;
  series: string;
  authorizationNumber: string | null;
  sriMessages: Array<{ message?: string }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InvoicesWorkspace() {
  const [pending, setPending] = useState<PendingSale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageRef = useRef(page);
  pageRef.current = page;
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<PendingSale | null>(null);
  const [preview, setPreview] = useState<InvoicePreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [emitResult, setEmitResult] = useState<EmitResult | null>(null);
  const confirmModal = useOverlayState();

  const load = useCallback(async (pageToLoad: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        apiUrl(
          `/api/electronic-documents/pending?page=${pageToLoad}&pageSize=${PAGE_SIZE}`,
        ),
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message ?? "No se pudieron cargar ventas");
      }

      const items = (json?.items ?? []) as PendingSale[];
      const nextTotal = Number(json?.total ?? 0);
      const nextPage = Number(json?.page ?? pageToLoad);

      if (items.length === 0 && nextTotal > 0 && nextPage > 1) {
        setPage(nextPage - 1);
        return;
      }

      setPending(items);
      setTotal(nextTotal);
      setPage(nextPage);
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Error al cargar");
      setPending([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [page, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openConfirm = async (sale: PendingSale) => {
    setSelectedSale(sale);
    setPreview(null);
    setPreviewError(null);
    setEmitResult(null);
    setPreviewLoading(true);
    confirmModal.open();

    try {
      const res = await fetch(apiUrl("/api/electronic-documents/preview"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: sale.kind === "appointment" ? sale.paymentId : undefined,
          productSaleId: sale.kind === "product_sale" ? sale.id : undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message ?? "No se pudo cargar la vista previa");
      }
      setPreview(json as InvoicePreviewData);
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Error al previsualizar",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const closeConfirm = () => {
    confirmModal.close();
    setSelectedSale(null);
    setPreview(null);
    setPreviewError(null);
    setEmitResult(null);
  };

  const confirmEmit = async () => {
    if (!selectedSale) return;
    const key = `${selectedSale.kind}-${selectedSale.id}`;
    setWorkingId(key);
    try {
      const res = await fetch(apiUrl("/api/electronic-documents"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId:
            selectedSale.kind === "appointment"
              ? selectedSale.paymentId
              : undefined,
          productSaleId:
            selectedSale.kind === "product_sale" ? selectedSale.id : undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message ?? "No se pudo emitir la factura");
      }

      const sriStatus = resolveSriAuthorizationStatus(String(json?.status ?? ""));
      setEmitResult({
        status: String(json?.status ?? ""),
        series: formatSeries(
          String(json?.estab ?? ""),
          String(json?.ptoEmi ?? ""),
          String(json?.secuencial ?? ""),
        ),
        authorizationNumber:
          typeof json?.authorizationNumber === "string"
            ? json.authorizationNumber
            : null,
        sriMessages: Array.isArray(json?.sriMessages)
          ? (json.sriMessages as Array<{ message?: string }>)
          : [],
      });

      if (sriStatus === "authorized") {
        toast.success("Factura autorizada por el SRI");
      } else if (sriStatus === "rejected") {
        toast.danger("El SRI rechazó la factura");
      } else if (sriStatus === "processing") {
        toast.success("Comprobante recibido, en procesamiento SRI");
      } else {
        toast.success("Factura enviada al SRI");
      }

      await load(pageRef.current);
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Error al emitir");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          icon={<FileDollar width={24} height={24} />}
          title="Facturas electrónicas"
          description="Emite facturas al SRI desde ventas cobradas sin comprobante"
          action={
            <Link
              href={appRoutes.electronicDocs.issued}
              className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
            >
              Ver emitidos
              <ArrowRight width={14} height={14} />
            </Link>
          }
        />

        <div className="rounded-2xl border border-separator bg-surface p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Ventas pendientes de facturar</h2>
              <p className="text-xs text-muted">
                Selecciona una venta para previsualizar y emitir al SRI
              </p>
            </div>
            <Link
              href={appRoutes.electronicDocs.sriSettings}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Configuración SRI
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : pending.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              No hay ventas pendientes de facturar
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {pending.map((sale) => {
                  const key = `${sale.kind}-${sale.id}`;
                  const busy = workingId === key;
                  const selected = selectedSale
                    ? `${selectedSale.kind}-${selectedSale.id}` === key
                    : false;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={workingId != null && !busy}
                        onClick={() => void openConfirm(sale)}
                        className={`flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-colors sm:flex-row sm:items-center sm:justify-between ${
                          selected
                            ? "border-accent/50 bg-accent/5"
                            : "border-separator bg-surface-secondary/40 hover:border-accent/40 hover:bg-surface-secondary/80"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{sale.customerName}</p>
                          <p className="truncate text-sm text-muted">{sale.description}</p>
                          <p className="mt-1 text-xs text-muted">
                            {formatDate(sale.paidAt)}
                            {sale.branchName ? ` · ${sale.branchName}` : ""}
                            {sale.customerIdentification
                              ? ` · ID ${sale.customerIdentification}`
                              : " · Consumidor final"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:pl-4">
                          <span className="text-sm font-semibold tabular-nums">
                            {formatMoney(sale.amount)}
                          </span>
                          <ArrowRight
                            width={16}
                            height={16}
                            className="text-muted"
                            aria-hidden
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {totalPages > 1 ? (
                <div className="mt-4 flex justify-center border-t border-separator pt-4">
                  <Pagination>
                    <Pagination.Summary>
                      {(page - 1) * PAGE_SIZE + 1} a{" "}
                      {Math.min(page * PAGE_SIZE, total)} de {total}
                    </Pagination.Summary>
                    <Pagination.Content>
                      <Pagination.Item>
                        <Pagination.Previous
                          isDisabled={page <= 1}
                          onPress={() => setPage(Math.max(1, page - 1))}
                        >
                          <Pagination.PreviousIcon />
                        </Pagination.Previous>
                      </Pagination.Item>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Pagination.Item key={p}>
                          <Pagination.Link
                            isActive={p === page}
                            onPress={() => setPage(p)}
                          >
                            {p}
                          </Pagination.Link>
                        </Pagination.Item>
                      ))}
                      <Pagination.Item>
                        <Pagination.Next
                          isDisabled={page >= totalPages}
                          onPress={() => setPage(Math.min(totalPages, page + 1))}
                        >
                          <Pagination.NextIcon />
                        </Pagination.Next>
                      </Pagination.Item>
                    </Pagination.Content>
                  </Pagination>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Modal.Backdrop isOpen={confirmModal.isOpen} onOpenChange={(open) => {
        if (!open) closeConfirm();
      }}>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex flex-wrap items-center gap-2">
                {emitResult ? "Resultado SRI" : "Vista previa de factura"}
                {emitResult ? <SriStatusBadge status={emitResult.status} /> : null}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              {emitResult ? (
                <div className="space-y-4">
                  <div
                    className={`rounded-xl border p-4 ${
                      resolveSriAuthorizationStatus(emitResult.status) === "authorized"
                        ? "border-success/30 bg-success/5"
                        : resolveSriAuthorizationStatus(emitResult.status) === "rejected"
                          ? "border-danger/30 bg-danger/5"
                          : resolveSriAuthorizationStatus(emitResult.status) === "processing"
                            ? "border-accent/30 bg-accent/5"
                            : "border-warning/30 bg-warning/5"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      {sriStatusLabel(emitResult.status)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Factura {emitResult.series}
                    </p>
                    {emitResult.authorizationNumber ? (
                      <p className="mt-2 text-xs">
                        <span className="text-muted">N.º autorización:</span>{" "}
                        <span className="font-mono">{emitResult.authorizationNumber}</span>
                      </p>
                    ) : null}
                  </div>

                  {emitResult.sriMessages.length > 0 ? (
                    <div className="rounded-xl border border-separator bg-surface-secondary/40 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-muted">
                        Mensajes del SRI
                      </p>
                      <ul className="space-y-1 text-sm">
                        {emitResult.sriMessages.map((msg, index) => (
                          <li key={index}>{msg.message ?? "—"}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {resolveSriAuthorizationStatus(emitResult.status) === "processing" ? (
                    <p className="text-xs text-muted">
                      El SRI está procesando la autorización. Se consultará
                      automáticamente; también puedes ver el estado en{" "}
                      <Link
                        href={appRoutes.electronicDocs.issued}
                        className="font-semibold text-accent hover:underline"
                      >
                        Comprobantes emitidos
                      </Link>
                      .
                    </p>
                  ) : null}

                  {resolveSriAuthorizationStatus(emitResult.status) === "rejected" ? (
                    <p className="text-xs text-muted">
                      Puedes corregir los datos y reintentar desde{" "}
                      <Link
                        href={appRoutes.electronicDocs.issued}
                        className="font-semibold text-accent hover:underline"
                      >
                        Comprobantes emitidos
                      </Link>
                      .
                    </p>
                  ) : null}
                </div>
              ) : (
                <>
                  {selectedSale ? (
                    <p className="text-sm text-muted">
                      {selectedSale.customerName} · {formatMoney(selectedSale.amount)}
                      {selectedSale.branchName ? ` · ${selectedSale.branchName}` : ""}
                    </p>
                  ) : null}

                  {previewLoading ? (
                    <Skeleton className="h-[420px] w-full rounded-xl" />
                  ) : previewError ? (
                    <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                      {previewError}
                    </div>
                  ) : preview ? (
                    <ElectronicInvoiceRide data={preview} />
                  ) : null}

                  <p className="text-xs text-muted">
                    Al confirmar, la factura se firmará con tu certificado .p12 y se
                    enviará al SRI.
                  </p>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              {emitResult ? (
                <>
                  <Link
                    href={appRoutes.electronicDocs.issued}
                    className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-accent hover:underline"
                  >
                    Ver emitidos
                  </Link>
                  <Button variant="primary" onPress={closeConfirm}>
                    Cerrar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onPress={closeConfirm}>
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={
                      !preview || previewLoading || workingId != null || Boolean(previewError)
                    }
                    onPress={() => void confirmEmit()}
                  >
                    {workingId ? "Emitiendo..." : "Confirmar y emitir al SRI"}
                  </Button>
                </>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
