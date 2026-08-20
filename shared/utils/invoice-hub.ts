/** Utilidades compartidas para hubs Ventas / Compras (estilo EdDeli). */

export type PaymentBuckets = {
  cash: number;
  checkBank: number;
  card: number;
  other: number;
};

/** Reparte el total en columnas de forma de pago (una venta = un método). */
export function paymentBuckets(
  method: string | null | undefined,
  total: number,
): PaymentBuckets {
  const t = Number(total || 0);
  const m = String(method || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const out: PaymentBuckets = { cash: 0, checkBank: 0, card: 0, other: 0 };
  if (!m || m.includes("efectivo") || m === "cash") out.cash = t;
  else if (
    m.includes("transfer") ||
    m.includes("deposito") ||
    m.includes("cheque") ||
    m.includes("banco") ||
    m === "check" ||
    m === "bank"
  ) {
    out.checkBank = t;
  } else if (m.includes("tarjeta") || m === "card") out.card = t;
  else out.other = t;
  return out;
}

/** Parsea Nº factura proveedor: "001-001-000000123" → estab + secuencial. */
export function splitSupplierInvoiceNumber(raw: string | null | undefined): {
  invoiceNumber: string;
  estabPtoEmi: string;
  numero: string;
} {
  const invoiceNumber = String(raw || "").trim();
  if (!invoiceNumber) {
    return { invoiceNumber: "", estabPtoEmi: "—", numero: "—" };
  }
  const parts = invoiceNumber.split("-").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const seq = parts[parts.length - 1];
    return {
      invoiceNumber,
      estabPtoEmi: `${parts[0]}-${parts[1]}`,
      numero: seq ? String(seq).padStart(9, "0") : invoiceNumber,
    };
  }
  const digits = invoiceNumber.replace(/\D/g, "");
  return {
    invoiceNumber,
    estabPtoEmi: "—",
    numero: digits ? digits.padStart(9, "0") : invoiceNumber,
  };
}

export type InvoiceHubItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceHubRow = {
  id: number;
  partyKind: "customer" | "supplier";
  emissionDate: string;
  estabPtoEmi: string;
  numero: string;
  invoiceNumber?: string | null;
  sellerLabel?: string;
  partyName: string;
  partyId?: number | null;
  partyIdent?: string | null;
  partyPhone?: string | null;
  partyEmail?: string | null;
  partyAddress?: string | null;
  statusLabel: string;
  severity: 0 | 1 | 2 | 3;
  subtotal: number;
  discount: number;
  iva: number;
  total: number;
  retention: number;
  cash: number;
  checkBank: number;
  card: number;
  other: number;
  paymentMethod?: string | null;
  notes?: string | null;
  items: InvoiceHubItem[];
};

function money(n: number) {
  return Number(n || 0).toFixed(2);
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Imprime comprobante HTML (venta o compra). */
export function printInvoiceHubReceipt(row: InvoiceHubRow) {
  const title =
    row.partyKind === "supplier"
      ? "Compra / factura proveedor"
      : "Comprobante de venta";
  const partyLabel = row.partyKind === "supplier" ? "Proveedor" : "Cliente";
  const itemRows = (row.items || [])
    .map((it) => {
      return `<tr><td>${escapeHtml(it.name)}</td><td style="text-align:right">${it.quantity}</td><td style="text-align:right">$${money(it.unitPrice)}</td><td style="text-align:right">$${money(it.lineTotal)}</td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html><head><title>${escapeHtml(title)} ${escapeHtml(row.numero || String(row.id))}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111}
      h1{font-size:18px;margin:0 0 8px}
      .muted{color:#666;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
      th{background:#f5f5f5}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:13px}
      .label{color:#666}
    </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <div class="muted">${escapeHtml(row.emissionDate || "—")} · Nº ${escapeHtml(row.invoiceNumber || row.numero || String(row.id))}</div>
    <div class="grid">
      <div><span class="label">${partyLabel}:</span> <strong>${escapeHtml(row.partyName || "—")}</strong></div>
      <div><span class="label">RUC/Cédula:</span> ${escapeHtml(row.partyIdent || "—")}</div>
      <div><span class="label">Teléfono:</span> ${escapeHtml(row.partyPhone || "—")}</div>
      <div><span class="label">Email:</span> ${escapeHtml(row.partyEmail || "—")}</div>
      ${row.sellerLabel ? `<div><span class="label">Vendedor:</span> ${escapeHtml(row.sellerLabel)}</div>` : ""}
      <div><span class="label">Estab:</span> ${escapeHtml(row.estabPtoEmi || "—")}</div>
      <div><span class="label">Subtotal:</span> $${money(row.subtotal)}</div>
      <div><span class="label">IVA:</span> $${money(row.iva)}</div>
      <div><span class="label">Descuento:</span> $${money(row.discount)}</div>
      <div><span class="label">Total:</span> <strong>$${money(row.total)}</strong></div>
      <div><span class="label">Efectivo:</span> $${money(row.cash)}</div>
      <div><span class="label">Chq/Bco:</span> $${money(row.checkBank)}</div>
      <div><span class="label">Tarjeta:</span> $${money(row.card)}</div>
      <div><span class="label">Otros:</span> $${money(row.other)}</div>
    </div>
    <table><thead><tr><th>Producto</th><th>Cant.</th><th>P. unit.</th><th>Total</th></tr></thead>
    <tbody>${itemRows || '<tr><td colspan="4">Sin ítems</td></tr>'}</tbody></table>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`;

  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
