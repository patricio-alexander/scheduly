/**
 * Helpers compartidos del Tour Dueña (scripts/bots/owner/*).
 */
import {
  AG_OWNER,
} from "../../lib/andrea-guerrero-demo";
import {
  asArray,
  msgOf,
  printFooter,
  printHeader,
  printScene,
  type StoryScene,
} from "../../lib/bot-story";
import {
  extractSessionCookie,
  getJson,
  getSchedulyBaseUrl,
  postJson,
  type HttpResult,
} from "../../lib/http";
import { c } from "../../lib/menu-ui";
import {
  saveTestHistory,
  scenesForHistory,
  summarizeScenes,
} from "../../lib/test-history";

export type MeUser = {
  id?: number;
  personId?: number;
  name?: string;
  username?: string;
  role?: string;
};

export type OwnerSession = {
  baseUrl: string;
  cookie: string;
  me: MeUser;
  started: number;
};

export function failScene(id: string, title: string, res: HttpResult): StoryScene {
  return {
    id,
    title,
    ok: false,
    lines: [
      `${c.red}No pudo cargar correctamente${c.reset}`,
      `HTTP ${res.status}${msgOf(res.body) ? ` · ${msgOf(res.body)}` : ""}`,
    ],
  };
}

export function printOwnerHeader(place = "Loja") {
  printHeader({
    name: "Andrea Guerrero",
    role: "Dueña",
    business: "Andrea Guerrero Estética y Peluquería",
    place,
  });
}

export async function loginAsOwner(): Promise<
  | { ok: true; session: OwnerSession; scenes: StoryScene[] }
  | { ok: false; scenes: StoryScene[]; baseUrl: string; started: number }
> {
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const scenes: StoryScene[] = [];

  console.log(`${c.dim}URL: ${baseUrl}${c.reset}`);
  console.log(`${c.dim}(La app debe estar arriba: npm run dev)${c.reset}`);
  console.log("");
  console.log(
    `${c.brightYellow}${c.bold}Andrea Guerrero · rol Dueña · ingresando…${c.reset}`,
  );
  console.log("");

  const login = await postJson(`${baseUrl}/api/auth/login`, {
    username: AG_OWNER.username,
    password: AG_OWNER.password,
  });
  const cookie = extractSessionCookie(login.setCookie);

  if (!login.ok || !cookie) {
    const scene = failScene("login", "Ingreso al sistema", login);
    scenes.push(scene);
    printScene(1, 1, scene);
    return { ok: false, scenes, baseUrl, started };
  }

  const me = await getJson(`${baseUrl}/api/auth/me`, cookie);
  const meUser = (me.body ?? {}) as MeUser;
  const roleOk = me.ok && meUser.role === "owner";

  const loginScene: StoryScene = {
    id: "login",
    title: "Ingreso al sistema",
    ok: roleOk,
    lines: roleOk
      ? [
          `Entró como ${c.bold}${meUser.name || "Andrea Guerrero"}${c.reset}`,
          `Usuario: ${meUser.username ?? AG_OWNER.username} · rol: ${c.brightYellow}Dueña${c.reset}`,
        ]
      : [`Se esperaba Dueña, llegó: ${meUser.role ?? "?"}`],
  };
  scenes.push(loginScene);
  printScene(1, 8, loginScene);

  if (!roleOk) {
    return { ok: false, scenes, baseUrl, started };
  }

  return {
    ok: true,
    session: { baseUrl, cookie, me: meUser, started },
    scenes,
  };
}

export async function logoutOwner(
  session: OwnerSession,
  scenes: StoryScene[],
  totalHint: number,
) {
  const logout = await postJson(
    `${session.baseUrl}/api/auth/logout`,
    {},
    session.cookie,
  );
  const scene: StoryScene = {
    id: "logout",
    title: "Cierra sesión",
    ok: logout.ok || logout.status === 200,
    lines: [`Andrea Guerrero termina y sale del sistema.`],
  };
  scenes.push(scene);
  printScene(scenes.length, Math.max(totalHint, scenes.length), scene);
}

export function finishOwnerTour(
  mode: string,
  scenes: StoryScene[],
  baseUrl: string,
  started: number,
) {
  printFooter(scenes);
  const sum = summarizeScenes(scenes);
  saveTestHistory({
    tester: "owner-tour",
    mode,
    baseUrl,
    durationMs: Date.now() - started,
    ok: sum.ok,
    summary: sum,
    actor: {
      username: AG_OWNER.username,
      name: "Andrea Guerrero",
      role: "owner",
    },
    scenes: scenesForHistory(scenes),
  });
}

export async function reviewList(
  baseUrl: string,
  cookie: string,
  scenes: StoryScene[],
  total: number,
  opts: {
    id: string;
    title: string;
    path: string;
    emptyOk?: string;
    describe?: (items: unknown[]) => string[];
  },
) {
  const res = await getJson(`${baseUrl}${opts.path}`, cookie);
  if (!res.ok) {
    const scene = failScene(opts.id, opts.title, res);
    scenes.push(scene);
    printScene(scenes.length, total, scene);
    return;
  }
  const items = asArray(res.body);
  const scene: StoryScene = {
    id: opts.id,
    title: opts.title,
    ok: true,
    lines: [
      items.length > 0
        ? `Cargaron ${c.bold}${items.length}${c.reset} registro(s) correctamente`
        : opts.emptyOk ?? `La vista cargó bien · aún no hay registros (0)`,
      ...(opts.describe?.(items) ?? []),
    ],
  };
  scenes.push(scene);
  printScene(scenes.length, total, scene);
}

export {
  asArray,
  money,
  msgOf,
  num,
  printScene,
  type StoryScene,
} from "../../lib/bot-story";
export { c } from "../../lib/menu-ui";
export {
  deleteJson,
  getJson,
  patchJson,
  postJson,
  putJson,
  requestJson,
} from "../../lib/http";
