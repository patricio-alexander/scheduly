import type { InvoiceLine } from "../types";

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n: number) {
  return n.toFixed(2);
}

export function buildInvoiceXml(input: {
  accessKey: string;
  environment: "1" | "2";
  issueDate: Date;
  estab: string;
  ptoEmi: string;
  secuencial: string;
  issuer: {
    ruc: string;
    name: string;
    tradeName: string;
    address: string;
    obligationAccounting: boolean;
  };
  buyer: {
    identificationType: string;
    identification: string;
    name: string;
    address: string;
    email: string;
    phone: string;
  };
  lines: InvoiceLine[];
  subtotal: number;
  ivaAmount: number;
  total: number;
}) {
  const issue = input.issueDate.toISOString().slice(0, 10);
  const detalles = input.lines
    .map((line, index) => {
      const base = line.qty * line.unitPrice - line.discount;
      const iva = base * line.ivaRate;
      return `
    <detalle>
      <codigoPrincipal>${esc(line.code)}</codigoPrincipal>
      <descripcion>${esc(line.description)}</descripcion>
      <cantidad>${line.qty.toFixed(2)}</cantidad>
      <precioUnitario>${money(line.unitPrice)}</precioUnitario>
      <descuento>${money(line.discount)}</descuento>
      <precioTotalSinImpuesto>${money(base)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${line.ivaRate === 0.15 ? "4" : "0"}</codigoPorcentaje>
          <tarifa>${(line.ivaRate * 100).toFixed(0)}</tarifa>
          <baseImponible>${money(base)}</baseImponible>
          <valor>${money(iva)}</valor>
        </impuesto>
      </impuestos>
    </detalle>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${input.environment}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${esc(input.issuer.name)}</razonSocial>
    <nombreComercial>${esc(input.issuer.tradeName || input.issuer.name)}</nombreComercial>
    <ruc>${esc(input.issuer.ruc)}</ruc>
    <claveAcceso>${input.accessKey}</claveAcceso>
    <codDoc>01</codDoc>
    <estab>${input.estab}</estab>
    <ptoEmi>${input.ptoEmi}</ptoEmi>
    <secuencial>${input.secuencial}</secuencial>
    <dirMatriz>${esc(input.issuer.address)}</dirMatriz>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${issue.split("-").reverse().join("/")}</fechaEmision>
    <obligadoContabilidad>${input.issuer.obligationAccounting ? "SI" : "NO"}</obligadoContabilidad>
    <tipoIdentificacionComprador>${input.buyer.identificationType}</tipoIdentificacionComprador>
    <razonSocialComprador>${esc(input.buyer.name)}</razonSocialComprador>
    <identificacionComprador>${esc(input.buyer.identification)}</identificacionComprador>
    <direccionComprador>${esc(input.buyer.address)}</direccionComprador>
    <totalSinImpuestos>${money(input.subtotal)}</totalSinImpuestos>
    <totalDescuento>0.00</totalDescuento>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>4</codigoPorcentaje>
        <baseImponible>${money(input.subtotal)}</baseImponible>
        <valor>${money(input.ivaAmount)}</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <propina>0.00</propina>
    <importeTotal>${money(input.total)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
      <pago>
        <formaPago>01</formaPago>
        <total>${money(input.total)}</total>
      </pago>
    </pagos>
  </infoFactura>
  <detalles>${detalles}
  </detalles>
  <infoAdicional>
    <campoAdicional nombre="Email">${esc(input.buyer.email)}</campoAdicional>
    <campoAdicional nombre="Telefono">${esc(input.buyer.phone)}</campoAdicional>
  </infoAdicional>
</factura>`;
}

export function computeInvoiceTotals(lines: InvoiceLine[]) {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.qty * line.unitPrice - line.discount,
    0,
  );
  const ivaAmount = lines.reduce((sum, line) => {
    const base = line.qty * line.unitPrice - line.discount;
    return sum + base * line.ivaRate;
  }, 0);
  const total = subtotal + ivaAmount;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    ivaAmount: Math.round(ivaAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function defaultIvaRate() {
  return 0.15;
}
