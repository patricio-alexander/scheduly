export function toAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function toQuantity(value: unknown): number {
  const qty = Number(value);
  return Number.isInteger(qty) && qty > 0 ? qty : 1;
}

export function lineTotal(price: unknown, quantity: unknown): number {
  return toAmount(price) * toQuantity(quantity);
}

export function formatMoney(amount: unknown): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(toAmount(amount));
}
