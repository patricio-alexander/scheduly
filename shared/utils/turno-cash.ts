/** Denominaciones USD (Ecuador) — alineado a EdDeli turnoCashUtils. */

export const CASH_COINS = [
  { key: "c_001", label: "1 ctvo", value: 0.01 },
  { key: "c_005", label: "5 ctvo", value: 0.05 },
  { key: "c_010", label: "10 ctvo", value: 0.1 },
  { key: "c_025", label: "25 ctvo", value: 0.25 },
  { key: "c_050", label: "50 ctvo", value: 0.5 },
  { key: "c_100", label: "$1.00", value: 1 },
] as const;

export const CASH_BILLS = [
  { key: "b_001", label: "$1", value: 1 },
  { key: "b_005", label: "$5", value: 5 },
  { key: "b_010", label: "$10", value: 10 },
  { key: "b_020", label: "$20", value: 20 },
  { key: "b_050", label: "$50", value: 50 },
  { key: "b_100", label: "$100", value: 100 },
] as const;

export const CASH_DENOMINATIONS = [...CASH_COINS, ...CASH_BILLS] as const;

export type CashCountKey = (typeof CASH_DENOMINATIONS)[number]["key"];
export type CashCountsForm = Record<CashCountKey, string>;
export type CashCountsNormalized = Record<CashCountKey, number>;

export function emptyCashCounts(): CashCountsForm {
  return Object.fromEntries(
    CASH_DENOMINATIONS.map((d) => [d.key, ""]),
  ) as CashCountsForm;
}

export function parseQty(raw: unknown): number {
  const n = Number(String(raw ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function normalizeCashCounts(input: unknown): CashCountsNormalized {
  const src =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const out = {} as CashCountsNormalized;
  for (const d of CASH_DENOMINATIONS) {
    out[d.key] = parseQty(src[d.key]);
  }
  return out;
}

export function computeCashTotal(
  counts: Partial<CashCountsForm | CashCountsNormalized> | null | undefined,
): number {
  let total = 0;
  for (const d of CASH_DENOMINATIONS) {
    total += parseQty(counts?.[d.key]) * d.value;
  }
  return Number(total.toFixed(2));
}

export function countsToFormState(counts: unknown): CashCountsForm {
  const base = emptyCashCounts();
  if (!counts || typeof counts !== "object") return base;
  const src = counts as Record<string, unknown>;
  for (const d of CASH_DENOMINATIONS) {
    const raw = src[d.key];
    base[d.key] =
      raw != null && Number(raw) > 0 ? String(Math.floor(Number(raw))) : "";
  }
  return base;
}

export function resolveCashFromBody(body: {
  cashCounts?: unknown;
  cashTotal?: unknown;
}): { counts: CashCountsNormalized; total: number } | null {
  if (body.cashCounts && typeof body.cashCounts === "object") {
    const counts = normalizeCashCounts(body.cashCounts);
    const total = computeCashTotal(counts);
    if (total > 0) return { counts, total };
  }
  const total = Number(Number(body.cashTotal || 0).toFixed(2));
  if (total > 0) {
    return { counts: normalizeCashCounts(emptyCashCounts()), total };
  }
  return null;
}

export function computeExpectedCash(
  opening: number,
  salesCash: number,
  cashOut: number,
  cashIn: number,
): number {
  return Number((opening + salesCash - cashOut + cashIn).toFixed(2));
}

export const MOVEMENT_OUT_CATEGORIES = [
  { id: "gasto_operativo", label: "Gasto operativo" },
  { id: "compra_mercancia", label: "Compra mercancía" },
  { id: "retiro", label: "Retiro" },
  { id: "otro", label: "Otro" },
] as const;

export const MOVEMENT_IN_CATEGORIES = [
  { id: "entrada", label: "Entrada" },
  { id: "otro", label: "Otro" },
] as const;

export function movementCategoryLabel(category: string | null | undefined) {
  const all = [...MOVEMENT_OUT_CATEGORIES, ...MOVEMENT_IN_CATEGORIES];
  return all.find((c) => c.id === category)?.label ?? category ?? "—";
}
