/** Dígito verificador módulo 11 (SRI Ecuador) */
export function sriMod11CheckDigit(base49: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = base49.length - 1; i >= 0; i -= 1) {
    sum += Number(base49[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const mod = 11 - (sum % 11);
  if (mod === 11) return "0";
  if (mod === 10) return "1";
  return String(mod);
}

export function buildAccessKey(input: {
  issueDate: Date;
  docType: string;
  ruc: string;
  environment: "1" | "2";
  estab: string;
  ptoEmi: string;
  secuencial: string;
  numericCode: string;
  emissionType?: string;
}): string {
  const dd = String(input.issueDate.getDate()).padStart(2, "0");
  const mm = String(input.issueDate.getMonth() + 1).padStart(2, "0");
  const yyyy = String(input.issueDate.getFullYear());
  const datePart = `${dd}${mm}${yyyy}`;
  const base =
    datePart +
    input.docType +
    input.ruc.padStart(13, "0").slice(0, 13) +
    input.environment +
    input.estab.padStart(3, "0").slice(0, 3) +
    input.ptoEmi.padStart(3, "0").slice(0, 3) +
    input.secuencial.padStart(9, "0").slice(0, 9) +
    input.numericCode.padStart(8, "0").slice(0, 8) +
    (input.emissionType ?? "1");
  return base + sriMod11CheckDigit(base);
}

export function formatSeries(estab: string, ptoEmi: string, secuencial: string) {
  return `${estab.padStart(3, "0")}-${ptoEmi.padStart(3, "0")}-${secuencial.padStart(9, "0")}`;
}

export function randomNumericCode() {
  return String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0");
}
