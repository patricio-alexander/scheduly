/**
 * Motor de conciencia del bot: durante N minutos “cliclea” pantallas,
 * prueba APIs allow/deny, comenta y actualiza memoria de aprendizaje.
 */
import { c, nowStamp } from "../../lib/menu-ui";
import { getJson, type HttpResult } from "../../lib/http";
import {
  API_PROBES,
  evaluateProbe,
  type ApiProbe,
  type BotRole,
} from "./route-catalog";
import type { StoryScene } from "../../lib/bot-story";
import { asArray } from "../../lib/bot-story";
import {
  addComment,
  commitLearning,
  loadRoleMemory,
  memoryWakeLines,
  probeLearnWeight,
  recordProbeResult,
  recordUiVisit,
  saveRoleMemory,
  weightedLearnOrder,
  type MemoryComment,
  type BotRoleMemory,
} from "./memory";
import { uiStopsForRole, type UiTourStop } from "./ui-tour";

export type ConsciousnessOpts = {
  role: BotRole;
  baseUrl: string;
  cookie: string;
  minutes: number;
  actorLabel: string;
  userId?: number | null;
  useBranchFilter?: boolean;
  pauseMs?: number;
  onScene?: (scene: StoryScene, index: number) => void;
  /**
   * Si true (o BOT_ALLOW_WRITES=1), dueña puede hacer un “tacto” reversible
   * de settings (flag tour) y restaurar — deja comentario en diario.
   */
  allowConfigTouch?: boolean;
};

export type ConsciousnessResult = {
  scenes: StoryScene[];
  probed: number;
  passed: number;
  failed: number;
  minutes: number;
  learning?: {
    memoryPath: string;
    diaryPath: string;
    digestPath: string;
  };
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function withUserId(path: string, userId?: number | null) {
  if (!userId || !path.includes("/api/dashboard")) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}userId=${userId}`;
}

function withBranch(path: string, branchId: number | null) {
  if (!branchId) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}branchId=${branchId}`;
}

async function loadBranches(
  baseUrl: string,
  cookie: string,
): Promise<Array<{ id: number; name: string }>> {
  const res = await getJson(`${baseUrl}/api/branches`, cookie);
  if (!res.ok) return [];
  return (asArray(res.body) as Array<{ id?: number; name?: string }>)
    .filter((b) => Number.isInteger(b.id) && (b.id as number) > 0)
    .map((b) => ({ id: b.id as number, name: b.name ?? `#${b.id}` }));
}

function probeById(id: string): ApiProbe | undefined {
  return API_PROBES.find((p) => p.id === id);
}

function commentObserve(
  session: MemoryComment[],
  text: string,
): MemoryComment {
  const cmt: MemoryComment = {
    at: new Date().toISOString(),
    kind: "observe",
    text,
  };
  session.push(cmt);
  return cmt;
}

function buildDeck(
  mem: BotRoleMemory,
  role: BotRole,
): Array<
  | { kind: "ui"; stop: UiTourStop }
  | { kind: "probe"; probe: ApiProbe }
