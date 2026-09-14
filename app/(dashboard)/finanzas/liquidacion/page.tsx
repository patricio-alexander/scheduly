"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, toast, useOverlayState } from "@heroui/react";
import CircleDollar from "@gravity-ui/icons/CircleDollar";
import { PageHeader } from "@/shared/components/ui";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { SelectField } from "@/shared/components/SelectField";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { formatMoney } from "@/shared/utils/money";
import {
  paymentMethodLabel,
  paymentMethodOptions,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";
import {
  calcPayrollLineTotal,
  formatPeriodLabel,
} from "@/shared/utils/payroll-settings";
import { useAuth } from "@/src/features/auth";
import { isManagementRole, isOwnerRole } from "@/shared/utils/roles";
import { payPayrollWeekLine } from "@/src/features/payroll/services/payroll-service";
import NextLink from "next/link";

type Line = {
  id: number;
  accountId: number;
  employeeName: string;
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
  paidAt: string | null;
  paidAmount: number;
  paidMethod: string | null;
};

const ADJUST_FIELDS = [
  {
    key: "cafeteriaAmount",
    label: "Café",
    tone: "minus",
  },
  {
    key: "finesAmount",
    label: "Multas",
    tone: "minus",
  },
  {
    key: "discountsAmount",
    label: "Desc.",
    tone: "minus",
  },
  {
    key: "additionalAmount",
    label: "Adic.",
    tone: "plus",
  },
] as const;

function parseMoneyDraft(raw: string): number {
  const cleaned = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (cleaned === "" || cleaned === ".") return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function PayrollAdjustInput({
  value,
  onChange,
  ariaLabel,
  tone,
}: {
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  tone: "minus" | "plus";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editing]);

  const finish = () => {
    onChange(parseMoneyDraft(draft));
    setEditing(false);
  };

  const toneClass = value > 0 ? ` liq-adj--${tone}` : "";

  if (!editing) {
    return (
      <button
        type="button"
        className={`liq-adj${toneClass}`}
        aria-label={ariaLabel}
        onClick={() => {
          setDraft(value ? String(value) : "");
          setEditing(true);
        }}
      >
        {formatMoney(value)}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      className={`liq-adj liq-adj--edit${toneClass}`}
      inputMode="decimal"
      aria-label={ariaLabel}
      value={draft}
      placeholder="0"
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !/^\d*[.,]?\d{0,2}$/.test(raw)) return;
        setDraft(raw);
        onChange(parseMoneyDraft(raw));
      }}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value ? String(value) : "");
          setEditing(false);
        }
      }}
    />
  );
}

type Week = {
  id: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  confirmedCount: number;
  paidCount: number;
  lineCount: number;
  grandTotal: number;
  lines: Line[];
};

