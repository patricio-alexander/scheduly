/**
 * Helpers compartidos Tour Empleado.
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
import { AG_EMPLOYEES, AG_PASSWORD } from "../../lib/andrea-guerrero-demo";
import {
  saveTestHistory,
  scenesForHistory,
  summarizeScenes,
} from "../../lib/test-history";

export type EmployeeSeed = (typeof AG_EMPLOYEES)[number] & {
  branchKey: string;
};

export type MeUser = {
  id?: number;
  personId?: number;
  name?: string;
  username?: string;
  role?: string;
  branch?: { id?: number; name?: string; code?: string } | null;
};

export type EmployeeSession = {
  baseUrl: string;
  cookie: string;
  employee: EmployeeSeed;
  me: MeUser;
  started: number;
};

export function withBranchKey(
  emp: (typeof AG_EMPLOYEES)[number],
  index: number,
): EmployeeSeed {
  return {
    ...emp,
    branchKey: index % 2 === 0 ? "colon" : "eguiguren",
  };
}

export const EMPLOYEES: EmployeeSeed[] = AG_EMPLOYEES.map(withBranchKey);

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

export function printEmployeeHeader(employee: EmployeeSeed, extra = "") {
  printHeader({
    name: `${employee.firstName} ${employee.firstLastName}`,
    role: "Empleado",
    business: "Andrea Guerrero Estética y Peluquería",
    place: `local ${employee.branchKey}${extra ? ` · ${extra}` : ""}`,
  });
}

export async function pickEmployee(opts?: {
  allowAll?: boolean;
  title?: string;
}): Promise<
  | { kind: "all" }
  | { kind: "one"; employee: EmployeeSeed }
  | { kind: "cancel" }
> {
  const allowAll = opts?.allowAll !== false;
  const rows: MenuRow[] = [
    ...(allowAll
      ? [
          {
            kind: "script" as const,
            index: 0,
            title: `Todos a la vez (${EMPLOYEES.length})`,
            item: {
              id: "__all__",
              title: `Todos a la vez (${EMPLOYEES.length})`,
              desc: `Paralelo · password ${AG_PASSWORD}`,
              danger: "low" as const,
              action: "__all__",
            },
          },
        ]
      : []),
    ...EMPLOYEES.map((e, index) => ({
      kind: "script" as const,
      index: allowAll ? index + 1 : index,
      title: `${e.firstName} ${e.firstLastName} · @${e.username}`,
      item: {
        id: e.username,
        title: `${e.firstName} ${e.firstLastName}`,
        desc: `Local: ${e.branchKey} · password ${AG_PASSWORD}`,
        danger: "low" as const,
        action: e.username,
      },
    })),
    { kind: "back" as const, id: "__cancel__", title: "Cancelar" },
  ];

  const picked = await selectList(
    "Scheduly",
    opts?.title ?? "¿Con qué Empleado?",
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
  const employee = EMPLOYEES.find((e) => e.username === picked.item!.action);
  if (!employee) return { kind: "cancel" };
  return { kind: "one", employee };
}

export async function loginAsEmployee(
  employee: EmployeeSeed,
): Promise<
  | { ok: true; session: EmployeeSession; scenes: StoryScene[] }
  | {
      ok: false;
      scenes: StoryScene[];
      baseUrl: string;
      started: number;
      employee: EmployeeSeed;
    }
> {
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const scenes: StoryScene[] = [];

  console.log(`${c.dim}URL: ${baseUrl}${c.reset}`);
  console.log(
    `${c.brightYellow}${c.bold}${employee.firstName} · Empleado · ingresando…${c.reset}`,
  );
  console.log("");

  const login = await postJson(`${baseUrl}/api/auth/login`, {
    username: employee.username,
    password: AG_PASSWORD,
  });
  const cookie = extractSessionCookie(login.setCookie);
  if (!login.ok || !cookie) {
    const scene = failScene("login", "Ingreso al sistema", login);
    scenes.push(scene);
    printScene(1, 1, scene);
    return { ok: false, scenes, baseUrl, started, employee };
  }

  const me = await getJson(`${baseUrl}/api/auth/me`, cookie);
  const meUser = (me.body ?? {}) as MeUser;
  const roleOk = me.ok && meUser.role === "employee";
  scenes.push({
    id: "login",
    title: "Ingreso al sistema",
    ok: roleOk,
    lines: roleOk
      ? [
          `Entró como ${c.bold}${meUser.name || `${employee.firstName} ${employee.firstLastName}`}${c.reset}`,
          `Rol: ${c.brightYellow}Empleado${c.reset} · local: ${c.bold}${meUser.branch?.name ?? employee.branchKey}${c.reset}`,
        ]
      : [`Se esperaba employee, llegó: ${meUser.role ?? "?"}`],
  });
  printScene(1, 8, scenes[0]);

  if (!roleOk) {
    return { ok: false, scenes, baseUrl, started, employee };
  }

  return {
    ok: true,
    session: { baseUrl, cookie, employee, me: meUser, started },
    scenes,
  };
}

export async function logoutEmployee(
  session: EmployeeSession,
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
    lines: [`${session.employee.firstName} termina y sale.`],
  });
  printScene(
    scenes.length,
    Math.max(totalHint, scenes.length),
    scenes[scenes.length - 1],
  );
}

export function finishEmployeeTour(
  mode: string,
  scenes: StoryScene[],
  meta: { baseUrl: string; started: number; employee: EmployeeSeed },
) {
  printFooter(scenes);
  const sum = summarizeScenes(scenes);
  saveTestHistory({
    tester: "employee-tour",
    mode,
    baseUrl: meta.baseUrl,
    durationMs: Date.now() - meta.started,
    ok: sum.ok,
    summary: sum,
    actor: {
      username: meta.employee.username,
      name: `${meta.employee.firstName} ${meta.employee.firstLastName}`,
      role: "employee",
      branchKey: meta.employee.branchKey,
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
export { AG_EMPLOYEES, AG_PASSWORD } from "../../lib/andrea-guerrero-demo";
export {
  saveTestHistory,
  scenesForHistory,
  summarizeScenes,
} from "../../lib/test-history";
export { nowStamp } from "../../lib/menu-ui";
