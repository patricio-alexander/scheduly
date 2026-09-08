/**
 * Historial JSON de testers (scripts/).
 * - scripts/history/log.jsonl  → una línea por corrida (análisis rápido)
 * - scripts/history/runs/*.json → detalle completo por corrida
 */
import { mkdirSync, appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { StoryScene } from "./bot-story";
import { c } from "./menu-ui";

const HISTORY_DIR = join(process.cwd(), "scripts", "history");
const RUNS_DIR = join(HISTORY_DIR, "runs");
const LOG_FILE = join(HISTORY_DIR, "log.jsonl");

export type HistoryScene = {
  id: string;
  title: string;
  ok: boolean;
  lines: string[];
};

export type HistorySubject = {
  username?: string;
  name?: string;
  role?: string;
  branchKey?: string;
  ok: boolean;
  passed: number;
  failed: number;
  total: number;
  scenes?: HistoryScene[];
};

export type TestHistoryEntry = {
  id: string;
  at: string;
  tester: "admin-tour" | "owner-tour" | "employee-tour" | "login-tester" | string;
  mode?: string;
  baseUrl: string;
  durationMs: number;
  ok: boolean;
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
  actor?: {
    username?: string;
    name?: string;
    role?: string;
    branchKey?: string;
  };
  scenes?: HistoryScene[];
  subjects?: HistorySubject[];
  cases?: Array<{
    username: string;
    label?: string;
    ok: boolean;
    detail: string;
  }>;
  meta?: Record<string, unknown>;
};

const ANSI_RE = /\x1b\[[0-9;]*m/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

export function scenesForHistory(scenes: StoryScene[]): HistoryScene[] {
  return scenes.map((s) => ({
    id: s.id,
    title: stripAnsi(s.title),
    ok: s.ok,
    lines: s.lines.map(stripAnsi),
  }));
}

export function summarizeScenes(scenes: StoryScene[] | HistoryScene[]) {
  const total = scenes.length;
  const passed = scenes.filter((s) => s.ok).length;
  const failed = total - passed;
  return { passed, failed, total, ok: failed === 0 };
}

function stampId(tester: string): string {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 7);
  return `${iso}_${tester}_${rand}`;
}

function ensureDirs() {
  mkdirSync(RUNS_DIR, { recursive: true });
}

/** Guarda corrida en log.jsonl + runs/<id>.json. Devuelve rutas. */
export function saveTestHistory(
  partial: Omit<TestHistoryEntry, "id" | "at"> & {
    id?: string;
    at?: string;
  },
): { id: string; runPath: string; logPath: string } {
  ensureDirs();
  const id = partial.id ?? stampId(partial.tester);
  const at = partial.at ?? new Date().toISOString();
  const entry: TestHistoryEntry = {
    ...partial,
    id,
    at,
  };

  const runPath = join(RUNS_DIR, `${id}.json`);
  writeFileSync(runPath, `${JSON.stringify(entry, null, 2)}\n`, "utf8");

  const line = {
    id: entry.id,
    at: entry.at,
    tester: entry.tester,
    mode: entry.mode ?? null,
    ok: entry.ok,
    passed: entry.summary.passed,
    failed: entry.summary.failed,
    total: entry.summary.total,
    durationMs: entry.durationMs,
    actor: entry.actor?.username ?? entry.actor?.name ?? null,
    subjects: entry.subjects?.map((s) => s.username ?? s.name) ?? null,
  };
  appendFileSync(LOG_FILE, `${JSON.stringify(line)}\n`, "utf8");

  console.log(
    `${c.dim}Historial guardado: scripts/history/runs/${id}.json${c.reset}`,
  );
  console.log(`${c.dim}Índice: scripts/history/log.jsonl${c.reset}`);

  return { id, runPath, logPath: LOG_FILE };
}
