/**
 * Helpers compartidos Tour Administrador.
 */
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
import { c, selectList, type MenuRow } from "../../lib/menu-ui";
import { AG_ADMINS, AG_PASSWORD } from "../../lib/andrea-guerrero-demo";
import {
  saveTestHistory,
  scenesForHistory,
  summarizeScenes,
} from "../../lib/test-history";

export type AdminSeed = (typeof AG_ADMINS)[number];

export type MeUser = {
  id?: number;
  name?: string;
  username?: string;
  role?: string;
  branch?: { id?: number; name?: string; code?: string } | null;
};

export type AdminSession = {
  baseUrl: string;
  cookie: string;
  admin: AdminSeed;
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

export function printAdminHeader(admin: AdminSeed, placeExtra = "") {
  printHeader({
    name: `${admin.firstName} ${admin.firstLastName}`,
    role: "Administrador",
    business: "Andrea Guerrero Estética y Peluquería",
    place: `local ${admin.branchKey}${placeExtra ? ` · ${placeExtra}` : ""}`,
  });
}

export async function pickAdmin(opts?: {
  allowAll?: boolean;
  title?: string;
}): Promise<
  | { kind: "all" }
  | { kind: "one"; admin: AdminSeed }
  | { kind: "cancel" }
> {
  const allowAll = opts?.allowAll !== false;
  const rows: MenuRow[] = [
    ...(allowAll
      ? [
          {
            kind: "script" as const,
            index: 0,
            title: `Todos a la vez (${AG_ADMINS.length} admins)`,
            item: {
              id: "__all__",
              title: `Todos a la vez (${AG_ADMINS.length} admins)`,
              desc: `Paralelo · password ${AG_PASSWORD}`,
              danger: "low" as const,
              action: "__all__",
            },
          },
        ]
      : []),
    ...AG_ADMINS.map((a, index) => ({
      kind: "script" as const,
      index: allowAll ? index + 1 : index,
      title: `${a.firstName} ${a.firstLastName} · @${a.username}`,
      item: {
        id: a.username,
        title: `${a.firstName} ${a.firstLastName}`,
        desc: `Local: ${a.branchKey} · password ${AG_PASSWORD}`,
        danger: "low" as const,
        action: a.username,
      },
    })),
    { kind: "back" as const, id: "__cancel__", title: "Cancelar" },
  ];

  const picked = await selectList(
    "Scheduly",
    opts?.title ?? "¿Con qué Administrador?",
    rows,
    (r) => {
      if (r?.kind === "script" && r.item) {
        return `${c.dim}${r.item.desc}${c.reset}`;
      }
      return `${c.dim}Vuelve sin correr.${c.reset}`;
    },
  );

  if (!picked || picked.kind === "back" || !picked.item) {
    return { kind: "cancel" };
  }
  if (picked.item.action === "__all__") return { kind: "all" };
  const admin = AG_ADMINS.find((a) => a.username === picked.item!.action);
  if (!admin) return { kind: "cancel" };
  return { kind: "one", admin };
}

export async function loginAsAdmin(
  admin: AdminSeed,
): Promise<
  | { ok: true; session: AdminSession; scenes: StoryScene[] }
  | { ok: false; scenes: StoryScene[]; baseUrl: string; started: number; admin: AdminSeed }
> {
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const scenes: StoryScene[] = [];

  console.log(`${c.dim}URL: ${baseUrl}${c.reset}`);
  console.log(
    `${c.brightYellow}${c.bold}${admin.firstName} · Administrador · ingresando…${c.reset}`,
  );
  console.log("");

  const login = await postJson(`${baseUrl}/api/auth/login`, {
    username: admin.username,
    password: AG_PASSWORD,
  });
  const cookie = extractSessionCookie(login.setCookie);

  if (!login.ok || !cookie) {
    const scene = failScene("login", "Ingreso al sistema", login);
    scenes.push(scene);
    printScene(1, 1, scene);
    return { ok: false, scenes, baseUrl, started, admin };
  }

  const me = await getJson(`${baseUrl}/api/auth/me`, cookie);
  const meUser = (me.body ?? {}) as MeUser;
  const roleOk = me.ok && meUser.role === "admin";
  const localName = meUser.branch?.name ?? admin.branchKey;

  scenes.push({
    id: "login",
    title: "Ingreso al sistema",
    ok: roleOk,
    lines: roleOk
      ? [
          `Entró como ${c.bold}${meUser.name || `${admin.firstName} ${admin.firstLastName}`}${c.reset}`,
          `Rol: ${c.brightYellow}Administrador${c.reset} · local: ${c.bold}${localName}${c.reset}`,
        ]
      : [`Se esperaba admin, llegó: ${meUser.role ?? "?"}`],
  });
  printScene(1, 8, scenes[0]);

  if (!roleOk) {
    return { ok: false, scenes, baseUrl, started, admin };
  }

  return {
    ok: true,
    session: { baseUrl, cookie, admin, me: meUser, started },
    scenes,
  };
}

export async function logoutAdmin(
  session: AdminSession,
  scenes: StoryScene[],
  totalHint: number,
) {
  const logout = await postJson(
    `${session.baseUrl}/api/auth/logout`,
    {},
    session.cookie,
  );
  scenes.push({
    id: "logout",
    title: "Cierra sesión",
    ok: logout.ok || logout.status === 200,
    lines: [
      `${session.admin.firstName} termina y sale.`,
    ],
  });
  printScene(scenes.length, Math.max(totalHint, scenes.length), scenes[scenes.length - 1]);
}

export function finishAdminTour(
  mode: string,
  scenes: StoryScene[],
  sessionOrMeta: {
    baseUrl: string;
    started: number;
    admin: AdminSeed;
  },
) {
  printFooter(scenes);
  const sum = summarizeScenes(scenes);
  saveTestHistory({
    tester: "admin-tour",
    mode,
    baseUrl: sessionOrMeta.baseUrl,
    durationMs: Date.now() - sessionOrMeta.started,
    ok: sum.ok,
    summary: sum,
    actor: {
      username: sessionOrMeta.admin.username,
      name: `${sessionOrMeta.admin.firstName} ${sessionOrMeta.admin.firstLastName}`,
      role: "admin",
      branchKey: sessionOrMeta.admin.branchKey,
    },
    scenes: scenesForHistory(scenes),
  });
}

export {
  asArray,
  money,
  msgOf,
  num,
  printFooter,
  printHeader,
  printScene,
  type StoryScene,
} from "../../lib/bot-story";
export { c } from "../../lib/menu-ui";
export {
  deleteJson,
  extractSessionCookie,
  getJson,
  getSchedulyBaseUrl,
  postJson,
  putJson,
} from "../../lib/http";
export { AG_ADMINS, AG_PASSWORD } from "../../lib/andrea-guerrero-demo";
export {
  saveTestHistory,
  scenesForHistory,
  summarizeScenes,
} from "../../lib/test-history";
