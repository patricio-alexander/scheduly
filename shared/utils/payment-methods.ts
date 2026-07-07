export const paymentMethodOptions = ["cash", "card", "transfer"] as const;

export type PaymentMethodValue = (typeof paymentMethodOptions)[number];

export const paymentMethodLabel: Record<PaymentMethodValue, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};
