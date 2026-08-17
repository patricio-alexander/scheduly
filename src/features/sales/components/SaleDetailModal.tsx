"use client";

import type { ReactNode } from "react";
import { Button, Modal } from "@heroui/react";
import Receipt from "@gravity-ui/icons/Receipt";
import { StatusChip } from "@/shared/components/StatusChip";
import { formatMoney, lineTotal } from "@/shared/utils/money";
import { paymentMethodLabel } from "@/shared/utils/payment-methods";
import type { SaleRecord } from "../types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground sm:text-right">{value}</dd>
    </div>
  );
}

function serviceCommissionAmount(
  servicePrice: number,
  commissionPct: number,
  servicesSubtotal: number,
  productsSubtotal: number,
  paidAmount: number,
) {
  const total = servicesSubtotal + productsSubtotal;
  const scale = total > 0 ? paidAmount / total : 1;
  return Math.round(servicePrice * (commissionPct / 100) * scale * 100) / 100;
}

export function SaleDetailBody({ sale }: { sale: SaleRecord }) {
  const servicesSubtotal = sale.services.reduce((sum, item) => sum + item.price, 0);
  const productsSubtotal = sale.products.reduce(
    (sum, item) => sum + lineTotal(item.price, item.quantity),
    0,
  );
  const catalogTotal = servicesSubtotal + productsSubtotal;
  const commission = sale.commission;
  const netBusiness =
    commission != null ? Math.max(0, sale.amount - commission.amount) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-secondary/60 px-4 py-3">
        <div>
          <p className="text-xs text-muted">Total cobrado</p>
          <p className="text-2xl font-bold tabular-nums text-accent">
            {formatMoney(sale.amount)}
          </p>
        </div>
        <StatusChip status={sale.status} size="sm" />
      </div>

      <dl className="flex flex-col gap-3">
        <DetailRow label="Cliente" value={sale.customer.name} />
        <DetailRow label="Estilista" value={sale.staff.name} />
        {sale.branch ? (
          <DetailRow label="Sucursal" value={sale.branch.name} />
        ) : null}
        <DetailRow label="Turno" value={formatDateTime(sale.appointmentDate)} />
        <DetailRow label="Cobro registrado" value={formatDateTime(sale.paidAt)} />
        <DetailRow
          label="Método de pago"
          value={paymentMethodLabel[sale.method]}
        />
      </dl>

      {sale.description ? (
        <div className="rounded-xl border border-separator px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Notas del turno
          </p>
          <p className="mt-1 text-sm text-foreground">{sale.description}</p>
        </div>
      ) : null}

      {(sale.services.length > 0 || sale.products.length > 0) && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Desglose</p>
          {sale.services.length > 0 ? (
            <ul className="divide-y divide-separator rounded-xl border border-separator">
              {sale.services.map((service) => {
                const lineCommission = serviceCommissionAmount(
                  service.price,
                  service.commissionPct,
                  servicesSubtotal,
                  productsSubtotal,
                  sale.amount,
                );
                return (
                <li
                  key={service.id}
                  className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <span>{service.name}</span>
                    <p className="mt-0.5 text-xs text-muted">
                      Comisión {service.commissionPct}% · {formatMoney(lineCommission)}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums font-medium">
                    {formatMoney(service.price)}
                  </span>
                </li>
                );
              })}
            </ul>
          ) : null}
          {sale.products.length > 0 ? (
            <ul className="divide-y divide-separator rounded-xl border border-separator">
              {sale.products.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <span>
                    {product.name}
                    {product.quantity > 1 ? ` ×${product.quantity}` : ""}
                  </span>
                  <span className="shrink-0 tabular-nums font-medium">
                    {formatMoney(lineTotal(product.price, product.quantity))}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-col gap-1 rounded-xl bg-surface-secondary/50 px-3 py-2.5 text-sm">
            {sale.services.length > 0 ? (
              <div className="flex justify-between text-muted">
                <span>Servicios</span>
                <span className="tabular-nums">{formatMoney(servicesSubtotal)}</span>
              </div>
            ) : null}
            {sale.products.length > 0 ? (
              <div className="flex justify-between text-muted">
                <span>Productos</span>
                <span className="tabular-nums">{formatMoney(productsSubtotal)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-separator pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(sale.amount)}</span>
            </div>
            {commission ? (
              <>
                <div className="flex justify-between pt-2 text-muted">
                  <span>Comisión {sale.staff.name}</span>
                  <span className="tabular-nums text-warning">
                    −{formatMoney(commission.amount)}
                    {commission.ratePct > 0 ? (
                      <span className="ml-1 text-xs">({commission.ratePct}%)</span>
                    ) : null}
                  </span>
                </div>
                {netBusiness != null ? (
                  <div className="flex justify-between border-t border-separator pt-2 font-semibold">
                    <span>Neto negocio</span>
                    <span className="tabular-nums">{formatMoney(netBusiness)}</span>
                  </div>
                ) : null}
              </>
            ) : sale.services.length > 0 && catalogTotal > 0 ? (
              <p className="pt-2 text-xs text-muted">
                Las comisiones se calculan sobre servicios al registrar el cobro.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {sale.notes ? (
        <div className="rounded-xl border border-separator px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Notas del cobro
          </p>
          <p className="mt-1 text-sm text-foreground">{sale.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

export function SaleDetailModal({
  sale,
  modal,
  onClose,
}: {
  sale: SaleRecord | null;
  modal: ReturnType<typeof import("@heroui/react").useOverlayState>;
  onClose: () => void;
}) {
  return (
    <Modal state={modal}>
      <Modal.Backdrop isDismissable>
        <Modal.Container placement="center" size="lg" scroll="inside">
          <Modal.Dialog className="!max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon>
                <Receipt width={20} height={20} />
              </Modal.Icon>
              <Modal.Heading>{sale?.title ?? "Detalle del turno"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>{sale ? <SaleDetailBody sale={sale} /> : null}</Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Cerrar
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