> {
  const stops = uiStopsForRole(role)
    .map((s) => {
      const visit = mem.uiVisited[s.id];
      const weakProbes = s.probeIds.filter((id) => {
        const p = mem.probes[id];
        return !p || p.fail > 0 || p.confidence < 0.8;
      }).length;
      const score =
        (visit ? 1 / (1 + visit.hits) : 4) + weakProbes * 1.5 + Math.random();
      return { stop: s, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.stop);

  const probes = weightedLearnOrder(API_PROBES, mem);

  const deck: Array<
    | { kind: "ui"; stop: UiTourStop }
    | { kind: "probe"; probe: ApiProbe }
  > = [];

  const max = Math.max(stops.length, probes.length);
  for (let i = 0; i < max; i++) {
    if (i < stops.length) deck.push({ kind: "ui", stop: stops[i] });
    if (i < probes.length) deck.push({ kind: "probe", probe: probes[i] });
  }
  return deck;
}

export async function runConsciousnessLoop(
  opts: ConsciousnessOpts,
): Promise<ConsciousnessResult> {
  const minutes = Math.max(0.2, opts.minutes);
  const deadline = Date.now() + minutes * 60_000;
  const pause = opts.pauseMs ?? 450;
  const scenes: StoryScene[] = [];
  let probed = 0;
  let passed = 0;
  let failed = 0;
  let cursor = 0;

  const mem = loadRoleMemory(opts.role);
  const sessionComments: MemoryComment[] = [];
  const sessionInsights: string[] = [];

  const branches = opts.useBranchFilter
    ? await loadBranches(opts.baseUrl, opts.cookie)
    : [];

  const wake = memoryWakeLines(mem);
  const think: StoryScene = {
    id: "conscious-start",
    title: `${opts.actorLabel} · despierta`,
    ok: true,
    lines: [
      `${c.dim}${nowStamp()} · Conciencia ${minutes} min · rol ${opts.role}${c.reset}`,
      `${c.dim}Aprende: prioriza lo flojo / poco visto; deja diario.${c.reset}`,
      ...wake.map((l) => `${c.dim}${l}${c.reset}`),
      branches.length
        ? `${c.dim}Sucursales: ${branches.map((b) => b.name).join(" · ")}${c.reset}`
        : `${c.dim}Sin filtro de sucursal (o no aplica).${c.reset}`,
    ],
  };
  scenes.push(think);
  opts.onScene?.(think, scenes.length);
  commentObserve(
    sessionComments,
    `Despierta con ${mem.runs} corridas previas · ${Object.keys(mem.probes).length} rutas en memoria`,
  );

  let deck = buildDeck(mem, opts.role);
  let round = 1;

  const runOneProbe = async (
    probe: ApiProbe,
    ctx?: { fromUi?: string },
  ) => {
    const expect = probe.expect[opts.role];
    let branchId: number | null = null;
    let branchName = "";
    if (
      opts.useBranchFilter &&
      probe.branchAware &&
      branches.length > 0 &&
      Math.random() < 0.55
    ) {
      const b = branches[Math.floor(Math.random() * branches.length)];
      branchId = b.id;
      branchName = b.name;
    }

    let path = withUserId(probe.path, opts.userId);
    path = withBranch(path, branchId);
    const weight = probeLearnWeight(mem, probe.id);

    const thinkProbe: StoryScene = {
      id: `think-${probe.id}-${probed}`,
      title: `Piensa · ${probe.label}`,
      ok: true,
      lines: [
        `${c.dim}${nowStamp()} · GET ${path}${c.reset}`,
        ctx?.fromUi
          ? `${c.dim}Viene de pantalla ${ctx.fromUi}${c.reset}`
          : `${c.dim}Peso aprendizaje ${weight.toFixed(1)}${c.reset}`,
        expect === "allow"
          ? `${c.dim}Debería poder…${c.reset}`
          : expect === "deny"
            ? `${c.dim}No debería · espero bloqueo…${c.reset}`
            : `${c.dim}Solo comprueba respuesta…${c.reset}`,
        branchId
          ? `${c.dim}Filtro sucursal: ${branchName} (#${branchId})${c.reset}`
          : "",
      ].filter(Boolean),
    };
    scenes.push(thinkProbe);
    opts.onScene?.(thinkProbe, scenes.length);

    let res: HttpResult;
    try {
      res = await getJson(`${opts.baseUrl}${path}`, opts.cookie);
    } catch (err) {
      res = {
        ok: false,
        status: 0,
        body: { message: err instanceof Error ? err.message : "network" },
        setCookie: null,
      };
    }

    const verdict = evaluateProbe(expect, res.status, res.ok);
    probed += 1;
    if (verdict.pass) passed += 1;
    else failed += 1;

    recordProbeResult(mem, {
      probeId: probe.id,
      label: probe.label,
      pass: verdict.pass,
      status: res.status,
      note: verdict.note,
    });

    if (!verdict.pass) {
      const failText = `Fallo ${probe.id} (${probe.label}): ${verdict.note} · ${path}`;
      sessionComments.push({
        at: new Date().toISOString(),
        kind: "fail",
        text: failText,
      });
      sessionInsights.push(
        `Hueco o bug: ${probe.label} como ${opts.role} → ${verdict.note}`,
      );
    } else if (expect === "deny") {
      sessionComments.push({
        at: new Date().toISOString(),
        kind: "learn",
        text: `Confirmado: ${opts.role} no entra a ${probe.label} (HTTP ${res.status})`,
      });
    }

    // Observación de datos (si allow y body útil)
    if (verdict.pass && expect === "allow" && res.body != null) {
      const arr = asArray(res.body);
      if (arr.length > 0) {
        commentObserve(
          sessionComments,
          `${probe.label}: vi ${arr.length} ítem(s) en respuesta`,
        );
      } else if (
        typeof res.body === "object" &&
        res.body &&
        "businessName" in (res.body as object)
      ) {
        const bn = String(
          (res.body as { businessName?: string }).businessName ?? "",
        );
        if (bn) {
          commentObserve(sessionComments, `Settings: negocio «${bn}»`);
        }
      }
    }

    const scene: StoryScene = {
      id: `probe-${probe.id}-${probed}`,
      title: `${verdict.pass ? "✓" : "✗"} ${probe.label}`,
      ok: verdict.pass,
      lines: [
        `${nowStamp()} · HTTP ${res.status} · ${path}`,
        verdict.note,
        expect === "allow"
          ? `Esperado: acceso`
          : expect === "deny"
            ? `Esperado: sin permiso`
            : `Esperado: respuesta`,
      ],
    };
    scenes.push(scene);
    opts.onScene?.(scene, scenes.length);
  };

  while (Date.now() < deadline) {
    const leftNow = deadline - Date.now();
    if (leftNow < 600) break;

    if (cursor >= deck.length) {
      deck = buildDeck(mem, opts.role);
      cursor = 0;
      round += 1;
      const lap: StoryScene = {
        id: `lap-${round}`,
        title: `Otra vuelta (ronda ${round}) · sigue aprendiendo`,
        ok: true,
        lines: [
          `${c.dim}Reordena por memoria (flojo primero).${c.reset}`,
          `${c.dim}Restante ~${Math.max(0, Math.round(leftNow / 1000))}s${c.reset}`,
        ],
      };
      scenes.push(lap);
      opts.onScene?.(lap, scenes.length);
    }

    const step = deck[cursor++];
    if (step.kind === "ui") {
      // No arrancar un clic largo si queda poco tiempo
      if (deadline - Date.now() < 900) break;

      const stop = step.stop;
      recordUiVisit(mem, { routeId: stop.id, href: stop.href });
      sessionComments.push({
        at: new Date().toISOString(),
        kind: "ui",
        text: `Abre ${stop.href} · ${stop.intent}`,
      });

      const clickScene: StoryScene = {
        id: `ui-${stop.id}-${probed}`,
        title: `Clic · ${stop.label}`,
        ok: true,
        lines: [
          `${c.dim}${nowStamp()} · navega ${stop.href}${c.reset}`,
          stop.intent,
          `${c.dim}Luego mira APIs: ${stop.probeIds.join(", ")}${c.reset}`,
        ],
      };
      scenes.push(clickScene);
      opts.onScene?.(clickScene, scenes.length);

      for (const pid of stop.probeIds) {
        if (Date.now() >= deadline - 400) break;
        const probe = probeById(pid);
        if (!probe) continue;
        await runOneProbe(probe, { fromUi: stop.href });
        const left = deadline - Date.now();
        if (left <= 400) break;
        await sleep(Math.min(pause, Math.max(0, left - 200)));
      }
      continue;
    }

    if (Date.now() >= deadline - 400) break;
    await runOneProbe(step.probe);
    const left = deadline - Date.now();
    if (left <= 400) break;
    await sleep(Math.min(pause, Math.max(0, left - 200)));
  }

  // Tacto de config (solo dueña + flag) — reversible; no si ya se acabó el tiempo
  const allowWrites =
    opts.allowConfigTouch === true ||
    process.env.BOT_ALLOW_WRITES?.trim() === "1";
  if (
    allowWrites &&
    opts.role === "owner" &&
    Date.now() < deadline - 500
  ) {
    const touch = await tryConfigTouch(opts, mem, sessionComments, sessionInsights);
    if (touch) {
      scenes.push(touch);
      opts.onScene?.(touch, scenes.length);
    }
  }

  const end: StoryScene = {
    id: "conscious-end",
    title: `${opts.actorLabel} · se detiene`,
    ok: failed === 0,
    lines: [
      `Tiempo: ${minutes} min · probes: ${probed}`,
      `OK ${passed} · FAIL ${failed}`,
      failed === 0
        ? `${c.green}Permisos coherentes · memoria actualizada.${c.reset}`
        : `${c.red}Fallos de expectativa · quedaron en diario/memoria.${c.reset}`,
    ],
  };
  scenes.push(end);
  opts.onScene?.(end, scenes.length);

  // Persistir stats de probes antes del commit (commit recarga JSON)
  saveRoleMemory(mem);

  const learning = commitLearning({
    role: opts.role,
    actorLabel: opts.actorLabel,
    minutes,
    probed,
    passed,
    failed,
    sessionComments,
    sessionInsights,
  });

  return { scenes, probed, passed, failed, minutes, learning };
}

async function tryConfigTouch(
  opts: ConsciousnessOpts,
  mem: BotRoleMemory,
  sessionComments: MemoryComment[],
  sessionInsights: string[],
): Promise<StoryScene | null> {
  try {
    const { getJson, patchJson } = await import("../../lib/http");
    const get = await getJson(`${opts.baseUrl}/api/settings`, opts.cookie);
    if (!get.ok) {
      sessionComments.push({
        at: new Date().toISOString(),
        kind: "config",
        text: `Quiso tocar settings pero GET falló HTTP ${get.status}`,
      });
      return {
        id: "config-touch-fail-get",
        title: "Config · no pudo leer",
        ok: false,
        lines: [`HTTP ${get.status}`],
      };
    }
    const body = (get.body ?? {}) as {
      businessName?: string;
      operationFlags?: Record<string, boolean>;
    };
    const flags = { ...(body.operationFlags ?? {}) };
    const key = "showProductCostInSelect";
    const prev = flags[key] === true;
    flags[key] = !prev;
    const patch = await patchJson(
      `${opts.baseUrl}/api/settings`,
      { operationFlags: flags },
      opts.cookie,
    );
    // restore inmediato
    flags[key] = prev;
    const restore = await patchJson(
      `${opts.baseUrl}/api/settings`,
      { operationFlags: flags },
      opts.cookie,
    );
    const ok = patch.ok && restore.ok;
    const text = ok
      ? `Tacto config reversible OK (flag ${key} ${prev}↔${!prev}→${prev}) · «${body.businessName ?? "—"}»`
      : `Tacto config falló patch=${patch.status} restore=${restore.status}`;
    sessionComments.push({
      at: new Date().toISOString(),
      kind: "config",
      text,
    });
    if (ok) {
      sessionInsights.push(
        "Puede mutar operationFlags y restaurar (BOT_ALLOW_WRITES)",
      );
      addComment(mem, "config", text);
    }
    return {
      id: "config-touch",
      title: ok ? "✓ Config · tacto + restore" : "✗ Config · tacto",
      ok,
      lines: [text, `${nowStamp()}`],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    sessionComments.push({
      at: new Date().toISOString(),
      kind: "config",
      text: `Error tacto config: ${msg}`,
    });
    return {
      id: "config-touch-err",
      title: "✗ Config · error",
      ok: false,
      lines: [msg],
    };
  }
}

export function resolveBotMinutes(raw?: string | null, fallback = 10): number {
  const n = Number(String(raw ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(180, n);
}

/**
 * Reparte el tiempo total entre N actores sin pasarse del reloj de pared.
 * Devuelve minutos para el siguiente actor según ms restantes y cuántos quedan.
 */
export function nextActorSliceMinutes(
  wallEndMs: number,
  actorsLeftIncludingCurrent: number,
  minSliceMin = 0.05,
): number {
  const leftMs = Math.max(0, wallEndMs - Date.now());
  if (leftMs < 800) return 0;
  const n = Math.max(1, actorsLeftIncludingCurrent);
  const fair = leftMs / 60_000 / n;
  return Math.max(minSliceMin, Math.min(fair, leftMs / 60_000));
}
