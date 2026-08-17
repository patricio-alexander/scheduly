"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/shared/utils/api";
import {
  DEFAULT_BUSINESS_NAME,
  DEFAULT_THEME_COLORS,
  type BusinessProfile,
} from "@/shared/utils/business-profile";
import { formatMoney } from "@/shared/utils/money";

type PreviewLine = {
  code: string;
  description: string;
  qty: number;
  unitPrice: number;
};

/** Datos de ejemplo con formato válido SRI (Ecuador) — solo previsualización */
const SAMPLE_INVOICE = {
  ruc: "1791234567001",
  series: "001-002-000045892",
  authorization:
    "030820240117912345670011001002000045892123456781",
  client: {
    name: "María Fernanda López Mendoza",
    id: "1724589630",
    address: "Av. 6 de Diciembre N41-28 y El Bosque, Quito",
    phone: "0987654321",
  },
  fallbackAddress: "Av. Amazonas N34-451 y Av. República, Quito, Pichincha",
} as const;

const SAMPLE_LINES: PreviewLine[] = [
  {
    code: "SRV-001",
    description: "Corte de cabello",
    qty: 1,
    unitPrice: 10,
  },
  {
    code: "SRV-009",
    description: "Corte + Barba (combo)",
    qty: 1,
    unitPrice: 18,
  },
  {
    code: "PRD-003",
    description: "Cera para barba",
    qty: 1,
    unitPrice: 8.5,
  },
];

const IVA_RATE = 0.15;

function money(n: number) {
  return formatMoney(n);
}

type Props = {
  /** Si se pasa, usa estos datos en vivo (p. ej. mientras editas el form) */
  liveBusiness?: Partial<BusinessProfile> | null;
  environment?: "pruebas" | "produccion";
};

