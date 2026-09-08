/**
 * Narrativa de bots: “como si la persona estuviera revisando el sistema”.
 */
import { c } from "./menu-ui";
import { renderProgress } from "./progress";

export type StoryScene = {
  id: string;
  title: string;
  ok: boolean;
  lines: string[];
};

export function money(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(v);
}

export function num(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "0";
  return String(Math.round(v));
}

export function asArray(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    for (const key of [
      "items",
      "data",
      "rows",
      "results",
      "products",
      "customers",
      "events",
    ]) {
      if (Array.isArray(o[key])) return o[key] as unknown[];
    }
  }
  return [];
}

export function msgOf(body: unknown): string {
  if (body && typeof body === "object" && "message" in body) {
    return String((body as { message: unknown }).message);
  }
  return "";
}

export function printHeader(actor: {
  name: string;
  role: string;
  business: string;
  place?: string;
}) {
  console.log("");
  console.log(
    `${c.brightMagenta}${c.bold}╔════════════════════════════════════════════════╗${c.reset}`,
  );
  console.log(
    `${c.brightMagenta}${c.bold}║${c.reset}  ${c.brightCyan}${c.bold}${actor.name}${c.reset}  ${c.dim}·${c.reset}  ${c.brightYellow}${c.bold}${actor.role}${c.reset}`,
  );
  console.log(
    `${c.brightMagenta}${c.bold}║${c.reset}  ${c.dim}${actor.business}${actor.place ? ` · ${actor.place}` : ""}${c.reset}`,
  );
  console.log(
    `${c.brightMagenta}${c.bold}╚════════════════════════════════════════════════╝${c.reset}`,
  );
  console.log(
    `${c.dim}Recorrido de revisión (solo lectura). Los encargados manejan los locales.${c.reset}`,
  );
  console.log("");
}

export function printScene(
  index: number,
  total: number,
  scene: StoryScene,
) {
  const stamp = new Date().toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const mark = scene.ok
    ? `${c.green}✓ OK${c.reset}`
    : `${c.red}✗ FAIL${c.reset}`;
  console.log(
    `${c.dim}[${stamp}]${c.reset} ${c.brightCyan}${c.bold}→ ${scene.title}${c.reset}  ${mark}`,
  );
  for (const line of scene.lines) {
    console.log(`   ${c.dim}${stamp}${c.reset}  ${line}`);
  }
  console.log(`   ${renderProgress(index, total)}`);
  console.log("");
}

export function printFooter(scenes: StoryScene[]) {
  const stamp = new Date().toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const ok = scenes.filter((s) => s.ok).length;
  const fail = scenes.length - ok;
  console.log(`${c.dim}${"─".repeat(48)}${c.reset}`);
  console.log(
    `${c.dim}[${stamp}]${c.reset} Resumen revisión: ${c.green}${ok} OK${c.reset} · ${fail > 0 ? c.red : c.dim}${fail} FAIL${c.reset} · ${scenes.length} módulos`,
  );
  if (fail > 0) {
    console.log("");
    console.log("Fallaron:");
    for (const s of scenes.filter((x) => !x.ok)) {
      console.log(`  · ${s.title}`);
      for (const line of s.lines.slice(0, 2)) console.log(`     ${line}`);
    }
  }
  console.log("");
}
