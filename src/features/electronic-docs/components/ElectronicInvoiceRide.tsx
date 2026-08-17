"use client";

import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import type { InvoicePreviewData } from "../types";

function lineTotal(line: InvoicePreviewData["lines"][number]) {
  return line.qty * line.unitPrice - line.discount;
}

export function ElectronicInvoiceRide({ data }: { data: InvoicePreviewData }) {
  const logoUrl = data.issuer.logoPath ? apiUrl(data.issuer.logoPath) : null;
  const displayName = data.issuer.tradeName || data.issuer.name;
  const issueDate = new Date(data.issueDate).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="overflow-hidden rounded-xl border border-separator bg-white text-[#1a1a1a] shadow-sm">
      <div className="border-b border-[#ddd] bg-[#f7f7f7] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[#666]">
        Vista previa · Factura electrónica (RIDE)
      </div>

      <div className="max-h-[min(62vh,520px)] space-y-4 overflow-y-auto p-4 text-[11px] leading-snug sm:p-5 sm:text-xs">
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
                {displayName.trim().charAt(0).toUpperCase() || "S"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-tight text-[#111]">
                {displayName}
              </p>
              <p className="mt-1 text-[#555]">
                RUC: <span className="font-mono">{data.issuer.ruc}</span>
              </p>
              <p className="mt-0.5 text-[#555]">{data.issuer.address || "—"}</p>
              <p className="mt-0.5 text-[#555]">
                Obligado a llevar contabilidad:{" "}
                {data.issuer.obligationAccounting ? "SÍ" : "NO"}
              </p>
            </div>
          </div>

          <div className="rounded-md border border-[#222] bg-[#fafafa] p-3">
            <p className="text-center text-[10px] font-bold uppercase tracking-wide">
              Factura
            </p>
            <p className="mt-1 text-center font-mono text-sm font-bold tracking-wider">
              {data.series}
            </p>
            <div className="mt-2 space-y-1 border-t border-[#ddd] pt-2 text-[#444]">
              <p>Fecha emisión: {issueDate}</p>
              <p>
                Ambiente:{" "}
                <span className="font-semibold">
                  {data.environment === "produccion" ? "PRODUCCIÓN" : "PRUEBAS"}
                </span>
              </p>
              {data.branchName ? <p>Sucursal: {data.branchName}</p> : null}
              <p>Emisión: NORMAL</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-[#ddd] p-3">
          <p className="font-semibold text-[#222]">Información del cliente</p>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            <p>
              Razón social:{" "}
              <span className="font-medium">{data.buyer.name}</span>
            </p>
            <p>
              Identificación:{" "}
              <span className="font-mono">{data.buyer.identification}</span>
            </p>
            <p>Dirección: {data.buyer.address || "—"}</p>
            <p>Teléfono: {data.buyer.phone || "—"}</p>
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
              {data.lines.map((line) => (
                <tr key={`${line.code}-${line.description}`} className="border-b border-[#eee]">
                  <td className="px-2 py-1.5 font-mono">{line.code}</td>
                  <td className="px-2 py-1.5">{line.description}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {line.qty}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatMoney(line.unitPrice)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                    {formatMoney(lineTotal(line))}
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
              <span className="tabular-nums">{formatMoney(data.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#555]">IVA 15%</span>
              <span className="tabular-nums">{formatMoney(data.ivaAmount)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#ddd] pt-1 text-sm font-bold">
              <span>TOTAL</span>
              <span className="tabular-nums">{formatMoney(data.total)}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#888]">
          Vista previa · Se enviará al SRI al confirmar
        </p>
      </div>
    </div>
  );
}
