"use client";

import { formatMoney } from "@/shared/utils/money";

export type ClosedShiftSnapshot = {
  id: number;
  operatorName: string;
  closedAt?: string | null;
  openingCashOnDay: number | null;
  expectedCashOnDay?: number;
  closingCashOnDay: number;
  countedCashOnDay?: number | null;
  salesCashDay?: number;
  cashOutDay: number;
  cashInDay?: number;
  cashDifference?: number | null;
  closingNotes?: string | null;
};

function shortTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function CloseRecapStat({
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
      <p className={`text-base font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
      {hint ? <p className="text-[10px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function ClosedShiftsRecap({
  shifts,
}: {
  shifts: ClosedShiftSnapshot[];
}) {
  if (shifts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {shifts.map((shift) => {
        const expected = Number(
          shift.expectedCashOnDay ?? shift.closingCashOnDay ?? 0,
        );
        const counted = shift.countedCashOnDay;
        const hasCounted = counted != null;
        const diff =
          shift.cashDifference ??
          (hasCounted ? Number((counted - expected).toFixed(2)) : 0);
        const diffTone = !hasCounted
          ? undefined
          : diff === 0
            ? "success"
            : diff > 0
              ? "warning"
              : "danger";
        const diffHint = !hasCounted
          ? "Sin contado"
          : diff === 0
            ? "Cuadra"
            : diff > 0
              ? "Sobra"
              : "Falta";
        return (
          <div key={shift.id} className="flex flex-col gap-2">
            <p className="text-sm font-semibold">
              Cerrada
              <span className="ml-1.5 font-normal text-muted">
                {shift.operatorName}
                {shift.closedAt ? ` · ${shortTime(shift.closedAt)}` : ""}
              </span>
            </p>
            <p className="cash-formula">
              <span>Efectivo {formatMoney(shift.openingCashOnDay ?? 0)}</span>
              <span aria-hidden>+</span>
              <span>
                ventas efec. {formatMoney(shift.salesCashDay ?? 0)}
              </span>
              <span aria-hidden>−</span>
              <span>gastos {formatMoney(shift.cashOutDay)}</span>
              {(shift.cashInDay ?? 0) > 0 ? (
                <>
                  <span aria-hidden>+</span>
                  <span>entradas {formatMoney(shift.cashInDay ?? 0)}</span>
                </>
              ) : null}
              <span aria-hidden>=</span>
              <span className="font-semibold text-warning">
                esperado {formatMoney(expected)}
              </span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              <CloseRecapStat
                label="Esperado"
                value={formatMoney(expected)}
                hint="Solo efectivo"
                tone="warning"
              />
              <CloseRecapStat
                label="Contado"
                value={hasCounted ? formatMoney(counted) : "—"}
                hint={hasCounted ? "Así se cerró" : "No se registró"}
                tone={hasCounted ? "accent" : undefined}
              />
              <CloseRecapStat
                label="Diferencia"
                value={hasCounted ? formatMoney(diff) : "—"}
                hint={diffHint}
                tone={diffTone}
              />
            </div>
            {shift.closingNotes ? (
              <p className="text-[11px] text-muted">{shift.closingNotes}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
