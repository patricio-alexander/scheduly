/** Catálogo de medios / bancos del cuadre diario. */
export const DEFAULT_PAYMENT_MEDIA = [
  { name: "Efectivo", code: "efectivo", kind: "cash", position: 10 },
  { name: "De Una", code: "de_una", kind: "transfer", position: 20 },
  { name: "Loja", code: "loja", kind: "transfer", position: 30 },
  { name: "Tarjeta", code: "tarjeta", kind: "card", position: 40 },
  { name: "Vales", code: "vales", kind: "voucher", position: 50 },
  { name: "CoopMego", code: "coopmego", kind: "transfer", position: 60 },
  { name: "Duna", code: "duna", kind: "transfer", position: 70 },
  { name: "Ahorro", code: "ahorro", kind: "transfer", position: 80 },
] as const;

export const PAYMENT_MEDIUM_KINDS = [
  "cash",
  "card",
  "transfer",
  "voucher",
  "other",
] as const;

export type PaymentMediumKind = (typeof PAYMENT_MEDIUM_KINDS)[number];

export const paymentMediumKindLabel: Record<PaymentMediumKind, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia / banco",
  voucher: "Vale",
  other: "Otro",
};

export function normalizeMediumKind(raw: unknown): PaymentMediumKind {
  const v = String(raw ?? "").trim().toLowerCase();
  if ((PAYMENT_MEDIUM_KINDS as readonly string[]).includes(v)) {
    return v as PaymentMediumKind;
  }
  return "other";
}
