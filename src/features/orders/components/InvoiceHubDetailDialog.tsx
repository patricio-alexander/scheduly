"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal, useOverlayState } from "@heroui/react";
import Printer from "@gravity-ui/icons/Printer";
import { formatMoney } from "@/shared/utils/money";
import type { InvoiceHubRow } from "@/shared/utils/invoice-hub";
import { ORDER_SEVERITY_META } from "@/shared/utils/order-status";

type Props = {
  state: ReturnType<typeof useOverlayState>;
  row: InvoiceHubRow | null;
  rows?: InvoiceHubRow[];
  onPrint?: (row: InvoiceHubRow) => void;
};

const TABS = ["Comprobante", "Parte", "Productos", "Pagos", "General"] as const;

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex gap-2 py-0.5 text-sm">
      <span className="w-28 shrink-0 text-xs text-muted">{label}</span>
      <span className="min-w-0 break-words font-semibold">{value}</span>
    </div>
  );
}

export function InvoiceHubDetailDialog({
  state,
  row,
  rows = [],
  onPrint,
}: Props) {
  const [tab, setTab] = useState(0);
  const [active, setActive] = useState<InvoiceHubRow | null>(row);

  useEffect(() => {
    if (state.isOpen) {
      setActive(row);
      setTab(0);
    }
  }, [state.isOpen, row]);

  const partyLabel =
    active?.partyKind === "supplier" ? "Proveedor" : "Cliente";
  const tabLabels = useMemo(
    () =>
      TABS.map((t) =>
        t === "Parte" ? partyLabel : t === "General" ? `General` : t,
      ),
    [partyLabel],
  );

  const history = useMemo(() => {
    if (!active) return [];
    return rows.filter((r) => {
      if (active.partyId != null && r.partyId != null) {
        return r.partyId === active.partyId && r.partyKind === active.partyKind;
      }
      return (
        r.partyKind === active.partyKind &&
        r.partyName === active.partyName
      );
    });
  }, [active, rows]);

  const tabLabelsWithCount = tabLabels.map((label, i) =>
    i === 4 ? `General (${history.length})` : label,
  );

  if (!active) return null;

  const items = active.items ?? [];
  const notesClean = String(active.notes || "")
    .replace(/\[.*?\]/g, "")
    .trim();

  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable>
        <Modal.Container placement="center" size="lg" scroll="inside">
          <Modal.Dialog className="!max-w-2xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div className="flex w-full items-start justify-between gap-2 pr-6">
                <div>
                  <Modal.Heading>
                    {active.partyKind === "supplier"
                      ? "Detalle de compra"
                      : "Detalle de venta"}
                  </Modal.Heading>
                  <p className="mt-0.5 text-xs text-muted">
                    {active.emissionDate} · Nº{" "}
                    {active.invoiceNumber || active.numero || active.id}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${ORDER_SEVERITY_META[active.severity].chipClass}`}
                  >
                    {active.statusLabel}
                  </span>
                  {onPrint ? (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label="Imprimir"
                      onPress={() => onPrint(active)}
                    >
                      <Printer width={16} height={16} />
                    </Button>
                  ) : null}
                </div>
              </div>
            </Modal.Header>
            <Modal.Body>
              <div className="mb-3 flex flex-wrap gap-1 border-b border-separator pb-2">
                {tabLabelsWithCount.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      tab === i
                        ? "bg-accent text-accent-foreground"
                        : "text-muted hover:bg-surface-secondary"
                    }`}
                    onClick={() => setTab(i)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 0 ? (
                <div>
                  <InfoRow label="Fecha emisión" value={active.emissionDate} />
                  <InfoRow label="Estab-PtoEmi" value={active.estabPtoEmi} />
                  <InfoRow label="Número" value={active.numero} />
                  {active.invoiceNumber ? (
                    <InfoRow label="Nº factura" value={active.invoiceNumber} />
                  ) : null}
                  {active.sellerLabel ? (
                    <InfoRow label="Vendedor" value={active.sellerLabel} />
                  ) : null}
                  <InfoRow label={partyLabel} value={active.partyName} />
                  <div className="my-2 border-t border-separator" />
                  <InfoRow
                    label="Subtotal"
                    value={formatMoney(active.subtotal)}
                  />
                  <InfoRow
                    label="Descuento"
                    value={formatMoney(active.discount)}
                  />
                  <InfoRow label="IVA" value={formatMoney(active.iva)} />
                  <InfoRow label="Total" value={formatMoney(active.total)} />
                  <InfoRow
                    label="Retención"
                    value={formatMoney(active.retention)}
                  />
                  {notesClean ? (
                    <>
                      <div className="my-2 border-t border-separator" />
                      <InfoRow label="Notas" value={notesClean} />
                    </>
                  ) : null}
                </div>
              ) : null}

              {tab === 1 ? (
                <div>
                  <p className="mb-2 text-sm font-bold">
                    Datos del {partyLabel.toLowerCase()}
                  </p>
                  <InfoRow label="Nombre" value={active.partyName} />
                  <InfoRow label="Cédula / RUC" value={active.partyIdent} />
                  <InfoRow label="Teléfono" value={active.partyPhone} />
                  <InfoRow label="Email" value={active.partyEmail} />
                  <InfoRow label="Dirección" value={active.partyAddress} />
                </div>
              ) : null}

              {tab === 2 ? (
                items.length === 0 ? (
                  <p className="text-sm text-muted">
                    Sin detalle de productos en este registro.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-separator text-muted">
                        <tr>
                          <th className="py-1.5 font-medium">Producto</th>
                          <th className="py-1.5 text-right font-medium">Cant.</th>
                          <th className="py-1.5 text-right font-medium">
                            P. unit.
                          </th>
                          <th className="py-1.5 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, i) => (
                          <tr
                            key={`${it.name}-${i}`}
                            className="border-b border-separator/40"
                          >
                            <td className="py-1.5 font-semibold">{it.name}</td>
                            <td className="py-1.5 text-right tabular-nums">
                              {it.quantity}
                            </td>
                            <td className="py-1.5 text-right tabular-nums">
                              {formatMoney(it.unitPrice)}
                            </td>
                            <td className="py-1.5 text-right tabular-nums">
                              {formatMoney(it.lineTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : null}

              {tab === 3 ? (
                <div>
                  <InfoRow
                    label="Efectivo"
                    value={formatMoney(active.cash)}
                  />
                  <InfoRow
                    label="Chq/Bco"
                    value={formatMoney(active.checkBank)}
                  />
                  <InfoRow
                    label="Tarjeta"
                    value={formatMoney(active.card)}
                  />
                  <InfoRow label="Otros" value={formatMoney(active.other)} />
                  {active.paymentMethod ? (
                    <InfoRow label="Método" value={active.paymentMethod} />
                  ) : null}
                </div>
              ) : null}

              {tab === 4 ? (
                history.length === 0 ? (
                  <p className="text-sm text-muted">Sin historial.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {history.map((h) => (
                      <li key={`${h.partyKind}-${h.id}`}>
                        <button
                          type="button"
                          className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                            h.id === active.id
                              ? "border-accent/40 bg-accent/10"
                              : "border-separator hover:bg-surface-secondary"
                          }`}
                          onClick={() => setActive(h)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">
                              {h.emissionDate} · Nº{" "}
                              {h.invoiceNumber || h.numero || h.id}
                            </span>
                            <span className="tabular-nums font-bold">
                              {formatMoney(h.total)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-muted">{h.statusLabel}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
