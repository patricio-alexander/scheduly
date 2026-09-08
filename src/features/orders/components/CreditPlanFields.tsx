"use client";

import { Button, Input, Label } from "@heroui/react";
import Plus from "@gravity-ui/icons/Plus";
import TrashBin from "@gravity-ui/icons/TrashBin";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { formatMoney } from "@/shared/utils/money";

export type CreditPlanMode = "open" | "installments";

export type InstallmentDraft = {
  key: string;
  dueDate: string;
  amount: number;
};

type Props = {
  mode: CreditPlanMode;
  onModeChange: (mode: CreditPlanMode) => void;
  installments: InstallmentDraft[];
  onInstallmentsChange: (rows: InstallmentDraft[]) => void;
  total: number;
  compact?: boolean;
};

function splitEven(total: number, n: number): number[] {
  if (n <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const rem = cents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < rem ? 1 : 0)) / 100);
}

export function buildCreditInstallmentsPayload(
  mode: CreditPlanMode,
  installments: InstallmentDraft[],
  total: number,
): Array<{ dueDate: string | null; amount: number }> {
  if (mode === "open" || installments.length === 0) {
    return [{ dueDate: null, amount: total }];
  }
  return installments.map((row) => ({
    dueDate: row.dueDate.trim() || null,
    amount: row.amount,
  }));
}

export function CreditPlanFields({
  mode,
  onModeChange,
  installments,
  onInstallmentsChange,
  total,
  compact = false,
}: Props) {
  const textCls = compact ? "text-[10px]" : "text-xs";

  const ensureRows = (count: number) => {
    const amounts = splitEven(total, count);
    const next: InstallmentDraft[] = [];
    for (let i = 0; i < count; i++) {
      const existing = installments[i];
      const base = new Date();
      base.setDate(base.getDate() + 30 * (i + 1));
      next.push({
        key: existing?.key ?? crypto.randomUUID(),
        dueDate:
          existing?.dueDate ||
          base.toISOString().slice(0, 10),
        amount: amounts[i] ?? 0,
      });
    }
    onInstallmentsChange(next);
  };

  return (
    <div className={`flex flex-col gap-2 ${compact ? "gap-1.5" : ""}`}>
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant={mode === "open" ? "primary" : "secondary"}
          onPress={() => {
            onModeChange("open");
            onInstallmentsChange([]);
          }}
        >
          Sin fecha
        </Button>
        <Button
          size="sm"
          variant={mode === "installments" ? "primary" : "secondary"}
          onPress={() => {
            onModeChange("installments");
            if (installments.length === 0) ensureRows(2);
          }}
        >
          En cuotas
        </Button>
      </div>

      <p className={`${textCls} text-muted`}>
        {mode === "open"
          ? "Crédito abierto: el cliente debe el total, sin fecha de vencimiento. Se cobra en Cobranzas cuando pague."
          : "Definí cuántas cuotas y la fecha en que debe pagar cada una (podés dejar alguna sin fecha)."}
      </p>

      {mode === "installments" ? (
        <div className="flex flex-col gap-2 rounded-xl border border-separator bg-surface-secondary/40 p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`${textCls} font-semibold`}>
              Cuotas · total {formatMoney(total)}
            </span>
            <div className="flex gap-1">
              {[2, 3, 4].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant="secondary"
                  onPress={() => ensureRows(n)}
                >
                  {n}
                </Button>
              ))}
              <Button
                size="sm"
                variant="secondary"
                isIconOnly
                aria-label="Agregar cuota"
                onPress={() => ensureRows(installments.length + 1)}
              >
                <Plus width={12} height={12} />
              </Button>
            </div>
          </div>

          {installments.map((row, idx) => (
            <div
              key={row.key}
              className="grid grid-cols-[1fr_1fr_auto] items-end gap-1.5"
            >
              <div>
                <Label className="mb-0.5">Cuota {idx + 1} · vence</Label>
                <Input
                  type="date"
                  value={row.dueDate}
                  onChange={(e) =>
                    onInstallmentsChange(
                      installments.map((r) =>
                        r.key === row.key
                          ? { ...r, dueDate: e.target.value }
                          : r,
                      ),
                    )
                  }
                />
              </div>
              <AppNumberField
                label="Monto"
                value={row.amount}
                minValue={0.01}
                step={0.01}
                onChange={(v) =>
                  onInstallmentsChange(
                    installments.map((r) =>
                      r.key === row.key ? { ...r, amount: v } : r,
                    ),
                  )
                }
              />
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Quitar cuota"
                isDisabled={installments.length <= 1}
                onPress={() =>
                  onInstallmentsChange(
                    installments.filter((r) => r.key !== row.key),
                  )
                }
              >
                <TrashBin width={14} height={14} />
              </Button>
            </div>
          ))}
          <p className={`${textCls} text-muted`}>
            Fecha vacía = esa cuota también queda sin vencimiento.
          </p>
        </div>
      ) : null}
    </div>
  );
}
