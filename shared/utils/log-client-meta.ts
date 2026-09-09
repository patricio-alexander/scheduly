/**
 * Helpers de cliente HTTP para SystemLog (IP + navegador desde User-Agent).
 */

export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first.slice(0, 80);
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 80);
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 80);
  return "local";
}

/** Resume User-Agent a algo legible (Chrome 131 · Windows, etc.). */
export function parseBrowserLabel(uaRaw: string | null | undefined): string {
  const ua = String(uaRaw || "").trim();
  if (!ua) return "Desconocido";

  let os = "OS ?";
  if (/Windows NT 10/i.test(ua)) os = "Windows";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";

  let browser = "Navegador";
  let ver = "";
  const edge = ua.match(/Edg\/([\d.]+)/);
  const chrome = ua.match(/Chrome\/([\d.]+)/);
  const firefox = ua.match(/Firefox\/([\d.]+)/);
  const safari = ua.match(/Version\/([\d.]+).*Safari/);
  const curl = /^curl\//i.test(ua);
  const node = /^node(-fetch)?/i.test(ua) || /undici/i.test(ua);
  const simulador = /Scheduly-Simulador/i.test(ua);

  if (simulador) {
    const flow = (ua.match(/flow\/([^\s);]+)/i) || [])[1] || "";
    return flow
      ? `Simulador Archify · ${flow}`.slice(0, 120)
      : "Simulador Archify · Bot";
  } else if (curl) {
    browser = "curl";
    ver = (ua.match(/curl\/([\d.]+)/i) || [])[1] || "";
  } else if (node) {
    browser = "Node/API";
  } else if (edge) {
    browser = "Edge";
    ver = edge[1].split(".")[0] || "";
  } else if (chrome && !/Chromium/i.test(ua)) {
    browser = "Chrome";
    ver = chrome[1].split(".")[0] || "";
  } else if (firefox) {
    browser = "Firefox";
    ver = firefox[1].split(".")[0] || "";
  } else if (safari) {
    browser = "Safari";
    ver = safari[1].split(".")[0] || "";
  }

  const verPart = ver ? ` ${ver}` : "";
  return `${browser}${verPart} · ${os}`.slice(0, 120);
}

/** Empaqueta IP + browser + UA corto para el campo `system` (estilo EdDeli ampliado). */
export function formatLogSystem(opts: {
  ip?: string | null;
  browser?: string | null;
  userAgent?: string | null;
}): string {
  const ip = (opts.ip || "local").slice(0, 80);
  const browser = (opts.browser || parseBrowserLabel(opts.userAgent)).slice(0, 120);
  const ua = String(opts.userAgent || "").slice(0, 280);
  return `IP ${ip} · ${browser}${ua ? ` · UA ${ua}` : ""}`.slice(0, 500);
}

export function formatLogClock(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()} ` +
    `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
  );
}
