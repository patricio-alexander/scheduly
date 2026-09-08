import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

export type GitRunResult = {
  ok: boolean;
  code: number;
  stdout: string;
  stderr: string;
};

/** Archivos que nunca deben subirse con el helper del menú. */
const NEVER_ADD = [
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.production.local",
  ".env.test.local",
];

export function runGit(args: string[], opts?: { inherit?: boolean }): GitRunResult {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: opts?.inherit ? "inherit" : "pipe",
  });

  const stdout = (result.stdout ?? "").toString().trim();
  const stderr = (result.stderr ?? "").toString().trim();
  const code = result.status ?? 1;

  return {
    ok: code === 0,
    code,
    stdout,
    stderr,
  };
}

export function gitRepoRoot(): string | null {
  const r = runGit(["rev-parse", "--show-toplevel"]);
  return r.ok ? r.stdout : null;
}

export function gitCurrentBranch(): string {
  const r = runGit(["branch", "--show-current"]);
  return r.ok ? r.stdout : "(desconocida)";
}

export function gitStatusPorcelain(): string {
  return runGit(["status", "--porcelain"]).stdout;
}

export function gitShortStatus(): string {
  return runGit(["status", "-sb"]).stdout;
}

export function printGitStatus() {
  const branch = gitCurrentBranch();
  const remote = runGit(["remote", "-v"]).stdout;
  const status = gitShortStatus();
  const porcelain = gitStatusPorcelain();

  console.log("");
  console.log(`Rama: ${branch}`);
  if (remote) {
    const first = remote.split("\n")[0] ?? "";
    console.log(`Remote: ${first.replace(/\s+/g, " ")}`);
  }
  console.log("");
  console.log(status || "(limpio)");

  const lines = porcelain ? porcelain.split("\n").filter(Boolean) : [];
  if (lines.length > 0) {
    console.log("");
    console.log(`Cambios pendientes: ${lines.length}`);
  } else {
    console.log("");
    console.log("Sin cambios pendientes.");
  }
}

export function stageAllSafe(): GitRunResult {
  const added = runGit(["add", "-A"]);
  if (!added.ok) return added;

  for (const secret of NEVER_ADD) {
    const full = path.join(ROOT, secret);
    if (!existsSync(full)) continue;
    const reset = runGit(["reset", "HEAD", "--", secret]);
    if (reset.ok || reset.stderr.includes("Unstaged")) {
      console.log(`  (omitido secreto) ${secret}`);
    }
  }

  return { ok: true, code: 0, stdout: "", stderr: "" };
}

export function commitWithMessage(message: string): GitRunResult {
  return runGit(["commit", "-m", message]);
}

export function pushCurrentBranch(): GitRunResult {
  // -u por si aún no trackea
  return runGit(["push", "-u", "origin", "HEAD"], { inherit: true });
}

export function hasUpstream(): boolean {
  const r = runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  return r.ok;
}
