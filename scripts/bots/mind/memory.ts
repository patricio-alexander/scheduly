/**
 * Memoria de aprendizaje de bots (filesystem).
 * - scripts/history/memory/<rol>.json  → stats por probe + comentarios
 * - scripts/history/diary/YYYY-MM-DD.md → bitácora legible (humano / IA)
 * - scripts/history/LEARNING.md        → digest actualizado (lo que el agente lee)
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { join } from "node:path";
import type { BotRole } from "./route-catalog";
import { c, nowStamp } from "../../lib/menu-ui";

const HISTORY_DIR = join(process.cwd(), "scripts", "history");
const MEMORY_DIR = join(HISTORY_DIR, "memory");
const DIARY_DIR = join(HISTORY_DIR, "diary");
const DIGEST_FILE = join(HISTORY_DIR, "LEARNING.md");

export type ProbeMemory = {
  probeId: string;
  label: string;
  hits: number;
  pass: number;
  fail: number;
  lastStatus: number | null;
  lastAt: string | null;
  lastNote: string | null;
  /** 0–1 · consistencia (pass/hits) */
  confidence: number;
};

export type MemoryComment = {
  at: string;
  kind: "observe" | "learn" | "fail" | "ui" | "config" | "summary";
  text: string;
};

export type UiVisitMemory = {
  routeId: string;
  href: string;
  hits: number;
  lastAt: string;
};

export type BotRoleMemory = {
  role: BotRole;
  updatedAt: string;
  runs: number;
  totalProbes: number;
  totalPass: number;
  totalFail: number;
  probes: Record<string, ProbeMemory>;
  uiVisited: Record<string, UiVisitMemory>;
  /** últimos comentarios (cap) */
  comments: MemoryComment[];
  /** insights destilados (cap) */
  insights: string[];
};

const COMMENT_CAP = 80;
const INSIGHT_CAP = 40;

function ensureDirs() {
  mkdirSync(MEMORY_DIR, { recursive: true });
  mkdirSync(DIARY_DIR, { recursive: true });
}

function memoryPath(role: BotRole) {
  return join(MEMORY_DIR, `${role}.json`);
}

function emptyMemory(role: BotRole): BotRoleMemory {
  return {
    role,
    updatedAt: new Date().toISOString(),
    runs: 0,
    totalProbes: 0,
    totalPass: 0,
    totalFail: 0,
    probes: {},
    uiVisited: {},
    comments: [],
    insights: [],
  };
}

export function loadRoleMemory(role: BotRole): BotRoleMemory {
  ensureDirs();
  const path = memoryPath(role);
  if (!existsSync(path)) return emptyMemory(role);
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as BotRoleMemory;
    return {
      ...emptyMemory(role),
      ...raw,
      role,
      probes: raw.probes ?? {},
      uiVisited: raw.uiVisited ?? {},
      comments: raw.comments ?? [],
      insights: raw.insights ?? [],
    };
  } catch {
    return emptyMemory(role);
  }
}

export function saveRoleMemory(mem: BotRoleMemory): string {
  ensureDirs();
  mem.updatedAt = new Date().toISOString();
  const path = memoryPath(mem.role);
  writeFileSync(path, `${JSON.stringify(mem, null, 2)}\n`, "utf8");
  return path;
}

export function addComment(
  mem: BotRoleMemory,
  kind: MemoryComment["kind"],
  text: string,
): void {
  mem.comments.push({
    at: new Date().toISOString(),
    kind,
    text: text.trim(),
  });
  if (mem.comments.length > COMMENT_CAP) {
    mem.comments = mem.comments.slice(-COMMENT_CAP);
  }
}

export function addInsight(mem: BotRoleMemory, insight: string): void {
  const t = insight.trim();
  if (!t) return;
  if (mem.insights.includes(t)) return;
  mem.insights.push(t);
  if (mem.insights.length > INSIGHT_CAP) {
    mem.insights = mem.insights.slice(-INSIGHT_CAP);
  }
}

export function recordProbeResult(
  mem: BotRoleMemory,
  input: {
    probeId: string;
    label: string;
    pass: boolean;
    status: number;
    note: string;
  },
): void {
  const prev = mem.probes[input.probeId] ?? {
    probeId: input.probeId,
    label: input.label,
    hits: 0,
    pass: 0,
    fail: 0,
    lastStatus: null,
    lastAt: null,
    lastNote: null,
    confidence: 0,
  };
  prev.hits += 1;
  if (input.pass) prev.pass += 1;
  else prev.fail += 1;
  prev.lastStatus = input.status;
  prev.lastAt = new Date().toISOString();
  prev.lastNote = input.note;
  prev.label = input.label;
  prev.confidence = prev.hits > 0 ? prev.pass / prev.hits : 0;
  mem.probes[input.probeId] = prev;

  mem.totalProbes += 1;
  if (input.pass) mem.totalPass += 1;
  else mem.totalFail += 1;
}

