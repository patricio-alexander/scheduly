import { apiUrl } from "@/shared/utils/api";
import { formatMoney } from "@/shared/utils/money";
import { formatDurationLabel } from "@/shared/utils/booking";

export type ReservationTicketData = {
  appointmentId: number;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  appointmentDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  businessName: string;
  businessAddress: string;
  logoPath: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function openReservationTicket(data: ReservationTicketData) {
  const when = new Date(data.appointmentDate).toLocaleString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const logoUrl = data.logoPath ? apiUrl(data.logoPath) : null;
  const code = String(data.appointmentId).padStart(5, "0");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ticket de reserva · ${escapeHtml(data.businessName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: #f3f4f3;
      color: #1a1c1a;
      padding: 24px;
    }
    .ticket {
      max-width: 420px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e2e4e2;
      border-radius: 16px;
      overflow: hidden;
    }
    .accent { height: 8px; background: #7dff7a; }
    .body { padding: 28px 24px 24px; }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .brand img { width: 48px; height: 48px; object-fit: contain; border-radius: 10px; }
    .brand-fallback {
      width: 48px; height: 48px; border-radius: 10px;
      background: #7dff7a; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 18px; color: #142014;
    }
    h1 { margin: 0; font-size: 20px; letter-spacing: -0.02em; }
    .sub { margin: 4px 0 0; font-size: 12px; color: #6b716b; }
    .code {
      display: inline-block; margin-top: 16px; padding: 6px 10px;
      border-radius: 8px; background: #f0f2f0; font-size: 12px;
      font-weight: 600; letter-spacing: 0.08em;
    }
    .row { margin-top: 18px; padding-top: 14px; border-top: 1px dashed #dde0dd; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b716b; margin: 0 0 4px; }
    .value { margin: 0; font-size: 15px; font-weight: 600; }
    .muted { margin: 4px 0 0; font-size: 13px; color: #4d534d; font-weight: 400; }
    .footer { margin-top: 22px; font-size: 12px; color: #6b716b; line-height: 1.45; }
    .actions { max-width: 420px; margin: 16px auto 0; display: flex; gap: 8px; justify-content: center; }
    .actions button {
      border: 0; border-radius: 10px; padding: 10px 16px; font-weight: 600; cursor: pointer;
    }
    .print { background: #7dff7a; color: #142014; }
    .close { background: #e8ebe8; color: #1a1c1a; }
    @media print {
      body { background: #fff; padding: 0; }
      .actions { display: none !important; }
      .ticket { border: 0; border-radius: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="accent"></div>
    <div class="body">
      <div class="brand">
        ${
          logoUrl
            ? `<img src="${escapeHtml(logoUrl)}" alt="" />`
            : `<div class="brand-fallback">${escapeHtml(data.businessName.slice(0, 1).toUpperCase())}</div>`
        }
        <div>
          <h1>${escapeHtml(data.businessName)}</h1>
          ${data.businessAddress ? `<p class="sub">${escapeHtml(data.businessAddress)}</p>` : ""}
        </div>
      </div>

      <p class="code">RESERVA #${escapeHtml(code)}</p>

      <div class="row">
        <p class="label">Servicio</p>
        <p class="value">${escapeHtml(data.serviceName)}</p>
        <p class="muted">${escapeHtml(formatDurationLabel(data.durationMinutes))} · ${escapeHtml(formatMoney(data.servicePrice))}</p>
      </div>

      <div class="row">
        <p class="label">Fecha y hora</p>
        <p class="value" style="text-transform: capitalize">${escapeHtml(when)}</p>
      </div>

      <div class="row">
        <p class="label">Cliente</p>
        <p class="value">${escapeHtml(data.customerName)}</p>
        <p class="muted">${escapeHtml(data.customerPhone)} · ${escapeHtml(data.customerEmail)}</p>
      </div>

      <p class="footer">Presenta este ticket al llegar. Guárdalo o imprímelo como comprobante de tu reserva.</p>
    </div>
  </div>
  <div class="actions">
    <button class="print" onclick="window.print()">Imprimir / Guardar PDF</button>
    <button class="close" onclick="window.close()">Cerrar</button>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
  if (!win) {
    throw new Error("Permite ventanas emergentes para descargar el ticket");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