export function InvoicePreview({ liveBusiness, environment }: Props) {
  const [business, setBusiness] = useState<BusinessProfile>({
    businessName: DEFAULT_BUSINESS_NAME,
    address: "",
    logoPath: null,
    ruc: "",
    tradeName: "",
    obligationAccounting: true,
    ...DEFAULT_THEME_COLORS,
  });
  const [sriEnv, setSriEnv] = useState<"pruebas" | "produccion">("pruebas");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [settingsRes, sriRes] = await Promise.all([
          fetch(apiUrl("/api/settings"), { cache: "no-store" }),
          fetch(apiUrl("/api/sri"), { cache: "no-store" }),
        ]);
        const settings = await settingsRes.json().catch(() => null);
        const sri = await sriRes.json().catch(() => null);
        if (cancelled) return;
        if (settingsRes.ok && settings) {
          setBusiness({
            businessName: settings.businessName || DEFAULT_BUSINESS_NAME,
            address: settings.address ?? "",
            logoPath: settings.logoPath ?? null,
            ruc: settings.ruc ?? "",
            tradeName: settings.tradeName ?? "",
            obligationAccounting: settings.obligationAccounting ?? true,
            accentColor:
              settings.accentColor ?? DEFAULT_THEME_COLORS.accentColor,
            successColor:
              settings.successColor ?? DEFAULT_THEME_COLORS.successColor,
            warningColor:
              settings.warningColor ?? DEFAULT_THEME_COLORS.warningColor,
            dangerColor:
              settings.dangerColor ?? DEFAULT_THEME_COLORS.dangerColor,
          });
        }
        if (sriRes.ok && sri?.environment === "produccion") {
          setSriEnv("produccion");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const name = liveBusiness?.businessName?.trim() || business.businessName;
  const address =
    liveBusiness?.address !== undefined
      ? liveBusiness.address
      : business.address;
  const logoPath =
    liveBusiness && "logoPath" in liveBusiness
      ? liveBusiness.logoPath
      : business.logoPath;
  const logoUrl = logoPath ? apiUrl(logoPath) : null;
  const env = environment ?? sriEnv;

  const subtotal = SAMPLE_LINES.reduce(
    (sum, line) => sum + line.qty * line.unitPrice,
    0,
  );
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;

  const today = new Date().toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (loading && !liveBusiness) {
    return (
      <div className="h-[420px] animate-pulse rounded-xl border border-separator bg-surface-secondary" />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-separator bg-white text-[#1a1a1a] shadow-sm">
      <div className="border-b border-[#ddd] bg-[#f7f7f7] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[#666]">
        Previsualización · Factura electrónica (RIDE)
      </div>

      <div className="space-y-4 p-4 text-[11px] leading-snug sm:p-5 sm:text-xs">
        <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="flex gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-md border border-[#e5e5e5] object-contain bg-white p-1"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-[#e5e5e5] bg-[#f3f3f3] text-lg font-bold text-[#444]">
                {name.trim().charAt(0).toUpperCase() || "S"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-tight text-[#111]">
                {name}
              </p>
              <p className="mt-1 text-[#555]">
                RUC: <span className="font-mono">{business.ruc || SAMPLE_INVOICE.ruc}</span>
              </p>
              <p className="mt-0.5 text-[#555]">
                {address?.trim() || SAMPLE_INVOICE.fallbackAddress}
              </p>
              <p className="mt-0.5 text-[#555]">Obligado a llevar contabilidad: SÍ</p>
            </div>
          </div>

          <div className="rounded-md border border-[#222] bg-[#fafafa] p-3">
            <p className="text-center text-[10px] font-bold uppercase tracking-wide">
              Factura
            </p>
            <p className="mt-1 text-center font-mono text-sm font-bold tracking-wider">
              {SAMPLE_INVOICE.series}
            </p>
            <div className="mt-2 space-y-1 border-t border-[#ddd] pt-2 text-[#444]">
              <p>
                Núm. autorización:{" "}
                <span className="font-mono text-[10px] break-all">
                  {SAMPLE_INVOICE.authorization}
                </span>
              </p>
              <p>Fecha emisión: {today}</p>
              <p>
                Ambiente:{" "}
                <span className="font-semibold">
                  {env === "produccion" ? "PRODUCCIÓN" : "PRUEBAS"}
                </span>
              </p>
              <p>Emisión: NORMAL</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-[#ddd] p-3">
          <p className="font-semibold text-[#222]">Información del cliente</p>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            <p>
              Razón social:{" "}
              <span className="font-medium">{SAMPLE_INVOICE.client.name}</span>
            </p>
            <p>
              Identificación:{" "}
              <span className="font-mono">{SAMPLE_INVOICE.client.id}</span>
            </p>
            <p>Dirección: {SAMPLE_INVOICE.client.address}</p>
            <p>Teléfono: {SAMPLE_INVOICE.client.phone}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-[#ddd]">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead>
              <tr className="bg-[#f0f0f0] text-[10px] uppercase tracking-wide text-[#444]">
                <th className="border-b border-[#ddd] px-2 py-1.5 font-semibold">
                  Código
                </th>
                <th className="border-b border-[#ddd] px-2 py-1.5 font-semibold">
                  Descripción
                </th>
                <th className="border-b border-[#ddd] px-2 py-1.5 text-right font-semibold">
                  Cant.
                </th>
                <th className="border-b border-[#ddd] px-2 py-1.5 text-right font-semibold">
                  P. unit.
                </th>
                <th className="border-b border-[#ddd] px-2 py-1.5 text-right font-semibold">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_LINES.map((line) => (
                <tr key={line.code} className="border-b border-[#eee]">
                  <td className="px-2 py-1.5 font-mono">{line.code}</td>
                  <td className="px-2 py-1.5">{line.description}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {line.qty}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {money(line.unitPrice)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                    {money(line.qty * line.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-[220px] space-y-1 rounded-md border border-[#ddd] bg-[#fafafa] px-3 py-2">
            <div className="flex justify-between gap-4">
              <span className="text-[#555]">Subtotal</span>
              <span className="tabular-nums">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#555]">IVA 15%</span>
              <span className="tabular-nums">{money(iva)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#ddd] pt-1 text-sm font-bold">
              <span>TOTAL</span>
              <span className="tabular-nums">{money(total)}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#888]">
          Documento de ejemplo · No tiene validez tributaria
        </p>
      </div>
    </div>
  );
}
