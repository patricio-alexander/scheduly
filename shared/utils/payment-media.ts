/** Catálogo de medios / bancos del cuadre diario. */
export const DEFAULT_PAYMENT_MEDIA = [
  { name: "Efectivo", code: "efectivo", kind: "cash", position: 10 },
  { name: "De Una", code: "de_una", kind: "transfer", position: 20 },
  { name: "Loja", code: "loja", kind: "transfer", position: 30 },
  { name: "Pichincha", code: "pichincha", kind: "transfer", position: 35 },
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

/** Método operativo (cobro/venta) a partir del kind del medio. */
export function mediumKindToMethod(
  kind: string,
): "cash" | "card" | "transfer" {
  const k = String(kind || "").toLowerCase();
  if (k === "card") return "card";
  if (k === "transfer" || k === "voucher") return "transfer";
  return "cash";
}

/** Medio por defecto cuando solo llega cash|card|transfer. */
export function defaultMediumCodeForMethod(
  method: string,
): string {
  const m = String(method || "cash").toLowerCase();
  if (m === "card") return "tarjeta";
  if (m === "transfer" || m === "transferencia") return "de_una";
  return "efectivo";
}

export function normalizeMediumKind(raw: unknown): PaymentMediumKind {
  const v = String(raw ?? "").trim().toLowerCase();
  if ((PAYMENT_MEDIUM_KINDS as readonly string[]).includes(v)) {
    return v as PaymentMediumKind;
  }
  return "other";
}

type PrismaLike = {
  paymentMedium: {
    findUnique: (args: unknown) => Promise<{
      id: number;
      code: string | null;
      kind: string;
      name: string;
      isActive: boolean;
    } | null>;
    findFirst: (args: unknown) => Promise<{
      id: number;
      code: string | null;
      kind: string;
      name: string;
      isActive: boolean;
    } | null>;
    upsert: (args: unknown) => Promise<unknown>;
  };
};

/** Crea / actualiza el catálogo default (incluye bancos nuevos como Pichincha). */
export async function ensureDefaultPaymentMedia(db: PrismaLike) {
  for (const m of DEFAULT_PAYMENT_MEDIA) {
    await db.paymentMedium.upsert({
      where: { code: m.code },
      create: {
        name: m.name,
        code: m.code,
        kind: m.kind,
        position: m.position,
        isActive: true,
      },
      update: {
        name: m.name,
        kind: m.kind,
        position: m.position,
        isActive: true,
      },
    });
  }
}

/**
 * Resuelve medio de pago desde body (mediumCode | paymentMediumId | method).
 */
export async function resolvePaymentMedium(
  db: PrismaLike,
  opts: {
    method?: string | null;
    mediumCode?: string | null;
    paymentMediumId?: number | null;
  },
) {
  await ensureDefaultPaymentMedia(db);

  if (opts.paymentMediumId && Number.isInteger(opts.paymentMediumId)) {
    const byId = await db.paymentMedium.findFirst({
      where: { id: opts.paymentMediumId, isActive: true },
    });
    if (byId) {
      return {
        medium: byId,
        method: mediumKindToMethod(byId.kind),
      };
    }
  }

  const codeRaw = String(opts.mediumCode || "").trim().toLowerCase();
  if (codeRaw) {
    const byCode = await db.paymentMedium.findUnique({
      where: { code: codeRaw },
    });
    if (byCode?.isActive) {
      return {
        medium: byCode,
        method: mediumKindToMethod(byCode.kind),
      };
    }
  }

  const method = String(opts.method || "cash").toLowerCase();
  const fallbackCode = defaultMediumCodeForMethod(method);
  const fallback = await db.paymentMedium.findUnique({
    where: { code: fallbackCode },
  });
  if (fallback) {
    return {
      medium: fallback,
      method: (["cash", "card", "transfer"].includes(method)
        ? method
        : mediumKindToMethod(fallback.kind)) as "cash" | "card" | "transfer",
    };
  }

  return {
    medium: null,
    method: (["cash", "card", "transfer"].includes(method)
      ? method
      : "cash") as "cash" | "card" | "transfer",
  };
}
