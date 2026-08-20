import { toAmount } from "@/shared/utils/money";

export type OrderKind = "customer" | "supplier";

export type OrderSeverity = 0 | 1 | 2 | 3;

export const ORDER_SEVERITY_META: Record<
  OrderSeverity,
  { id: string; label: string; colorClass: string; chipClass: string; cardClass: string }
> = {
  0: {
    id: "sin_avance",
    label: "Sin avance",
    colorClass: "bg-danger/85 text-white",
    chipClass: "bg-danger",
    cardClass: "border-danger/35 bg-danger/12",
  },
  1: {
    id: "entregado_falta_cobro",
    label: "Entregado · falta cobro",
    colorClass: "bg-[var(--warning)]/90 text-[var(--warning-foreground)]",
    chipClass: "bg-[var(--warning)] text-[var(--warning-foreground)]",
    cardClass:
      "border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)]",
  },
  2: {
    id: "cobrado_falta_entrega",
    label: "Cobrado · falta entrega",
    colorClass: "bg-sky-600/90 text-white",
    chipClass: "bg-sky-600",
    cardClass: "border-sky-500/35 bg-sky-500/12",
  },
  3: {
    id: "completo",
    label: "Completo",
    colorClass: "bg-success/85 text-[var(--success-foreground)]",
    chipClass: "bg-success",
    cardClass: "border-success/35 bg-success/12",
  },
};

export function customerOrderSeverity(input: {
  status: string;
  paidAt?: Date | string | null;
  lines: Array<{
    paidAt?: Date | string | null;
    deliveredAt?: Date | string | null;
    quantity: number;
    price: number;
  }>;
  installmentsPending?: boolean;
}): OrderSeverity {
  const lines = input.lines ?? [];
  if (!lines.length) {
    if (input.status === "pagado") return 3;
    if (input.status === "entregado") return 1;
    return 0;
  }

  const allDelivered =
    lines.every((l) => Boolean(l.deliveredAt)) ||
    input.status === "entregado";
  const someDelivered =
    lines.some((l) => Boolean(l.deliveredAt)) ||
    input.status === "entregado" ||
    input.status === "pagado";

  const fullyPaid =
    input.status === "pagado" ||
    Boolean(input.paidAt) ||
    lines.every((l) => Boolean(l.paidAt));
  const somePaid =
    fullyPaid ||
    Boolean(input.paidAt) ||
    lines.some((l) => Boolean(l.paidAt));

  if (fullyPaid && allDelivered) return 3;
  if (!somePaid && !someDelivered) return 0;
  if (someDelivered && !fullyPaid) return 1;
  if (somePaid && !allDelivered) return 2;
  return 1;
}

export function supplierOrderSeverity(input: {
  status: string;
  receivedAt?: Date | string | null;
  paidAt?: Date | string | null;
}): OrderSeverity {
  const received =
    Boolean(input.receivedAt) || input.status === "recibido";
  const fullyPaid = Boolean(input.paidAt);

  if (fullyPaid && received) return 3;
  if (!fullyPaid && !received) return 0;
  if (received && !fullyPaid) return 1;
  if (fullyPaid && !received) return 2;
  return 1;
}

export function lineTotal(quantity: number, price: number) {
  return toAmount(quantity) * toAmount(price);
}
