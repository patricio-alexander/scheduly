"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, toast } from "@heroui/react";
import Receipt from "@gravity-ui/icons/Receipt";
import { PageHeader } from "@/shared/components/ui";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { toDateKey } from "@/shared/utils/payroll-settings";
import { useAuth } from "@/src/features/auth";
import { isOwnerRole } from "@/shared/utils/roles";

type Medium = { id: number; name: string; kind: string };
type CloseLine = { paymentMediumId: number; amount: number };
type Branch = { id: number; name: string };

export default function CashClosePage() {
  const { user } = useAuth();
  const isOwner = isOwnerRole(user?.role);
  const [date, setDate] = useState(toDateKey(new Date()));
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | "">("");
  const [media, setMedia] = useState<Medium[]>([]);
  const [amounts, setAmounts] = useState<Record<number, number>>({});
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isOwner) return;
    void fetch(apiUrl("/api/branches"), { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as unknown;
        const list = Array.isArray(json)
          ? (json as Branch[])
          : Array.isArray((json as { branches?: Branch[] }).branches)
            ? (json as { branches: Branch[] }).branches
            : [];
        setBranches(list.map((b) => ({ id: b.id, name: b.name })));
        if (list[0]?.id) setBranchId(list[0].id);
      })
      .catch(() => undefined);
  }, [isOwner]);

  const load = useCallback(async () => {
    if (isOwner && !branchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams({ date });
      if (branchId) qs.set("branchId", String(branchId));
      const res = await fetch(apiUrl(`/api/finance/cash-closes?${qs}`), {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as {
        media?: Medium[];
        closes?: Array<{
          expensesTotal: number;
          notes: string | null;
          lines: CloseLine[];
        }>;
      };
      const list = Array.isArray(json.media) ? json.media : [];
      setMedia(list);
      const close = json.closes?.[0];
      const next: Record<number, number> = {};
      for (const m of list) next[m.id] = 0;
      if (close) {
        for (const line of close.lines) {
          next[line.paymentMediumId] = line.amount;
        }
        setExpensesTotal(close.expensesTotal || 0);
        setNotes(close.notes || "");
      } else {
        setExpensesTotal(0);
        setNotes("");
      }
      setAmounts(next);
    } catch {
      toast.danger("No se pudo cargar el cuadre");
    } finally {
      setLoading(false);
    }
  }, [branchId, date, isOwner]);

  useEffect(() => {
    void load();
  }, [load]);

  const linesTotal = useMemo(
    () =>
      Math.round(
        Object.values(amounts).reduce((s, n) => s + (Number(n) || 0), 0) * 100,
      ) / 100,
    [amounts],
  );

  const save = async () => {
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/finance/cash-closes"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          branchId: branchId || undefined,
          expensesTotal,
          notes,
          lines: Object.entries(amounts).map(([paymentMediumId, amount]) => ({
            paymentMediumId: Number(paymentMediumId),
            amount,
          })),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || "Error");
      }
      toast.success("Cuadre guardado");
      await load();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cuadre de caja"
        description="Cierre diario por medio de pago (efectivo, bancos, vales) y gastos del día."
        icon={<Receipt className="size-5" />}
      />

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Fecha</span>
          <input
            type="date"
            className="rounded-lg border border-separator bg-field-background px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        {isOwner ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Sucursal</span>
            <select
              className="rounded-lg border border-separator bg-field-background px-3 py-2"
              value={branchId === "" ? "" : String(branchId)}
              onChange={(e) =>
                setBranchId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Elegir…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-surface-secondary" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((m) => (
              <label
                key={m.id}
                className="flex flex-col gap-1 rounded-xl border border-separator bg-surface p-3 text-sm"
              >
                <span>{m.name}</span>
                <AppNumberField
                  value={amounts[m.id] ?? 0}
                  onChange={(v) =>
                    setAmounts((prev) => ({ ...prev, [m.id]: v }))
                  }
                  minValue={0}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 rounded-2xl border border-separator bg-surface p-4">
            <label className="flex min-w-[10rem] flex-col gap-1 text-sm">
              <span className="text-muted">Gastos del día</span>
              <AppNumberField
                value={expensesTotal}
                onChange={setExpensesTotal}
                minValue={0}
              />
            </label>
            <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm">
              <span className="text-muted">Notas</span>
              <input
                className="rounded-lg border border-separator bg-field-background px-3 py-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted">
              Ingresos {formatMoney(linesTotal)} · Neto{" "}
              {formatMoney(linesTotal - expensesTotal)}
            </div>
            <Button
              isDisabled={pending || (isOwner && !branchId)}
              onPress={() => void save()}
            >
              Guardar cuadre
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
