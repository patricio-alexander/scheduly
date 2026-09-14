"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import Play from "@gravity-ui/icons/Play";
import Lock from "@gravity-ui/icons/Lock";
import Plus from "@gravity-ui/icons/Plus";
import CircleCheck from "@gravity-ui/icons/CircleCheck";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { useAuth } from "@/src/features/auth";
import { useBranches } from "@/src/features/branches";
import { apiUrl } from "@/shared/utils/api";
import { appRoutes } from "@/shared/utils/app-routes";
import { formatMoney } from "@/shared/utils/money";
import { isManagementRole, isOwnerRole } from "@/shared/utils/roles";
import { useRouter } from "next/navigation";
import {
  CASH_BILLS,
  CASH_COINS,
  computeCashTotal,
  emptyCashCounts,
  mediaFromCounts,
  mediaTotalsSum,
  MOVEMENT_IN_CATEGORIES,
  MOVEMENT_OUT_CATEGORIES,
  type CashCountKey,
  type CashCountsForm,
} from "@/shared/utils/turno-cash";
import { CashClosePanel } from "./CashClosePanel";
import {
  ClosedShiftsRecap,
  type ClosedShiftSnapshot,
} from "./ClosedShiftsRecap";

type ActiveShift = {
  id: number;
  status: string;
  storeId: number | null;
  openedAt: string;
  openingCashTotal: number;
  openingCashCounts?: unknown;
  openingNotes: string | null;
  store: { id: number; name: string } | null;
  cashRegister: { id: number; name: string } | null;
  cashier: string;
  cashRegisters: Array<{ id: number; name: string }>;
  sales: {
    salesCash: number;
    salesTransfer: number;
    salesCard: number;
    salesTotal: number;
  };
  cashMovements: {
    cashOut: number;
    cashIn: number;
    items: Array<{
      id: number;
      direction: string;
      category: string | null;
      categoryLabel: string;
      amount: number;
      concept: string | null;
      createdAt: string;
    }>;
  };
  expectedCashTotal: number;
  orderCount: number;
};

