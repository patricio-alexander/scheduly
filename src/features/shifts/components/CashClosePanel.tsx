"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, toast } from "@heroui/react";
import CircleCheck from "@gravity-ui/icons/CircleCheck";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { toDateKey } from "@/shared/utils/payroll-settings";
import { useAuth } from "@/src/features/auth";
import { isOwnerRole } from "@/shared/utils/roles";

type Medium = { id: number; name: string; kind: string };
type CloseLine = { paymentMediumId: number; amount: number };
type Branch = { id: number; name: string };

function moneyEq(a: number, b: number) {
  return Math.abs(Number(a || 0) - Number(b || 0)) < 0.01;
}

export function CashClosePanel({
  date: dateProp,
  branchId: branchIdProp,
  suggestedLines,
  suggestedExpenses = 0,
  openingCash = 0,
  salesCash = 0,
  cashIn = 0,
  expectedCash,
  countedCash,
}: {
  date?: string;
  branchId?: number | null;
  suggestedLines?: Array<{ id: number; amount: number; kind?: string }>;
  suggestedExpenses?: number;
  openingCash?: number;
  salesCash?: number;
  cashIn?: number;
  expectedCash?: number;
  countedCash?: number | null;
} = {}) {
  const { user } = useAuth();
  const isOwner = isOwnerRole(user?.role);
  const [date, setDate] = useState(dateProp ?? toDateKey(new Date()));

  useEffect(() => {
    if (dateProp) setDate(dateProp);
  }, [dateProp]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | "">(
    branchIdProp ?? "",
  );

  useEffect(() => {
    if (branchIdProp) setBranchId(branchIdProp);
  }, [branchIdProp]);
  const [media, setMedia] = useState<Medium[]>([]);
  const [amounts, setAmounts] = useState<Record<number, number>>({});
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isOwner || branchIdProp) return;
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
  }, [isOwner, branchIdProp]);

  const suggestedKey = useMemo(
    () =>
      `${(suggestedLines ?? [])
        .map((line) => `${line.id}:${Number(line.amount || 0)}`)
        .join("|")}::${Number(suggestedExpenses || 0)}::${Number(expectedCash || 0)}::${Number(countedCash ?? -1)}`,
    [suggestedLines, suggestedExpenses, expectedCash, countedCash],
  );

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
        suggested?: {
          lines?: Array<{ paymentMediumId: number; amount: number }>;
        } | null;
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
        const fromDaily = Array.isArray(suggestedLines) ? suggestedLines : [];
        for (const line of fromDaily) {
          next[line.id] = line.amount;
        }
        const fromApi = json.suggested?.lines ?? [];
        if (fromDaily.length === 0) {
          for (const line of fromApi) {
            next[line.paymentMediumId] = line.amount;
          }
        }
        setExpensesTotal(suggestedExpenses || 0);
        setNotes("");
        const cash = list.find(
          (medium) => String(medium.kind).toLowerCase() === "cash",
        );
        if (cash) {
          const expected = Number(
            expectedCash ??
              Math.round(
                (openingCash +
                  salesCash -
                  Number(suggestedExpenses || 0) +
                  cashIn) *
                  100,
              ) / 100,
          );
          next[cash.id] =
            countedCash != null ? Number(countedCash) : expected;
        }
      }
      setAmounts(next);
    } catch {
      toast.danger("No se pudo cargar el cuadre");
    } finally {
      setLoading(false);
    }
  }, [
    branchId,
    countedCash,
    date,
    expectedCash,
    isOwner,
    openingCash,
    cashIn,
    salesCash,
    suggestedExpenses,
    suggestedKey,
    suggestedLines,
  ]);

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
  const drawerExpected = Number(
    expectedCash ??
      Math.round(
        (openingCash + salesCash - Number(suggestedExpenses || 0) + cashIn) *
          100,
      ) / 100,
  );
  const cashMedium = media.find(
    (medium) => String(medium.kind).toLowerCase() === "cash",
  );
  const cashAmount = cashMedium ? Number(amounts[cashMedium.id] ?? 0) : null;
  const cashDiff =
    cashAmount == null ? 0 : Number((cashAmount - drawerExpected).toFixed(2));
  const expensesOk = moneyEq(expensesTotal, suggestedExpenses);
  const cashSuggested =
    suggestedLines?.find((line) => line.id === cashMedium?.id)?.amount ?? null;
  const cashMatchesCounted =
    cashAmount != null &&
    countedCash != null &&
    moneyEq(cashAmount, countedCash);
  const cashMatchesExpected =
    cashAmount != null && moneyEq(cashAmount, drawerExpected);
  const cashMatchesSuggested =
    cashAmount != null &&
    cashSuggested != null &&
    moneyEq(cashAmount, cashSuggested);
  const cashLineOk =
    cashMatchesExpected || cashMatchesCounted || cashMatchesSuggested;
  const cashOk = cashMatchesExpected;
  const suggestedOk = (suggestedLines ?? []).every((line) => {
    const medium = media.find((item) => item.id === line.id);
    if (medium && String(medium.kind).toLowerCase() === "cash") return true;
    return moneyEq(amounts[line.id] ?? 0, line.amount);
  });
  const isSquared =
    !loading &&
    media.length > 0 &&
    cashOk &&
    expensesOk &&
    (suggestedLines == null || suggestedLines.length === 0 || suggestedOk);
  const statusTone = isSquared
    ? "success"
    : cashAmount == null || drawerExpected <= 0
      ? "neutral"
      : cashDiff > 0
        ? "warning"
        : "danger";
  const statusLabel = isSquared
    ? "Cuadrado"
    : statusTone === "neutral"
      ? "Pendiente"
      : cashDiff > 0
        ? `Sobra ${formatMoney(cashDiff)}`
        : `Falta ${formatMoney(Math.abs(cashDiff))}`;

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
    <section
      className={`rounded-2xl border p-4 ${
        isSquared
          ? "border-success/40 bg-success/5"
          : "border-separator bg-surface"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold">Cuadre del día</h2>
            {!loading ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  statusTone === "success"
                    ? "bg-success/15 text-success"
                    : statusTone === "warning"
                      ? "bg-warning/15 text-warning"
                      : statusTone === "danger"
                        ? "bg-danger/15 text-danger"
                        : "bg-surface-secondary text-muted"
                }`}
              >
                {statusTone === "success" ? (
                  <CircleCheck width={12} height={12} />
                ) : null}
                {statusLabel}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted">
            Efectivo = apertura + cobros − gastos. Bancos = saldo inicial +
            cobros.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {dateProp ? (
            <p className="self-center text-xs text-muted">{date}</p>
          ) : (
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted">Fecha</span>
              <input
                type="date"
                className="rounded-lg border border-separator bg-field-background px-2 py-1.5 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          )}
          {isOwner && !branchIdProp ? (
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted">Sucursal</span>
              <select
                className="rounded-lg border border-separator bg-field-background px-2 py-1.5 text-sm"
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
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-surface-secondary" />
      ) : (
        <>
          <p className="cash-formula mb-2">
            <span>Efectivo {formatMoney(openingCash)}</span>
            <span aria-hidden>+</span>
            <span>cobros {formatMoney(salesCash)}</span>
            <span aria-hidden>−</span>
            <span>gastos {formatMoney(suggestedExpenses)}</span>
            {cashIn > 0 ? (
              <>
                <span aria-hidden>+</span>
                <span>entradas {formatMoney(cashIn)}</span>
              </>
            ) : null}
            <span aria-hidden>=</span>
            <span
              className={`font-semibold ${
                isSquared ? "text-success" : "text-warning"
              }`}
            >
              esperado {formatMoney(drawerExpected)}
            </span>
            {countedCash != null ? (
              <>
                <span aria-hidden>·</span>
                <span
                  className={`font-semibold ${
                    moneyEq(countedCash, drawerExpected)
                      ? "text-success"
                      : "text-accent"
                  }`}
                >
                  contado {formatMoney(countedCash)}
                </span>
              </>
            ) : null}
          </p>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((m) => {
              const isCash = String(m.kind).toLowerCase() === "cash";
              const suggested = suggestedLines?.find((line) => line.id === m.id);
              const lineOk = isCash
                ? cashLineOk
                : suggested
                  ? moneyEq(amounts[m.id] ?? 0, suggested.amount)
                  : true;
              return (
                <label
                  key={m.id}
                  className={`flex flex-col gap-1 rounded-xl border px-2.5 py-2 text-sm ${
                    lineOk
                      ? "border-success/35 bg-success/5"
                      : "border-separator bg-surface-secondary/40"
                  }`}
                >
                  <span className="text-xs">
                    {m.name}
                    {isCash ? (
                      <span className="ml-1 text-muted">
                        {countedCash != null ? "contado" : "esperado"}
                      </span>
                    ) : null}
                    {lineOk ? (
                      <span className="ml-1 text-success">ok</span>
                    ) : null}
                  </span>
                  <AppNumberField
                    value={amounts[m.id] ?? 0}
                    onChange={(v) =>
                      setAmounts((prev) => ({ ...prev, [m.id]: v ?? 0 }))
                    }
                    minValue={0}
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex min-w-[9rem] flex-col gap-1 text-xs">
              <span className="text-muted">Gastos del día</span>
              <AppNumberField
                value={expensesTotal}
                onChange={(v) => setExpensesTotal(v ?? 0)}
                minValue={0}
              />
            </label>
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
              <span className="text-muted">Notas</span>
              <input
                className="rounded-lg border border-separator bg-field-background px-2 py-1.5 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <p
                className={`text-xs ${
                  isSquared ? "font-semibold text-success" : "text-muted"
                }`}
              >
                {isSquared
                  ? "Todo cuadra"
                  : `Suma ${formatMoney(linesTotal)}${
                      cashAmount != null
                        ? ` · vs esperado ${formatMoney(cashDiff)}`
                        : ""
                    }`}
              </p>
              <Button
                size="sm"
                isDisabled={pending || (isOwner && !branchId)}
                onPress={() => void save()}
              >
                Guardar cuadre
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
