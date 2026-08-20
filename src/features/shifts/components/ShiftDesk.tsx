"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
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
  MOVEMENT_IN_CATEGORIES,
  MOVEMENT_OUT_CATEGORIES,
  type CashCountKey,
  type CashCountsForm,
} from "@/shared/utils/turno-cash";

type ActiveShift = {
  id: number;
  status: string;
  storeId: number | null;
  openedAt: string;
  openingCashTotal: number;
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

function StatCell({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 px-1 text-center">
      <p className="truncate text-[10px] text-muted" title={label}>
        {label}
      </p>
      <p
        className={`truncate text-sm font-bold tabular-nums ${
          highlight
            ? "text-accent"
            : danger
              ? "text-warning"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function ShiftDesk() {
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
  const [openNotes, setOpenNotes] = useState("");
  const [storeId, setStoreId] = useState<string>("");

  const [closeCounts, setCloseCounts] = useState(emptyCashCounts);
  const [closeCashTotal, setCloseCashTotal] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const [movDirection, setMovDirection] = useState<"out" | "in">("out");
  const [movCategory, setMovCategory] = useState("gasto_operativo");
  const [movAmount, setMovAmount] = useState<number | null>(null);
  const [movConcept, setMovConcept] = useState("");
  const [movSaving, setMovSaving] = useState(false);

  const openTotal = useMemo(
    () =>
      canArqueo
        ? computeCashTotal(openCounts)
        : Number(Number(openCashTotal || 0).toFixed(2)),
    [canArqueo, openCounts, openCashTotal],
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
      toast.danger(err instanceof Error ? err.message : "Error al cargar turno");
      setShift(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (storeId) return;
    const main = branches.find((b) => b.isMain && b.isActive);
    const first = main ?? branches.find((b) => b.isActive);
    if (first) setStoreId(String(first.id));
  }, [branches, storeId]);

  useEffect(() => {
    if (movDirection === "out") {
      setMovCategory("gasto_operativo");
    } else {
      setMovCategory("entrada");
    }
  }, [movDirection]);

  const handleOpen = async () => {
    if (openTotal <= 0) {
      toast.danger("Indica el capital inicial");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        notes: openNotes.trim() || undefined,
        storeId: storeId ? Number(storeId) : undefined,
      };
      if (canArqueo) payload.cashCounts = openCounts;
      else payload.cashTotal = openTotal;

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
      } | null;
      if (!res.ok) {
        throw new Error(json?.message ?? "No se pudo cerrar el turno");
      }
      toast.success("Turno cerrado");
      setShift(null);
      setCloseCounts(emptyCashCounts());
      setCloseCashTotal("");
      setCloseNotes("");
      void load();
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

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold tracking-tight">Turno</h1>
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
        {canArqueo ? (
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

      {!shift ? (
        <section className="rounded-2xl border border-separator bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold">Apertura de caja</h2>
            <p className="text-xs text-muted">{user.name}</p>
          </div>

          {branches.length > 1 && isOwner ? (
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
                        <ListBox.Item key={b.id} id={String(b.id)} textValue={b.name}>
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
              Se abrirá en <strong>{branches.find((b) => String(b.id) === storeId)?.name ?? branches[0].name}</strong>
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

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <p className="min-w-[8rem] text-sm font-extrabold text-accent tabular-nums">
              Total: {formatMoney(openTotal)}
            </p>
            <div className="min-w-0 flex-1">
              <Label className="mb-1">Notas (opc.)</Label>
              <Input
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
                placeholder="Notas de apertura"
              />
            </div>
            <Button
              variant="primary"
              isDisabled={saving || openTotal <= 0}
              onPress={() => void handleOpen()}
            >
              <Play width={16} height={16} />
              {saving ? "Abriendo…" : "Abrir turno"}
            </Button>
          </div>
        </section>
      ) : (
        <>
          {shift.cashRegisters.length > 0 ? (
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

          {/* Movimientos */}
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

          {/* Cierre */}
          <section className="rounded-2xl border border-separator bg-surface p-4">
            <h2 className="mb-3 text-sm font-bold">Cierre de caja</h2>

            <div className="mb-4 flex flex-wrap items-stretch gap-y-2 rounded-xl border border-separator bg-surface-secondary/30 py-2">
              <StatCell
                label="Apertura"
                value={formatMoney(shift.openingCashTotal)}
              />
              <StatCell
                label="Efec. ventas"
                value={formatMoney(shift.sales.salesCash)}
              />
              <StatCell
                label="Salidas"
                value={formatMoney(shift.cashMovements.cashOut)}
              />
              <StatCell
                label="Entradas"
                value={formatMoney(shift.cashMovements.cashIn)}
              />
              <StatCell
                label="Esperado"
                value={formatMoney(shift.expectedCashTotal)}
                highlight
              />
              <StatCell
                label="Transfer."
                value={formatMoney(shift.sales.salesTransfer)}
              />
              <StatCell
                label="Tarjeta"
                value={formatMoney(shift.sales.salesCard)}
              />
              <StatCell label="Pedidos" value={String(shift.orderCount)} />
            </div>

            {canArqueo ? (
              <CashArqueoBlock
                counts={closeCounts}
                onChange={(key, val) =>
                  setCloseCounts((p) => ({ ...p, [key]: val }))
                }
              />
            ) : (
              <div className="mb-3 max-w-xs">
                <AppNumberField
                  label="Total en efectivo (cierre)"
                  value={closeCashTotal === "" ? null : Number(closeCashTotal)}
                  minValue={0}
                  step={0.01}
                  onChange={(v) => setCloseCashTotal(String(v))}
                />
              </div>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <p className="text-xs text-muted">Contado</p>
                  <p className="text-sm font-bold tabular-nums">
                    {formatMoney(closeTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Dif.</p>
                  <p
                    className={`text-sm font-bold tabular-nums ${
                      closeDiff === 0
                        ? "text-success"
                        : "text-warning"
                    }`}
                  >
                    {formatMoney(closeDiff)}
                  </p>
                </div>
                <div className="min-w-[12rem] flex-1">
                  <Label className="mb-1">Notas (opc.)</Label>
                  <Input
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Notas de cierre"
                  />
                </div>
              </div>
              <Button
                variant="primary"
                isDisabled={saving || closeTotal <= 0}
                onPress={() => void handleClose()}
              >
                <Lock width={16} height={16} />
                {saving ? "Cerrando…" : "Cerrar turno"}
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
