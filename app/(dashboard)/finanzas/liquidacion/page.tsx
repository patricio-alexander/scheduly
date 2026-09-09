"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, toast } from "@heroui/react";
import CircleDollar from "@gravity-ui/icons/CircleDollar";
import { PageHeader } from "@/shared/components/ui";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { calcPayrollLineTotal } from "@/shared/utils/payroll-settings";
import { useAuth } from "@/src/features/auth";
import { isOwnerRole } from "@/shared/utils/roles";

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
};

type Week = {
  id: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  confirmedCount: number;
  lineCount: number;
  grandTotal: number;
  lines: Line[];
};

export default function PayrollWeekPage() {
  const { user } = useAuth();
  const isOwner = isOwnerRole(user?.role);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selected, setSelected] = useState<Week | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [allowAdmin, setAllowAdmin] = useState(false);

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
      };
      setWeeks(Array.isArray(json.weeks) ? json.weeks : []);
      setAllowAdmin(Boolean(json.payrollAllowBranchAdmin));
    } catch {
      toast.danger("No se pudieron cargar liquidaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openWeek = (w: Week) => {
    setSelected(w);
    setLines(w.lines.map((l) => ({ ...l })));
  };

  const createWeek = async () => {
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/finance/payroll-weeks"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        id?: number;
      } & Partial<Week>;
      if (!res.ok) {
        throw new Error(json.message || "No se pudo crear");
      }
      toast.success("Liquidación creada con comisiones automáticas");
      await load();
      if (json.id && json.lines) openWeek(json as Week);
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Liquidación semanal"
        description="Pago semanal híbrido: comisiones auto (Se/Pr) + ajustes (vales, multas, etc.). El empleado confirma con un check."
        icon={<CircleDollar className="size-5" />}
      />

      <div className="flex flex-wrap items-center gap-3">
        {canCreate ? (
          <Button isDisabled={pending} onPress={() => void createWeek()}>
            Armar semana actual
          </Button>
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
                  <td className="px-3 py-2">{formatMoney(w.grandTotal)}</td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => openWeek(w)}
                    >
                      Abrir
                    </Button>
                  </td>
                </tr>
              ))}
              {weeks.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted" colSpan={5}>
                    Todavía no hay liquidaciones.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-separator bg-surface p-4">
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
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="px-2 py-1">Empleado</th>
                  <th className="px-2 py-1">Se</th>
                  <th className="px-2 py-1">Pr</th>
                  <th className="px-2 py-1">Vales</th>
                  <th className="px-2 py-1">Café</th>
                  <th className="px-2 py-1">Multas</th>
                  <th className="px-2 py-1">Desc.</th>
                  <th className="px-2 py-1">Adic.</th>
                  <th className="px-2 py-1">Total</th>
                  <th className="px-2 py-1">OK</th>
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
                        "cafeteriaAmount",
                        "finesAmount",
                        "discountsAmount",
                        "additionalAmount",
                      ] as const
                    ).map((key) => (
                      <td key={key} className="px-1 py-1">
                        {selected.status === "draft" ? (
                          <AppNumberField
                            value={l[key]}
                            onChange={(v) =>
                              setLines((prev) =>
                                prev.map((row, i) => {
                                  if (i !== idx) return row;
                                  const next = { ...row, [key]: v };
                                  return {
                                    ...next,
                                    totalAmount: calcPayrollLineTotal(next),
                                  };
                                }),
                              )
                            }
                            minValue={0}
                          />
                        ) : (
                          formatMoney(l[key])
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-1 font-medium">
                      {formatMoney(l.totalAmount)}
                    </td>
                    <td className="px-2 py-1">
                      {l.employeeConfirmedAt ? "✓" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