function CashArqueoBlock({
  counts,
  onChange,
}: {
  counts: CashCountsForm;
  onChange: (key: CashCountKey, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted">Monedas</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CASH_COINS.map((d) => (
            <div key={d.key}>
              <Label className="mb-1 text-[10px]">{d.label}</Label>
              <Input
                inputMode="numeric"
                variant="secondary"
                value={counts[d.key]}
                onChange={(e) => onChange(d.key, e.target.value)}
                placeholder="0"
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted">Billetes</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CASH_BILLS.map((d) => (
            <div key={d.key}>
              <Label className="mb-1 text-[10px]">{d.label}</Label>
              <Input
                inputMode="numeric"
                variant="secondary"
                value={counts[d.key]}
                onChange={(e) => onChange(d.key, e.target.value)}
                placeholder="0"
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CloseStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "accent" | "success" | "danger" | "warning";
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-danger"
          : tone === "warning"
            ? "text-warning"
            : "";
  return (
    <div className="min-w-0 rounded-xl border border-separator bg-surface-secondary/40 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={`mt-0.5 text-lg font-extrabold tabular-nums ${toneClass}`}>
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] leading-tight text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function ShiftDesk({
  embedded = false,
  storeId: storeIdProp = null,
  panel = "full",
  closedShifts = [],
  onChanged,
}: {
  embedded?: boolean;
  storeId?: number | null;
  panel?: "full" | "apertura" | "cierre";
  closedShifts?: ClosedShiftSnapshot[];
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const { branches } = useBranches();
  const canArqueo = user ? isManagementRole(user.role) : false;
  const isOwner = user ? isOwnerRole(user.role) : false;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shift, setShift] = useState<ActiveShift | null>(null);

  const [openCounts, setOpenCounts] = useState(emptyCashCounts);
  const [openCashTotal, setOpenCashTotal] = useState("");
  const [openMediaTotals, setOpenMediaTotals] = useState<Record<number, number>>(
    {},
  );
  const [transferMedia, setTransferMedia] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [openNotes, setOpenNotes] = useState("");
  const [storeId, setStoreId] = useState<string>("");

  const [closeCounts, setCloseCounts] = useState(emptyCashCounts);
  const [closeCashTotal, setCloseCashTotal] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [justClosed, setJustClosed] = useState<ClosedShiftSnapshot | null>(
    null,
  );

  const [movDirection, setMovDirection] = useState<"out" | "in">("out");
  const [movCategory, setMovCategory] = useState("gasto_operativo");
  const [movAmount, setMovAmount] = useState<number | null>(null);
  const [movConcept, setMovConcept] = useState("");
  const [movSaving, setMovSaving] = useState(false);

  const openCashAmount = useMemo(
    () =>
      canArqueo
        ? computeCashTotal(openCounts)
        : Number(Number(openCashTotal || 0).toFixed(2)),
    [canArqueo, openCounts, openCashTotal],
  );
  const openTransferAmount = useMemo(
    () => mediaTotalsSum(openMediaTotals),
    [openMediaTotals],
  );
  const openTotal = useMemo(
    () => Number((openCashAmount + openTransferAmount).toFixed(2)),
    [openCashAmount, openTransferAmount],
  );

  const closeTotal = useMemo(
    () =>
      canArqueo
        ? computeCashTotal(closeCounts)
        : Number(Number(closeCashTotal || 0).toFixed(2)),
    [canArqueo, closeCounts, closeCashTotal],
  );

  const closeDiff = useMemo(() => {
    if (!shift) return 0;
    return Number((closeTotal - shift.expectedCashTotal).toFixed(2));
  }, [closeTotal, shift]);

  const openedTransferTotals = useMemo(
    () => mediaFromCounts(shift?.openingCashCounts),
    [shift],
  );

  const categories =
    movDirection === "out" ? MOVEMENT_OUT_CATEGORIES : MOVEMENT_IN_CATEGORIES;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/shifts/active"));
      if (!res.ok) throw new Error("No se pudo cargar el turno");
      const data = (await res.json()) as ActiveShift | null;
      setShift(data);
    } catch (err) {
      toast.danger(
        err instanceof Error ? err.message : "Error al cargar turno",
      );
      setShift(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransferMedia = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/finance/payment-media?active=1"), {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as {
        media?: Array<{ id: number; name: string; kind: string; position?: number }>;
      };
      const list = Array.isArray(json.media) ? json.media : [];
      setTransferMedia(
        list
          .filter((m) => String(m.kind).toLowerCase() === "transfer")
          .map((m) => ({ id: m.id, name: m.name })),
      );
    } catch {
      /* catálogo opcional */
    }
  }, []);

  useEffect(() => {
    void loadTransferMedia();
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadTransferMedia();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadTransferMedia]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (storeIdProp) {
      setStoreId(String(storeIdProp));
      return;
    }
    if (storeId) return;
    const main = branches.find((b) => b.isMain && b.isActive);
    const first = main ?? branches.find((b) => b.isActive);
    if (first) setStoreId(String(first.id));
  }, [branches, storeId, storeIdProp]);

  useEffect(() => {
    if (movDirection === "out") {
      setMovCategory("gasto_operativo");
    } else {
      setMovCategory("entrada");
    }
  }, [movDirection]);

  const handleOpen = async () => {
    if (openCashAmount <= 0 && openTransferAmount <= 0) {
      toast.danger("Indica el capital inicial (efectivo o transferencias)");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        notes: openNotes.trim() || undefined,
        storeId: storeId ? Number(storeId) : undefined,
        mediaTotals: openMediaTotals,
      };
      if (canArqueo) payload.cashCounts = openCounts;
      else payload.cashTotal = openCashAmount;

      const res = await fetch(apiUrl("/api/shifts/open"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as
        | ActiveShift
        | { message?: string }
        | null;
      if (!res.ok) {
        throw new Error(
          json && "message" in json && json.message
            ? json.message
            : "No se pudo abrir el turno",
        );
      }
      setShift(json as ActiveShift);
      setOpenCounts(emptyCashCounts());
      setOpenCashTotal("");
      setOpenMediaTotals({});
      setOpenNotes("");
      setCloseCounts(emptyCashCounts());
      toast.success("Turno abierto");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al abrir");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMovement = async () => {
    if (!shift) return;
    if (!movAmount || movAmount <= 0) {
      toast.danger("Indica el monto");
      return;
    }
    if (!movConcept.trim()) {
      toast.danger("Indica el concepto");
      return;
    }
    setMovSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/shifts/${shift.id}/movements`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: movDirection,
          category: movCategory,
          amount: movAmount,
          concept: movConcept.trim(),
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        message?: string;
        shift?: ActiveShift;
      } | null;
      if (!res.ok) {
        throw new Error(json?.message ?? "No se pudo registrar");
      }
      if (json?.shift) setShift(json.shift);
      setMovAmount(null);
      setMovConcept("");
      toast.success("Movimiento registrado");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error");
    } finally {
      setMovSaving(false);
    }
  };

  const handleClose = async () => {
    if (!shift) return;
    if (closeTotal <= 0) {
      toast.danger("Cuenta el efectivo del cierre");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        notes: closeNotes.trim() || undefined,
      };
      if (canArqueo) payload.cashCounts = closeCounts;
      else payload.cashTotal = closeTotal;

      const res = await fetch(apiUrl(`/api/shifts/${shift.id}/close`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as {
        message?: string;
        closedAt?: string | null;
        closingCashTotal?: number;
        expectedCashTotal?: number;
        cashDifference?: number | null;
        summary?: {
          opening?: number;
          salesCash?: number;
          cashOut?: number;
          cashIn?: number;
        };
      } | null;
      if (!res.ok) {
        throw new Error(json?.message ?? "No se pudo cerrar el turno");
      }
      toast.success("Turno cerrado");
      setJustClosed({
        id: shift.id,
        operatorName: shift.cashier,
        closedAt: json?.closedAt ?? new Date().toISOString(),
        openingCashOnDay: json?.summary?.opening ?? shift.openingCashTotal,
        expectedCashOnDay:
          json?.expectedCashTotal ?? shift.expectedCashTotal,
        closingCashOnDay:
          json?.expectedCashTotal ?? shift.expectedCashTotal,
        countedCashOnDay: json?.closingCashTotal ?? closeTotal,
        salesCashDay: json?.summary?.salesCash ?? shift.sales.salesCash,
        cashOutDay: json?.summary?.cashOut ?? shift.cashMovements.cashOut,
        cashInDay: json?.summary?.cashIn ?? shift.cashMovements.cashIn,
        cashDifference: json?.cashDifference ?? closeTotal - shift.expectedCashTotal,
        closingNotes: closeNotes.trim() || null,
      });
      setShift(null);
      setCloseCounts(emptyCashCounts());
      setCloseCashTotal("");
      setCloseNotes("");
      void load();
      onChanged?.();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al cerrar");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-separator bg-surface p-6 text-sm text-muted">
        Cargando turno…
      </div>
    );
  }

  if (panel === "cierre" && !shift) {
    const recapShifts =
      closedShifts.length > 0
        ? closedShifts
        : justClosed
          ? [justClosed]
          : [];
    if (recapShifts.length === 0) {
      return (
        <p className="py-3 text-center text-xs text-muted">
          No hay turno abierto. Cuando cierres caja, acá verás el contado.
        </p>
      );
    }
    return <ClosedShiftsRecap shifts={recapShifts} />;
  }

  const closeDiffTone =
    closeTotal <= 0
      ? undefined
      : closeDiff === 0
        ? "success"
        : closeDiff > 0
          ? "warning"
          : "danger";
  const closeDiffHint =
    closeTotal <= 0
      ? "Contá el efectivo"
      : closeDiff === 0
        ? "Cuadra"
        : closeDiff > 0
          ? "Sobra"
          : "Falta";

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3">
      {panel === "cierre" ? null : (
      <div className="flex flex-wrap items-center gap-2">
        {embedded ? null : (
          <h1 className="text-xl font-bold tracking-tight">Caja</h1>
        )}
        {embedded && panel !== "cierre" ? (
          <h2 className="text-sm font-bold">Apertura</h2>
        ) : null}
        {shift ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success">
            <CircleCheck width={12} height={12} />
            Abierto
          </span>
        ) : (
          <span className="rounded-full bg-surface-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted">
            Sin turno
          </span>
        )}
        {shift?.store?.name ? (
          <span className="text-xs text-muted">
            {shift.store.name}
            {shift.cashRegister ? ` · ${shift.cashRegister.name}` : ""}
            {` · ${shift.cashier}`}
          </span>
        ) : null}
        {canArqueo && !embedded ? (
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            onPress={() => router.push(appRoutes.operation.shiftSupervision)}
          >
            <ChartColumn width={14} height={14} />
            Supervisión por fecha
          </Button>
        ) : null}
      </div>
      )}

      {!shift ? (
        <section className="rounded-2xl border border-separator bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold">Apertura de caja</h2>
            <p className="text-xs text-muted">{user.name}</p>
          </div>

          {storeIdProp ? (
            <p className="mb-3 text-xs text-muted">
              Se abrirá en{" "}
              <strong>
                {branches.find((b) => String(b.id) === storeId)?.name ??
                  "la sucursal seleccionada"}
              </strong>
            </p>
          ) : (isOwner || branches.filter((b) => b.isActive).length > 1) &&
            branches.some((b) => b.isActive) ? (
            <div className="mb-3 max-w-sm">
              <ComboBox
                aria-label="Sucursal"
                selectedKey={storeId || null}
                onSelectionChange={(key) => setStoreId(key ? String(key) : "")}
                variant="secondary"
              >
                <Label>Sucursal</Label>
                <ComboBox.InputGroup>
                  <Input />
                  <ComboBox.Trigger />
                </ComboBox.InputGroup>
                <ComboBox.Popover>
                  <ListBox>
                    {branches
                      .filter((b) => b.isActive)
                      .map((b) => (
                        <ListBox.Item
                          key={b.id}
                          id={String(b.id)}
                          textValue={b.name}
                        >
                          {b.name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                  </ListBox>
                </ComboBox.Popover>
              </ComboBox>
            </div>
          ) : branches[0] ? (
            <p className="mb-3 text-xs text-muted">
              Se abrirá en{" "}
              <strong>
                {branches.find((b) => String(b.id) === storeId)?.name ??
                  branches[0].name}
              </strong>
            </p>
          ) : (
            <p className="mb-3 text-xs text-warning">
              No hay sucursal activa. Crea un local antes de abrir turno.
            </p>
          )}

          {canArqueo ? (
            <CashArqueoBlock
              counts={openCounts}
              onChange={(key, val) =>
                setOpenCounts((p) => ({ ...p, [key]: val }))
              }
            />
          ) : (
            <div className="mb-3 max-w-xs">
              <AppNumberField
                label="Total en efectivo (apertura)"
                value={openCashTotal === "" ? null : Number(openCashTotal)}
                minValue={0}
                step={0.01}
                onChange={(v) => setOpenCashTotal(String(v))}
              />
            </div>
          )}

          {transferMedia.length > 0 ? (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold text-muted">
                Transferencias / bancos
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {transferMedia.map((medium) => (
                  <div
                    key={medium.id}
                    className="rounded-xl border border-separator bg-surface-secondary/40 px-2.5 py-2"
                  >
                    <AppNumberField
                      label={medium.name}
                      value={openMediaTotals[medium.id] ?? 0}
                      minValue={0}
                      step={0.01}
                      onChange={(value) =>
                        setOpenMediaTotals((prev) => {
                          const next = { ...prev };
                          if (!value || value <= 0) delete next[medium.id];
                          else next[medium.id] = Number(value.toFixed(2));
                          return next;
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex flex-col gap-2">
            <div className="min-w-0 flex-1">
              <TextField>
                <Label className="mb-1">Notas (opc.)</Label>
                <TextArea
                  variant="secondary"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="Notas de apertura"
                />
              </TextField>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
              <p className="text-muted">
                Efectivo {formatMoney(openCashAmount)}
              </p>
              {openTransferAmount > 0 ? (
                <p className="text-muted">
                  Transfer. {formatMoney(openTransferAmount)}
                </p>
              ) : null}
              <p className="font-extrabold text-accent">
                Caja inicial {formatMoney(openTotal)}
              </p>
            </div>
            <Button
              variant="primary"
              isDisabled={
                saving || (openCashAmount <= 0 && openTransferAmount <= 0)
              }
              onPress={() => void handleOpen()}
            >
              <Play width={16} height={16} />
              {saving ? "Abriendo…" : "Abrir turno"}
            </Button>
          </div>
        </section>
      ) : (
        <>
          {panel !== "cierre" && transferMedia.length > 0 ? (
            <section className="rounded-2xl border border-separator bg-surface p-3">
              <h2 className="mb-2 text-sm font-bold">Apertura</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-separator bg-surface-secondary/40 px-2.5 py-2">
                  <p className="text-[10px] text-muted">Caja inicial</p>
                  <p className="text-sm font-bold tabular-nums text-accent">
                    {formatMoney(
                      Number(shift.openingCashTotal) +
                        mediaTotalsSum(openedTransferTotals),
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-separator bg-surface-secondary/40 px-2.5 py-2">
                  <p className="text-[10px] text-muted">Efectivo</p>
                  <p className="text-sm font-bold tabular-nums">
                    {formatMoney(shift.openingCashTotal)}
                  </p>
                </div>
                {transferMedia.map((medium) => (
                  <div
                    key={medium.id}
                    className="rounded-xl border border-separator bg-surface-secondary/40 px-2.5 py-2"
                  >
                    <p className="text-[10px] text-muted">{medium.name}</p>
                    <p className="text-sm font-bold tabular-nums">
                      {formatMoney(openedTransferTotals[medium.id] ?? 0)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {panel !== "cierre" && shift.cashRegisters.length > 0 ? (
            <section className="rounded-2xl border border-separator bg-surface p-3">
              <h2 className="mb-2 text-sm font-bold">Cajas del local</h2>
              <div className="flex flex-wrap gap-1.5">
                {shift.cashRegisters.map((r) => {
                  const selected = r.id === shift.cashRegister?.id;
                  return (
                    <span
                      key={r.id}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        selected
                          ? "bg-accent text-accent-foreground"
                          : "border border-separator text-muted"
                      }`}
                    >
                      {r.name}
                    </span>
                  );
                })}
              </div>
            </section>
          ) : null}

          {panel !== "cierre" ? (
          <section className="rounded-2xl border border-separator bg-surface p-4">
            <h2 className="mb-3 text-sm font-bold">Movimientos de caja</h2>

            <div className="mb-3 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end">
              <div className="inline-flex overflow-hidden rounded-xl border border-separator">
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-semibold ${
                    movDirection === "out"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted hover:bg-surface-secondary"
                  }`}
                  onClick={() => setMovDirection("out")}
                >
                  Salida
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-semibold ${
                    movDirection === "in"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted hover:bg-surface-secondary"
                  }`}
                  onClick={() => setMovDirection("in")}
                >
                  Entrada
                </button>
              </div>

              <div className="w-full sm:w-44">
                <ComboBox
                  aria-label="Categoría"
                  selectedKey={movCategory}
                  onSelectionChange={(key) =>
                    setMovCategory(String(key || categories[0].id))
                  }
                  variant="secondary"
                >
                  <Label>Categoría</Label>
                  <ComboBox.InputGroup>
                    <Input />
                    <ComboBox.Trigger />
                  </ComboBox.InputGroup>
                  <ComboBox.Popover>
                    <ListBox>
                      {categories.map((c) => (
                        <ListBox.Item key={c.id} id={c.id} textValue={c.label}>
                          {c.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </ComboBox.Popover>
                </ComboBox>
              </div>

              <div className="w-28">
                <AppNumberField
                  label="Monto"
                  value={movAmount}
                  minValue={0}
                  step={0.01}
                  onChange={setMovAmount}
                />
              </div>

              <div className="min-w-0 flex-1">
                <Label className="mb-1">Concepto</Label>
                <Input
                  value={movConcept}
                  onChange={(e) => setMovConcept(e.target.value)}
                  placeholder="Ej. Almuerzo"
                />
              </div>

              <Button
                variant="secondary"
                isDisabled={movSaving}
                onPress={() => void handleAddMovement()}
              >
                <Plus width={14} height={14} />
                {movSaving ? "Guardando…" : "Registrar"}
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-separator">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-separator bg-surface-secondary/50 text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Hora</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Concepto</th>
                    <th className="px-3 py-2 text-right font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {shift.cashMovements.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-muted"
                      >
                        Sin movimientos todavía.
                      </td>
                    </tr>
                  ) : (
                    shift.cashMovements.items.map((m) => {
                      const when = new Date(m.createdAt);
                      const out = m.direction === "out";
                      return (
                        <tr
                          key={m.id}
                          className="border-b border-separator/60 last:border-0"
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            {when.toLocaleString("es-EC", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="px-3 py-2">
                            {out ? "Salida" : "Entrada"} · {m.categoryLabel}
                          </td>
                          <td className="px-3 py-2">{m.concept || "—"}</td>
                          <td
                            className={`px-3 py-2 text-right font-semibold tabular-nums ${
                              out ? "text-danger" : "text-success"
                            }`}
                          >
                            {out ? "-" : "+"}
                            {formatMoney(m.amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Registrá papel, comida, retiros u otras salidas/entradas de
              efectivo para que el cierre cuadre.
            </p>
          </section>
          ) : null}

          {panel === "cierre" && closedShifts.length > 0 ? (
            <ClosedShiftsRecap shifts={closedShifts} />
          ) : null}

          {panel !== "apertura" ? (
          <section
            className={
              panel === "cierre"
                ? "flex flex-col gap-3"
                : "rounded-2xl border border-separator bg-surface p-4"
            }
          >
            {panel === "cierre" ? null : (
              <h2 className="mb-3 text-sm font-bold">Cerrar turno</h2>
            )}

            <p className="cash-formula">
              <span>
                Efectivo {formatMoney(shift.openingCashTotal)}
              </span>
              <span aria-hidden>+</span>
              <span>
                ventas efec. {formatMoney(shift.sales.salesCash)}
              </span>
              <span aria-hidden>−</span>
              <span>salidas {formatMoney(shift.cashMovements.cashOut)}</span>
              {shift.cashMovements.cashIn > 0 ? (
                <>
                  <span aria-hidden>+</span>
                  <span>
                    entradas {formatMoney(shift.cashMovements.cashIn)}
                  </span>
                </>
              ) : null}
              <span aria-hidden>=</span>
              <span className="font-semibold text-warning">
                esperado {formatMoney(shift.expectedCashTotal)}
              </span>
            </p>

            <div className="grid grid-cols-3 gap-2">
              <CloseStat
                label="Esperado"
                value={formatMoney(shift.expectedCashTotal)}
                hint="Solo efectivo"
                tone="warning"
              />
              <CloseStat
                label="Contado"
                value={formatMoney(closeTotal)}
                hint={canArqueo ? "Suma del arqueo" : "Efectivo en caja"}
                tone={closeTotal > 0 ? "accent" : undefined}
              />
              <CloseStat
                label="Diferencia"
                value={formatMoney(closeDiff)}
                hint={closeDiffHint}
                tone={closeDiffTone}
              />
            </div>

            <p className="text-[11px] text-muted">
              Transfer. {formatMoney(shift.sales.salesTransfer)}
              {" · "}
              Tarjeta {formatMoney(shift.sales.salesCard)}
              {" · "}
              {shift.orderCount} venta{shift.orderCount === 1 ? "" : "s"}
              <span className="text-muted">
                {" "}
                · no entran al esperado
              </span>
            </p>

            <div className="rounded-xl border border-separator bg-surface-secondary/30 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Arqueo de efectivo
              </p>
              {canArqueo ? (
                <CashArqueoBlock
                  counts={closeCounts}
                  onChange={(key, val) =>
                    setCloseCounts((p) => ({ ...p, [key]: val }))
                  }
                />
              ) : (
                <div className="max-w-xs">
                  <AppNumberField
                    label="Total en efectivo"
                    value={closeCashTotal === "" ? null : Number(closeCashTotal)}
                    minValue={0}
                    step={0.01}
                    onChange={(v) => setCloseCashTotal(String(v))}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Label className="mb-1">Notas (opc.)</Label>
                <Input
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Observación del cierre"
                />
              </div>
              <Button
                variant="primary"
                className="sm:min-w-[10rem]"
                isDisabled={saving || closeTotal <= 0}
                onPress={() => void handleClose()}
              >
                <Lock width={16} height={16} />
                {saving ? "Cerrando…" : "Cerrar turno"}
              </Button>
            </div>
          </section>
          ) : null}
        </>
      )}

      {canArqueo && !embedded ? <CashClosePanel /> : null}
    </div>
  );
}
