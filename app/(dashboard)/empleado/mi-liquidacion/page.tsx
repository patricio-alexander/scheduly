"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, toast } from "@heroui/react";
import CircleCheck from "@gravity-ui/icons/CircleCheck";
import CircleDollar from "@gravity-ui/icons/CircleDollar";
import { PageHeader } from "@/shared/components/ui";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";

type MyLine = {
  id: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  branchName: string | null;
  producedAmount: number;
  salesAmount: number;
  vouchersAmount: number;
  cafeteriaAmount: number;
  finesAmount: number;
  discountsAmount: number;
  additionalAmount: number;
  totalAmount: number;
  notes: string | null;
  employeeConfirmedAt: string | null;
  employeePaidAckAt: string | null;
  paidAt: string | null;
};

export default function MyPayrollPage() {
  const [lines, setLines] = useState<MyLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/finance/my-payroll"), {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as { lines?: MyLine[] };
      setLines(Array.isArray(json.lines) ? json.lines : []);
    } catch {
      toast.danger("No se pudo cargar tu liquidación");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const postAction = async (lineId: number, action: "confirm" | "ack-paid") => {
    const msg =
      action === "confirm"
        ? "¿Confirmás que revisaste lo producido, comisiones y descuentos? Con esto pueden proceder a pagarte."
        : "¿Confirmás que ya recibiste el pago de esta liquidación?";
    if (!window.confirm(msg)) return;
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/finance/my-payroll"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineId, action }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || "Error");
      }
      toast.success(
        action === "confirm"
          ? "Valores aceptados"
          : "Pago verificado",
      );
      await load();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al confirmar");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mi liquidación"
        description="Revisá lo generado y tus comisiones. Primero aceptá los valores; cuando te paguen, confirmá el cobro."
        icon={<CircleDollar className="size-5" />}
      />

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-surface-secondary" />
      ) : lines.length === 0 ? (
        <p className="text-sm text-muted">
          Cuando la dueña publique el pago semanal, aparecerá aquí.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {lines.map((l) => {
            const canAckPaid =
              Boolean(l.employeeConfirmedAt) &&
              (Boolean(l.paidAt) || l.status === "closed") &&
              !l.employeePaidAckAt;

            return (
              <div
                key={l.id}
                className="rounded-2xl border border-separator bg-surface p-4"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">
                      {l.periodStart} → {l.periodEnd}
                    </h2>
                    <p className="text-sm text-muted">
                      {l.branchName || "Sin sucursal"} · {l.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {formatMoney(l.totalAmount)}
                    </div>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-muted">Servicios (Se)</dt>
                    <dd>{formatMoney(l.producedAmount)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Productos (Pr)</dt>
                    <dd>{formatMoney(l.salesAmount)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Vales</dt>
                    <dd>{formatMoney(l.vouchersAmount)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Cafetería</dt>
                    <dd>{formatMoney(l.cafeteriaAmount)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Multas</dt>
                    <dd>{formatMoney(l.finesAmount)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Descuentos</dt>
                    <dd>{formatMoney(l.discountsAmount)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Adicional</dt>
                    <dd>{formatMoney(l.additionalAmount)}</dd>
                  </div>
                </dl>

                {l.notes ? (
                  <p className="mt-2 text-sm text-muted">{l.notes}</p>
                ) : null}

                <div className="mt-4 flex flex-col gap-2 border-t border-separator pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-foreground">
                      1. Aceptar valores / comisiones
                    </span>
                    {l.employeeConfirmedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <CircleCheck width={14} height={14} />
                        Aceptado
                      </span>
                    ) : l.status === "published" ? (
                      <Button
                        size="sm"
                        isDisabled={pending}
                        onPress={() => void postAction(l.id, "confirm")}
                      >
                        Aceptar valores
                      </Button>
                    ) : (
                      <span className="text-xs text-muted">Pendiente de publicar</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-foreground">
                      2. Verificar que me pagaron
                    </span>
                    {l.employeePaidAckAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <CircleCheck width={14} height={14} />
                        Pagado confirmado
                      </span>
                    ) : canAckPaid ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        isDisabled={pending}
                        onPress={() => void postAction(l.id, "ack-paid")}
                      >
                        Confirmar cobro
                      </Button>
                    ) : l.employeeConfirmedAt ? (
                      <span className="text-xs text-muted">
                        Esperando pago de la dueña
                      </span>
                    ) : (
                      <span className="text-xs text-muted">
                        Primero aceptá los valores
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
