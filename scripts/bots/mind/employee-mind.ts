/**
 * Bots Empleados · conciencia por tiempo.
 * Reparte minutos entre empleados; prueban allow + deny (finanzas/admin).
 *
 *   BOT_EMPLOYEE_MIND=1 BOT_MINUTES=10 npx tsx scripts/bots/mind/employee-mind.ts
 */
import "dotenv/config";
import {
  AG_PASSWORD,
  EMPLOYEES,
  c,
  extractSessionCookie,
  failScene,
  getJson,
  getSchedulyBaseUrl,
  postJson,
  printEmployeeHeader,
  printFooter,
  printHeader,
  printScene,
  saveTestHistory,
  scenesForHistory,
  summarizeScenes,
  type StoryScene,
} from "../employee/shared";
import {
  nextActorSliceMinutes,
  resolveBotMinutes,
  runConsciousnessLoop,
} from "./consciousness";

export async function runEmployeeMindBots(opts?: { minutes?: number }) {
  const minutes = resolveBotMinutes(
    opts?.minutes != null ? String(opts.minutes) : process.env.BOT_MINUTES,
    10,
  );
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const list = EMPLOYEES;
  const wallEnd = started + minutes * 60_000;

  console.log("");
  console.log(
    `${c.brightGreen}${c.bold}Empleados conscientes · ${minutes} min TOTAL (reloj de pared)${c.reset}`,
  );
  console.log(
    `${c.dim}${list.length} empleados · se reparte el tiempo sin pasarse.${c.reset}`,
  );
  console.log(
    `${c.dim}Memoria+diario employee · clic pantallas · scripts/history/LEARNING.md${c.reset}`,
  );
  console.log("");

  printHeader({
    name: "Bots Empleado",
    role: "Empleado",
    business: "Andrea Guerrero",
    place: `${minutes} min`,
  });

  const subjects: Array<{
    username: string;
    name: string;
    role: string;
    branchKey?: string;
    ok: boolean;
    passed: number;
    failed: number;
    total: number;
    scenes: ReturnType<typeof scenesForHistory>;
  }> = [];
  const allScenes: StoryScene[] = [];

  for (let i = 0; i < list.length; i++) {
    const employee = list[i];
    const leftActors = list.length - i;
    const slice = nextActorSliceMinutes(wallEnd, leftActors);
    if (slice <= 0) {
      console.log(
        `${c.yellow}Tiempo agotado · no corre ${employee.username} (reloj ${minutes} min).${c.reset}`,
      );
      break;
    }

    printEmployeeHeader(employee, `conciencia ~${slice.toFixed(2)} min`);
    const scenes: StoryScene[] = [];
    let n = 0;

    const login = await postJson(`${baseUrl}/api/auth/login`, {
      username: employee.username,
      password: AG_PASSWORD,
    });
    const cookie = extractSessionCookie(login.setCookie);
    if (!login.ok || !cookie) {
      const s = failScene("login", "Ingreso", login);
      scenes.push(s);
      printScene(++n, 999, s);
      subjects.push({
        username: employee.username,
        name: `${employee.firstName} ${employee.firstLastName}`,
        role: "employee",
        branchKey: employee.branchKey,
        ok: false,
        passed: 0,
        failed: 1,
        total: 1,
        scenes: scenesForHistory(scenes),
      });
      allScenes.push(...scenes);
      continue;
    }

    const me = await getJson(`${baseUrl}/api/auth/me`, cookie);
    const meUser = (me.body ?? {}) as {
      id?: number;
      name?: string;
      role?: string;
      branch?: { name?: string } | null;
    };
    const roleOk = me.ok && meUser.role === "employee";
    const loginScene: StoryScene = {
      id: "login",
      title: "Ingreso Empleado",
      ok: roleOk,
      lines: roleOk
        ? [
            `${meUser.name} · ${meUser.branch?.name ?? employee.branchKey}`,
            `${c.dim}Operación sí · finanzas/admin deberían denegar.${c.reset}`,
            `${c.dim}Slice ${slice.toFixed(2)} min · restan ${leftActors} actor(es).${c.reset}`,
          ]
        : [`Rol: ${meUser.role}`],
    };
    scenes.push(loginScene);
    printScene(++n, 999, loginScene);

    if (roleOk) {
      await runConsciousnessLoop({
        role: "employee",
        baseUrl,
        cookie,
        minutes: slice,
        actorLabel: `Empleado ${employee.username}`,
        userId: meUser.id,
        useBranchFilter: false,
        pauseMs: 280,
        onScene: (scene) => {
          scenes.push(scene);
          printScene(++n, 999, scene);
        },
      });
    }

    await postJson(`${baseUrl}/api/auth/logout`, {}, cookie);
    const sum = summarizeScenes(scenes);
    subjects.push({
      username: employee.username,
      name: `${employee.firstName} ${employee.firstLastName}`,
      role: "employee",
      branchKey: employee.branchKey,
      ok: sum.ok,
      passed: sum.passed,
      failed: sum.failed,
      total: sum.total,
      scenes: scenesForHistory(scenes),
    });
    allScenes.push(...scenes);
    printFooter(scenes);
  }

  const elapsedSec = Math.round((Date.now() - started) / 1000);
  const sum = summarizeScenes(allScenes);
  saveTestHistory({
    tester: "employee-mind",
    mode: `conscious-${minutes}m`,
    baseUrl,
    durationMs: Date.now() - started,
    ok: sum.ok,
    summary: sum,
    subjects,
    scenes: scenesForHistory(allScenes),
    meta: { minutes, elapsedSec, wallRespect: true },
  });

  console.log("");
  console.log(
    `${c.dim}Reloj: pedido ${minutes} min · real ~${elapsedSec}s${c.reset}`,
  );
  console.log(
    sum.ok
      ? `${c.green}Empleados conciencia OK.${c.reset}`
      : `${c.red}Empleados con fallos (${sum.failed}/${sum.total}).${c.reset}`,
  );
}

const isDirect =
  typeof process.argv[1] === "string" &&
  (process.argv[1]
    .replace(/\\/g, "/")
    .endsWith("/scripts/bots/mind/employee-mind.ts") ||
    process.env.BOT_EMPLOYEE_MIND?.trim() === "1");

if (isDirect) {
  runEmployeeMindBots().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
