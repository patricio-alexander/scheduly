import { toAmount } from "@/shared/utils/money";

export type SaleInstallmentInput = {
  sequence: number;
  dueDate: Date | null;
  amount: number;
  notes: string | null;
};

/**
 * Parsea plan de crédito del body.
 * - Sin `installments` / vacío → una cuota abierta (sin fecha) por el total.
 * - Con filas → respeta dueDate (null/"" = sin fecha) y montos.
 */
export function parseSaleCreditInstallments(
  raw: unknown,
  totalAmount: number,
): SaleInstallmentInput[] {
  const total = toAmount(totalAmount);
  if (total <= 0) return [];

  const rows = Array.isArray(raw) ? raw : [];
  if (rows.length === 0) {
    return [
      {
        sequence: 1,
        dueDate: null,
        amount: total,
        notes: "Crédito sin fecha",
      },
    ];
  }

  const parsed: SaleInstallmentInput[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const amount = toAmount(r.amount);
    if (!(amount > 0)) continue;

    const dueRaw = r.dueDate;
    let dueDate: Date | null = null;
    if (dueRaw != null && String(dueRaw).trim() !== "") {
      const d = new Date(String(dueRaw));
      if (!Number.isNaN(d.getTime())) {
        dueDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }
    }

    parsed.push({
      sequence: Number(r.sequence) > 0 ? Number(r.sequence) : i + 1,
      dueDate,
      amount,
      notes: r.notes != null ? String(r.notes).trim() || null : null,
    });
  }

  if (parsed.length === 0) {
    return [
      {
        sequence: 1,
        dueDate: null,
        amount: total,
        notes: "Crédito sin fecha",
      },
    ];
  }

  // Ajusta última cuota si la suma no cierra el total (centavos)
  const sum = parsed.reduce((s, p) => s + p.amount, 0);
  const diff = Math.round((total - sum) * 100) / 100;
  if (Math.abs(diff) >= 0.01 && Math.abs(diff) < total) {
    parsed[parsed.length - 1] = {
      ...parsed[parsed.length - 1],
      amount: Math.round((parsed[parsed.length - 1].amount + diff) * 100) / 100,
    };
  }

  return parsed.map((p, idx) => ({ ...p, sequence: idx + 1 }));
}
