/**
 * UI del menú: colores, flechas ↑↓, Enter, Esc/q.
 * Estilo igual al launcher de EdDeli/Store/Tienda.
 */
import readline from "node:readline";

export const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  brightCyan: "\x1b[96m",
  brightMagenta: "\x1b[95m",
  brightYellow: "\x1b[93m",
  brightGreen: "\x1b[92m",
  brightBlue: "\x1b[94m",
  bg: "\x1b[45m\x1b[97m\x1b[1m",
  clear: "\x1b[2J\x1b[H",
  hide: "\x1b[?25l",
  show: "\x1b[?25h",
};

export const GROUP_COLOR: Record<string, string> = {
  magenta: c.brightMagenta,
  cyan: c.brightCyan,
  yellow: c.brightYellow,
  blue: c.brightBlue,
  green: c.brightGreen,
};

export function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function defaultCommitNote(): string {
  return `update ${nowStamp()}`;
}

export function assertTty(appLabel: string) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(
      "Este menú necesita una terminal interactiva (TTY).\n" +
        `Abrí una terminal y corré: npm run scripts  (${appLabel})`,
    );
    process.exit(1);
  }
}

export function dangerBadge(level: "low" | "med" | "high" = "low") {
  if (level === "high") return `${c.red}${c.bold}✖ PELIGRO${c.reset}`;
  if (level === "med") return `${c.yellow}${c.bold}◆ escribe${c.reset}`;
  return `${c.green}○ seguro${c.reset}`;
}

export type MenuRow = {
  kind: string;
  title?: string;
  id?: string;
  color?: string;
  count?: number;
  index?: number;
  item?: ScriptItem;
};

export type ScriptItem = {
  id: string;
  title: string;
  desc: string;
  danger?: "low" | "med" | "high";
  write?: boolean;
  /** Acción interna (no archivo). */
  action: string;
};

export async function selectList(
  appLabel: string,
  title: string,
  rows: MenuRow[],
  detailFn: (row: MenuRow | undefined) => string,
): Promise<MenuRow | null> {
  let index = 0;

  const render = () => {
    const stamp = nowStamp();
    const lines: string[] = [];
    lines.push(
      `${c.brightMagenta}${c.bold}╔══════════════════════════════════════════╗${c.reset}`,
    );
    lines.push(
      `${c.brightMagenta}${c.bold}║${c.reset}  ${c.brightCyan}${c.bold}${appLabel}${c.reset} ${c.white}·${c.reset} ${c.brightYellow}${c.bold}Scripts Launcher${c.reset}          ${c.brightMagenta}${c.bold}║${c.reset}`,
    );
    lines.push(
      `${c.brightMagenta}${c.bold}╚══════════════════════════════════════════╝${c.reset}`,
    );
    lines.push(`${c.dim}${stamp}${c.reset}`);
    lines.push(`${c.cyan}${title}${c.reset}`);
    lines.push(`${c.dim}↑↓ mover  ·  Enter elegir  ·  Esc / q salir${c.reset}`);
    lines.push("");

    rows.forEach((row, i) => {
      const selected = i === index;
      const pointer = selected ? `${c.bg} ❯ ${c.reset}` : "   ";
      let label = row.title || row.item?.title || "";

      if (row.kind === "group") {
        const col = GROUP_COLOR[row.color || ""] || c.brightCyan;
        label = `${col}${c.bold}▸ ${row.title}${c.reset}  ${c.dim}(${row.count})${c.reset}`;
      } else if (row.kind === "script" && row.item) {
        const tone =
          row.item.danger === "high"
            ? c.red
            : row.item.danger === "med"
              ? c.yellow
              : c.brightCyan;
        label = `${tone}${row.item.title}${c.reset}  ${dangerBadge(row.item.danger || "low")}`;
      } else if (row.kind === "back") {
        label = `${c.brightBlue}← Volver${c.reset}`;
      } else if (row.kind === "exit") {
        label = `${c.red}Salir${c.reset}`;
      }

      lines.push(
        selected ? `${pointer}${c.bold}${label}${c.reset}` : `${pointer}${label}`,
      );
    });

    lines.push("");
    const detail = detailFn(rows[index]);
    if (detail) {
      lines.push(
        `${c.magenta}${c.dim}────────────────────────────────────────────${c.reset}`,
      );
      lines.push(detail);
    }
    process.stdout.write(c.clear + c.hide + lines.join("\n") + "\n");
  };

  render();

  return new Promise((resolve) => {
    const onKey = (buf: Buffer) => {
      const s = buf.toString("utf8");
      if (s === "\u0003" || s === "\u001b" || s === "q" || s === "Q") {
        cleanup();
        resolve(null);
        return;
      }
      if (s === "\u001b[A" || s === "k") {
        index = (index - 1 + rows.length) % rows.length;
        render();
        return;
      }
      if (s === "\u001b[B" || s === "j") {
        index = (index + 1) % rows.length;
        render();
        return;
      }
      if (s === "\r" || s === "\n") {
        cleanup();
        resolve(rows[index] ?? null);
      }
    };

    const cleanup = () => {
      process.stdin.off("data", onKey);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write(c.show);
    };

    process.stdin.resume();
    process.stdin.setRawMode(true);
    process.stdin.on("data", onKey);
  });
}

export function askConfirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`${question} ${c.dim}[s/N]${c.reset} `, (answer) => {
      rl.close();
      const a = String(answer || "")
        .trim()
        .toLowerCase();
      resolve(a === "s" || a === "si" || a === "sí" || a === "y" || a === "yes");
    });
  });
}

export function askText(question: string, fallback = ""): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const hint = fallback ? ` ${c.dim}[${fallback}]${c.reset}` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${hint}: `, (answer) => {
      rl.close();
      const v = String(answer || "").trim();
      resolve(v || fallback);
    });
  });
}

export function waitEnter(msg = "Enter para volver al menú…"): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`\n${c.dim}${msg}${c.reset} `, () => {
      rl.close();
      resolve();
    });
  });
}