export function recordUiVisit(
  mem: BotRoleMemory,
  input: { routeId: string; href: string },
): void {
  const prev = mem.uiVisited[input.routeId] ?? {
    routeId: input.routeId,
    href: input.href,
    hits: 0,
    lastAt: "",
  };
  prev.hits += 1;
  prev.lastAt = new Date().toISOString();
  prev.href = input.href;
  mem.uiVisited[input.routeId] = prev;
}

/** Peso para priorizar: fallos + poco visto + baja confianza. */
export function probeLearnWeight(
  mem: BotRoleMemory,
  probeId: string,
): number {
  const p = mem.probes[probeId];
  if (!p) return 8; // nunca visto → explorar
  let w = 1;
  if (p.fail > 0) w += 4 + Math.min(6, p.fail);
  if (p.hits < 3) w += 3;
  if (p.confidence < 0.7) w += 2;
  if (p.confidence >= 0.95 && p.hits >= 5) w = Math.max(0.4, w * 0.35);
  return w;
}

/** Baraja pesada según memoria (más peso = más chance al frente). */
export function weightedLearnOrder<T extends { id: string }>(
  items: T[],
  mem: BotRoleMemory,
): T[] {
  const scored = items.map((item) => ({
    item,
    score: probeLearnWeight(mem, item.id) * (0.6 + Math.random()),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

function dayKey(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Append al diario del día (Markdown). */
export function appendDiary(block: string): string {
  ensureDirs();
  const path = join(DIARY_DIR, `${dayKey()}.md`);
  const header = existsSync(path)
    ? ""
    : `# Diario de bots · ${dayKey()}\n\n` +
      `Notas de aprendizaje (legible por humano / IA). ` +
      `Memoria JSON: \`scripts/history/memory/\`.\n\n`;
  appendFileSync(path, `${header}${block.trim()}\n\n`, "utf8");
  return path;
}

export function writeLearningDigest(roles: BotRole[] = ["owner", "admin", "employee"]): string {
  ensureDirs();
  const lines: string[] = [
    `# LEARNING · Scheduly bots`,
    ``,
    `Actualizado: ${new Date().toISOString()}`,
    ``,
    `Este archivo lo lee el agente para ver cómo va el sistema según los bots.`,
    `Detalle diario: \`scripts/history/diary/\` · JSON: \`scripts/history/memory/\`.`,
    ``,
  ];

  for (const role of roles) {
    const mem = loadRoleMemory(role);
    lines.push(`## Rol \`${role}\``);
    lines.push(``);
    lines.push(
      `- Corridas: **${mem.runs}** · probes: ${mem.totalProbes} (OK ${mem.totalPass} / FAIL ${mem.totalFail})`,
    );
    lines.push(`- Actualizado: ${mem.updatedAt || "—"}`);
    lines.push(``);

    const weak = Object.values(mem.probes)
      .filter((p) => p.fail > 0 || p.confidence < 0.8)
      .sort((a, b) => b.fail - a.fail || a.confidence - b.confidence)
      .slice(0, 8);
    if (weak.length) {
      lines.push(`### Áreas flojas / a vigilar`);
      for (const p of weak) {
        lines.push(
          `- \`${p.probeId}\` ${p.label}: conf ${(p.confidence * 100).toFixed(0)}% · fail ${p.fail}/${p.hits} · ${p.lastNote ?? ""}`,
        );
      }
      lines.push(``);
    }

    const strong = Object.values(mem.probes)
      .filter((p) => p.hits >= 3 && p.confidence >= 0.9)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 6);
    if (strong.length) {
      lines.push(`### Ya confía`);
      for (const p of strong) {
        lines.push(
          `- \`${p.probeId}\` ${p.label}: ${(p.confidence * 100).toFixed(0)}% (${p.hits} hits)`,
        );
      }
      lines.push(``);
    }

    if (mem.insights.length) {
      lines.push(`### Insights`);
      for (const i of mem.insights.slice(-10)) {
        lines.push(`- ${i}`);
      }
      lines.push(``);
    }

    if (mem.comments.length) {
      lines.push(`### Últimos comentarios`);
      for (const cmt of mem.comments.slice(-8)) {
        lines.push(`- \`[${cmt.kind}]\` ${cmt.text}`);
      }
      lines.push(``);
    }

    const ui = Object.values(mem.uiVisited)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 8);
    if (ui.length) {
      lines.push(`### Pantallas visitadas (tour mental)`);
      for (const u of ui) {
        lines.push(`- ${u.href} ×${u.hits}`);
      }
      lines.push(``);
    }
  }

  writeFileSync(DIGEST_FILE, `${lines.join("\n")}\n`, "utf8");
  return DIGEST_FILE;
}

export type LearningCommitInput = {
  role: BotRole;
  actorLabel: string;
  minutes: number;
  probed: number;
  passed: number;
  failed: number;
  /** comentarios de esta corrida */
  sessionComments: MemoryComment[];
  /** insights nuevos */
  sessionInsights: string[];
};

/** Cierra corrida: guarda memoria + diario + digest. */
export function commitLearning(input: LearningCommitInput): {
  memoryPath: string;
  diaryPath: string;
  digestPath: string;
} {
  const mem = loadRoleMemory(input.role);
  mem.runs += 1;

  for (const cmt of input.sessionComments) {
    mem.comments.push(cmt);
  }
  if (mem.comments.length > COMMENT_CAP) {
    mem.comments = mem.comments.slice(-COMMENT_CAP);
  }
  for (const i of input.sessionInsights) addInsight(mem, i);

  const summary =
    `${input.actorLabel}: ${input.minutes} min · probes ${input.probed} · ` +
    `OK ${input.passed} · FAIL ${input.failed}`;
  addComment(mem, "summary", summary);

  if (input.failed === 0 && input.probed > 0) {
    addInsight(
      mem,
      `Corrida limpia (${input.probed} probes) como ${input.role} · ${new Date().toISOString().slice(0, 10)}`,
    );
  } else if (input.failed > 0) {
    addInsight(
      mem,
      `Hubo ${input.failed} fallos allow/deny como ${input.role} · revisar permisos o catálogo`,
    );
  }

  const memoryPath = saveRoleMemory(mem);

  const diaryLines = [
    `## ${nowStamp()} · ${input.actorLabel} (\`${input.role}\`)`,
    ``,
    `- Tiempo: **${input.minutes} min** · probes **${input.probed}** · OK ${input.passed} · FAIL **${input.failed}**`,
    ``,
  ];
  if (input.sessionComments.length) {
    diaryLines.push(`### Comentarios`);
    for (const cmt of input.sessionComments) {
      diaryLines.push(`- **${cmt.kind}**: ${cmt.text}`);
    }
    diaryLines.push(``);
  }
  if (input.sessionInsights.length) {
    diaryLines.push(`### Aprendí`);
    for (const i of input.sessionInsights) {
      diaryLines.push(`- ${i}`);
    }
    diaryLines.push(``);
  }
  const weak = Object.values(mem.probes)
    .filter((p) => p.fail > 0)
    .sort((a, b) => b.fail - a.fail)
    .slice(0, 5);
  if (weak.length) {
    diaryLines.push(`### Memoria · sigue flojo`);
    for (const p of weak) {
      diaryLines.push(
        `- \`${p.probeId}\`: fail ${p.fail}/${p.hits} · ${p.lastNote ?? ""}`,
      );
    }
    diaryLines.push(``);
  }

  const diaryPath = appendDiary(diaryLines.join("\n"));
  const digestPath = writeLearningDigest();

  console.log(
    `${c.dim}Memoria: ${memoryPath.replace(process.cwd() + "/", "")}${c.reset}`,
  );
  console.log(
    `${c.dim}Diario: ${diaryPath.replace(process.cwd() + "/", "")}${c.reset}`,
  );
  console.log(
    `${c.dim}Digest IA: ${digestPath.replace(process.cwd() + "/", "")}${c.reset}`,
  );

  return { memoryPath, diaryPath, digestPath };
}

/** Resumen corto para escena de inicio. */
export function memoryWakeLines(mem: BotRoleMemory): string[] {
  const known = Object.keys(mem.probes).length;
  const weak = Object.values(mem.probes).filter((p) => p.fail > 0).length;
  const lines = [
    `Memoria: ${mem.runs} corrida(s) · ${known} rutas conocidas · flojas ${weak}`,
  ];
  const last = mem.comments.filter((c) => c.kind !== "summary").slice(-2);
  for (const cmt of last) {
    lines.push(`Recuerda: ${cmt.text}`);
  }
  if (mem.insights.length) {
    lines.push(`Insight: ${mem.insights[mem.insights.length - 1]}`);
  }
  return lines;
}