export default function PayrollWeekPage() {
  const { user } = useAuth();
  const isOwner = isOwnerRole(user?.role);
  const canPay = isManagementRole(user?.role);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selected, setSelected] = useState<Week | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [allowAdmin, setAllowAdmin] = useState(false);
  const [weekStartLabel, setWeekStartLabel] = useState("Martes");
  const [currentPeriod, setCurrentPeriod] = useState<{
    start: string;
    end: string;
    exists: boolean;
    id: number | null;
  } | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);
  const deleteModal = useOverlayState();
  const [weekToDelete, setWeekToDelete] = useState<Week | null>(null);
  const payModal = useOverlayState();
  const [lineToPay, setLineToPay] = useState<Line | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethodValue>("transfer");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/finance/payroll-weeks"), {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as {
        weeks?: Week[];
        payrollAllowBranchAdmin?: boolean;
        payrollWeekStartLabel?: string;
        currentPeriod?: {
          start: string;
          end: string;
          exists: boolean;
          id: number | null;
        };
      };
      setWeeks(Array.isArray(json.weeks) ? json.weeks : []);
      setAllowAdmin(Boolean(json.payrollAllowBranchAdmin));
      if (json.payrollWeekStartLabel) {
        setWeekStartLabel(json.payrollWeekStartLabel);
      }
      setCurrentPeriod(json.currentPeriod ?? null);
    } catch {
      toast.danger("No se pudieron cargar liquidaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applyWeek = (w: Week) => {
    setSelected(w);
    setLines(
      Array.isArray(w.lines)
        ? [...w.lines]
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .map((l) => ({ ...l }))
        : [],
    );
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const openWeek = async (w: Week) => {
    applyWeek(w);
    try {
      const res = await fetch(apiUrl(`/api/finance/payroll-weeks/${w.id}`), {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const full = (await res.json()) as Week;
      if (full?.id) applyWeek(full);
    } catch {
      // ya mostramos la fila de la lista
    }
  };

  const todayKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const createWeek = async (weekOffset = 0) => {
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/finance/payroll-weeks"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayKey(), weekOffset }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        id?: number;
        alreadyExists?: boolean;
      } & Partial<Week>;
      if (!res.ok) {
        throw new Error(json.message || "No se pudo crear");
      }
      if (json.alreadyExists) {
        toast.success("Esa semana ya estaba armada · la abrimos");
      } else {
        toast.success("Liquidación creada con comisiones automáticas");
      }
      await load();
      if (json.id) {
        if (json.lines) applyWeek(json as Week);
        else await openWeek({ ...(json as Week), lines: json.lines ?? [] });
      }
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error");
    } finally {
      setPending(false);
    }
  };

  const saveLines = async () => {
    if (!selected) return;
    setPending(true);
    try {
      const res = await fetch(
        apiUrl(`/api/finance/payroll-weeks/${selected.id}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lines: lines.map((l) => ({
              id: l.id,
              producedAmount: l.producedAmount,
              salesAmount: l.salesAmount,
              vouchersAmount: l.vouchersAmount,
              cafeteriaAmount: l.cafeteriaAmount,
              finesAmount: l.finesAmount,
              discountsAmount: l.discountsAmount,
              additionalAmount: l.additionalAmount,
              notes: l.notes,
            })),
          }),
        },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || "Error");
      }
      const updated = (await res.json()) as Week;
      toast.success("Ajustes guardados");
      setSelected(updated);
      setLines(updated.lines.map((l) => ({ ...l })));
      await load();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setPending(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!selected) return;
    setPending(true);
    try {
      const res = await fetch(
        apiUrl(`/api/finance/payroll-weeks/${selected.id}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || "Error");
      }
      const updated = (await res.json()) as Week;
      toast.success(
        status === "published"
          ? "Publicada · los empleados ya pueden confirmar"
          : status === "closed"
            ? "Semana cerrada"
            : "Volvió a borrador",
      );
      setSelected(updated);
      setLines(updated.lines.map((l) => ({ ...l })));
      await load();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error");
    } finally {
      setPending(false);
    }
  };

  const canCreate = isOwner || allowAdmin;

  const askDelete = (w: Week) => {
    setWeekToDelete(w);
    deleteModal.open();
  };

  const deleteWeek = async () => {
    if (!weekToDelete) return;
    setPending(true);
    try {
      const res = await fetch(
        apiUrl(`/api/finance/payroll-weeks/${weekToDelete.id}`),
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || "Error");
      }
      toast.success("Liquidación borrada");
      if (selected?.id === weekToDelete.id) {
        setSelected(null);
        setLines([]);
      }
      setWeekToDelete(null);
      deleteModal.close();
      await load();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al borrar");
    } finally {
      setPending(false);
    }
  };

  const askPay = (line: Line) => {
    setLineToPay(line);
    setPayMethod("transfer");
    payModal.open();
  };

  const confirmPay = async () => {
    if (!selected || !lineToPay) return;
    setPending(true);
    try {
      const updated = (await payPayrollWeekLine({
        weekId: selected.id,
        lineId: lineToPay.id,
        method: payMethod,
      })) as Week;
      toast.success(`Pago confirmado · ${lineToPay.employeeName}`);
      payModal.close();
      setLineToPay(null);
      if (updated?.id) applyWeek(updated);
      await load();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al pagar");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sueldos / liquidación"
        description="Armá la semana, ajustá descuentos y confirmá el pago de cada empleado."
        icon={<CircleDollar className="size-5" />}
        action={
          <NextLink
            href={appRoutes.finance.payrollHistory}
            className="text-sm font-medium text-accent hover:underline"
          >
            Historial de pagos
          </NextLink>
        }
      />

      {currentPeriod ? (
        <p className="text-sm text-muted">
          La semana arranca el <strong>{weekStartLabel}</strong>. Hoy cae en{" "}
          <strong>
            {formatPeriodLabel(currentPeriod.start, currentPeriod.end)}
          </strong>
          {currentPeriod.exists
            ? " · ya está armada, no hace falta crear otra."
            : " · todavía no está armada."}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {canCreate ? (
          <>
            <Button
              isDisabled={pending}
              onPress={() => void createWeek(0)}
            >
              {currentPeriod?.exists
                ? `Abrir semana ${formatPeriodLabel(currentPeriod.start, currentPeriod.end)}`
                : currentPeriod
                  ? `Armar ${formatPeriodLabel(currentPeriod.start, currentPeriod.end)}`
                  : "Armar semana actual"}
            </Button>
            {currentPeriod?.exists ? (
              <Button
                variant="secondary"
                isDisabled={pending}
                onPress={() => void createWeek(1)}
              >
                Armar semana siguiente
              </Button>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted">
            Solo la dueña arma la liquidación (opción de admin deshabilitada).
          </p>
        )}
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-surface-secondary" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-separator">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-secondary text-muted">
              <tr>
                <th className="px-3 py-2">Semana</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Confirmados</th>
                <th className="px-3 py-2">Pagados</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.id} className="border-t border-separator">
                  <td className="px-3 py-2">
                    {w.periodStart} → {w.periodEnd}
                  </td>
                  <td className="px-3 py-2">{w.status}</td>
                  <td className="px-3 py-2">
                    {w.confirmedCount}/{w.lineCount}
                  </td>
                  <td className="px-3 py-2">
                    {w.paidCount ?? 0}/{w.lineCount}
                  </td>
                  <td className="px-3 py-2">{formatMoney(w.grandTotal)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => void openWeek(w)}
                      >
                        Abrir
                      </Button>
                      {canCreate ? (
                        <Button
                          size="sm"
                          variant="danger"
                          isDisabled={pending}
                          onPress={() => askDelete(w)}
                        >
                          Borrar
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {weeks.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted" colSpan={6}>
                    Todavía no hay liquidaciones.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <div
          ref={detailRef}
          className="flex flex-col gap-4 rounded-2xl border border-separator bg-surface p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selected.periodStart} → {selected.periodEnd}
              </h2>
              <p className="text-sm text-muted">
                Estado: {selected.status} · Confirmados{" "}
                {selected.confirmedCount}/{selected.lineCount}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.status === "draft" ? (
                <>
                  <Button
                    isDisabled={pending}
                    variant="secondary"
                    onPress={() => void saveLines()}
                  >
                    Guardar ajustes
                  </Button>
                  <Button
                    isDisabled={pending}
                    onPress={() => void setStatus("published")}
                  >
                    Publicar
                  </Button>
                </>
              ) : null}
              {selected.status === "published" ? (
                <Button
                  isDisabled={pending}
                  onPress={() => void setStatus("closed")}
                >
                  Cerrar semana
                </Button>
              ) : null}
              {selected.status === "closed" ? (
                <Button
                  isDisabled={pending}
                  variant="secondary"
                  onPress={() => void setStatus("draft")}
                >
                  Reabrir a borrador
                </Button>
              ) : null}
              {canCreate ? (
                <Button
                  isDisabled={pending}
                  variant="danger"
                  onPress={() => askDelete(selected)}
                >
                  Borrar
                </Button>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="liq-table min-w-full text-left text-xs sm:text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="px-2 py-1">Empleado</th>
                  <th className="px-2 py-1 text-right">Se</th>
                  <th className="px-2 py-1 text-right">Pr</th>
                  <th className="px-2 py-1 text-right">Vales</th>
                  <th className="px-2 py-1 text-right" title="Se resta">
                    Café
                  </th>
                  <th className="px-2 py-1 text-right" title="Se resta">
                    Multas
                  </th>
                  <th className="px-2 py-1 text-right" title="Se resta">
                    Desc.
                  </th>
                  <th className="px-2 py-1 text-right" title="Se suma">
                    Adic.
                  </th>
                  <th className="px-2 py-1 text-right">Total</th>
                  <th className="px-2 py-1 text-center">OK</th>
                  <th className="px-2 py-1 text-right">Pago</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.id} className="border-t border-separator">
                    <td className="px-2 py-1 whitespace-nowrap">
                      {l.employeeName}
                    </td>
                    {(
                      [
                        "producedAmount",
                        "salesAmount",
                        "vouchersAmount",
                      ] as const
                    ).map((key) => (
                      <td
                        key={key}
                        className="px-2 py-1 text-right tabular-nums"
                      >
                        {formatMoney(l[key])}
                      </td>
                    ))}
                    {ADJUST_FIELDS.map((field) => (
                      <td key={field.key} className="px-2 py-1">
                        {selected.status === "draft" && !l.paidAt ? (
                          <PayrollAdjustInput
                            value={l[field.key]}
                            tone={field.tone}
                            ariaLabel={`${field.label} de ${l.employeeName}`}
                            onChange={(v) =>
                              setLines((prev) =>
                                prev.map((row, i) => {
                                  if (i !== idx) return row;
                                  const next = { ...row, [field.key]: v };
                                  return {
                                    ...next,
                                    totalAmount: calcPayrollLineTotal(next),
                                  };
                                }),
                              )
                            }
                          />
                        ) : (
                          <span
                            className={`block text-right tabular-nums ${
                              field.tone === "minus" && l[field.key] > 0
                                ? "text-danger"
                                : field.tone === "plus" && l[field.key] > 0
                                  ? "text-success"
                                  : ""
                            }`}
                          >
                            {formatMoney(l[field.key])}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right font-medium tabular-nums">
                      {formatMoney(l.totalAmount)}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {l.employeeConfirmedAt ? "✓" : "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {l.paidAt ? (
                        <span
                          className="text-success"
                          title={
                            l.paidMethod
                              ? paymentMethodLabel[
                                  l.paidMethod as PaymentMethodValue
                                ] ?? l.paidMethod
                              : undefined
                          }
                        >
                          Pagado
                        </span>
                      ) : canPay && l.totalAmount > 0 ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          isDisabled={pending}
                          onPress={() => askPay(l)}
                        >
                          Confirmar pago
                        </Button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        state={deleteModal}
        title="Borrar liquidación"
        description={
          weekToDelete
            ? `Se elimina ${weekToDelete.periodStart} → ${weekToDelete.periodEnd} y todas las líneas. Después podés armar esa semana de nuevo.`
            : "Se elimina la liquidación y todas las líneas."
        }
        confirmLabel="Borrar"
        confirmVariant="danger"
        status="danger"
        pending={pending}
        onConfirm={() => void deleteWeek()}
      />

      <ConfirmDialog
        state={payModal}
        title="Confirmar pago"
        description={
          lineToPay ? (
            <div className="flex flex-col gap-3">
              <p>
                Se registra {formatMoney(lineToPay.totalAmount)} a{" "}
                <strong>{lineToPay.employeeName}</strong>.
              </p>
              <SelectField
                label="Método"
                selectedKey={payMethod}
                onSelectionChange={(key) =>
                  setPayMethod((key as PaymentMethodValue) ?? "transfer")
                }
                options={paymentMethodOptions.map((option) => ({
                  id: option,
                  label: paymentMethodLabel[option],
                }))}
                className="w-full"
              />
            </div>
          ) : (
            "Confirmar el pago de esta liquidación."
          )
        }
        confirmLabel="Confirmar pago"
        pending={pending}
        onConfirm={() => void confirmPay()}
      />
    </div>
  );
}
