/**
 * Bots Administradores · conciencia por tiempo.
 * Reparte el tiempo entre admins; cada uno prueba allow/deny de su rol.
 *
 *   BOT_ADMIN_MIND=1 BOT_MINUTES=10 npx tsx scripts/bots/mind/admin-mind.ts
 */
import "dotenv/config";
import {
  AG_ADMINS,
  AG_PASSWORD,
  c,
  extractSessionCookie,
  failScene,
  getJson,
  getSchedulyBaseUrl,
  postJson,
  printAdminHeader,
  printFooter,
  printHeader,
  printScene,
  saveTestHistory,
  scenesForHistory,
  summarizeScenes,
  type StoryScene,
} from "../admin/shared";
import {
  nextActorSliceMinutes,
  resolveBotMinutes,
  runConsciousnessLoop,
} from "./consciousness";

export async function runAdminMindBots(opts?: { minutes?: number }) {
  const minutes = resolveBotMinutes(
    opts?.minutes != null ? String(opts.minutes) : process.env.BOT_MINUTES,
    10,
  );
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const wallEnd = started + minutes * 60_000;

  console.log("");
  console.log(
    `${c.brightCyan}${c.bold}Admins conscientes · ${minutes} min TOTAL (reloj de pared)${c.reset}`,
  );
  console.log(
    `${c.dim}${AG_ADMINS.length} admins · se reparte el tiempo sin pasarse.${c.reset}`,
  );
  console.log(
    `${c.dim}Memoria+diario por rol admin · clic pantallas · scripts/history/LEARNING.md${c.reset}`,
  );
  console.log("");

  printHeader({
    name: "Bots Admin",
    role: "Administrador",
    business: "Andrea Guerrero",
    place: `${minutes} min`,
  });

  const subjects: Array<{
    username: string;
    name: string;
    role: string;
    branchKey: string;
    ok: boolean;
    passed: number;
    failed: number;
    total: number;
    scenes: ReturnType<typeof scenesForHistory>;
  }> = [];
  const allScenes: StoryScene[] = [];

  for (let i = 0; i < AG_ADMINS.length; i++) {
    const admin = AG_ADMINS[i];
    const leftActors = AG_ADMINS.length - i;
    const slice = nextActorSliceMinutes(wallEnd, leftActors);
    if (slice <= 0) {
      console.log(
        `${c.yellow}Tiempo agotado · no corre ${admin.username} (reloj ${minutes} min).${c.reset}`,
      );
      break;
    }

    printAdminHeader(admin, `conciencia ~${slice.toFixed(2)} min`);
    const scenes: StoryScene[] = [];
    let n = 0;

    const login = await postJson(`${baseUrl}/api/auth/login`, {
      username: admin.username,
      password: AG_PASSWORD,
    });
    const cookie = extractSessionCookie(login.setCookie);
    if (!login.ok || !cookie) {
      const s = failScene("login", "Ingreso", login);
      scenes.push(s);
      printScene(++n, 999, s);
      subjects.push({
        username: admin.username,
        name: `${admin.firstName} ${admin.firstLastName}`,
        role: "admin",
        branchKey: admin.branchKey,
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
    const roleOk = me.ok && meUser.role === "admin";
    const loginScene: StoryScene = {
      id: "login",
      title: "Ingreso Admin",
      ok: roleOk,
      lines: roleOk
        ? [
            `${meUser.name} · ${meUser.branch?.name ?? admin.branchKey}`,
            `${c.dim}Solo mi local + denegar lo de dueña (SRI/backups).${c.reset}`,
            `${c.dim}Slice ${slice.toFixed(2)} min · restan ${leftActors} actor(es).${c.reset}`,
          ]
        : [`Rol: ${meUser.role}`],
    };
    scenes.push(loginScene);
    printScene(++n, 999, loginScene);

    if (roleOk) {
      await runConsciousnessLoop({
        role: "admin",
        baseUrl,
        cookie,
        minutes: slice,
        actorLabel: `Admin ${admin.username}`,
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
      username: admin.username,
      name: `${admin.firstName} ${admin.firstLastName}`,
      role: "admin",
      branchKey: admin.branchKey,
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
    tester: "admin-mind",
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
      ? `${c.green}Admins conciencia OK.${c.reset}`
      : `${c.red}Admins con fallos (${sum.failed}/${sum.total}).${c.reset}`,
  );
}

const isDirect =
  typeof process.argv[1] === "string" &&
  (process.argv[1]
    .replace(/\\/g, "/")
    .endsWith("/scripts/bots/mind/admin-mind.ts") ||
    process.env.BOT_ADMIN_MIND?.trim() === "1");

if (isDirect) {
  runAdminMindBots().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
