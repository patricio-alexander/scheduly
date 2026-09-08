/**
 * Bot Dueña · conciencia por tiempo.
 * Durante N minutos recorre rutas permitidas y prohibidas (espera 403),
 * filtrando por sucursal cuando aplica.
 *
 *   BOT_OWNER_MIND=1 BOT_MINUTES=10 npx tsx scripts/bots/mind/owner-mind.ts
 */
import "dotenv/config";
import {
  c,
  finishOwnerTour,
  loginAsOwner,
  logoutOwner,
  printOwnerHeader,
  printScene,
  type StoryScene,
} from "../owner/shared";
import { AG_OWNER } from "../../lib/andrea-guerrero-demo";
import {
  resolveBotMinutes,
  runConsciousnessLoop,
} from "./consciousness";

export async function runOwnerMindBot(opts?: { minutes?: number }) {
  const minutes = resolveBotMinutes(
    opts?.minutes != null ? String(opts.minutes) : process.env.BOT_MINUTES,
    10,
  );

  printOwnerHeader(`Conciencia ${minutes} min`);

  const auth = await loginAsOwner();
  if (!auth.ok) {
    finishOwnerTour(
      "owner-mind-login-fail",
      auth.scenes,
      auth.baseUrl,
      auth.started,
    );
    return;
  }

  const { session } = auth;
  const scenes: StoryScene[] = [...auth.scenes];
  let n = scenes.length;
  for (const s of scenes) printScene(++n, 999, s);

  console.log("");
  console.log(
    `${c.brightYellow}${c.bold}Dueña consciente · ${minutes} minuto(s) · ${AG_OWNER.username}${c.reset}`,
  );
  console.log(
    `${c.dim}Aprende + clic en pantallas · diario en scripts/history/ · digest LEARNING.md${c.reset}`,
  );
  console.log(
    `${c.dim}Mutar config (tacto reversible): BOT_ALLOW_WRITES=1${c.reset}`,
  );
  console.log("");

  const result = await runConsciousnessLoop({
    role: "owner",
    baseUrl: session.baseUrl,
    cookie: session.cookie,
    minutes,
    actorLabel: `Dueña ${AG_OWNER.username}`,
    userId: session.me.id,
    useBranchFilter: true,
    pauseMs: 400,
    onScene: (scene) => {
      printScene(++n, 999, scene);
    },
  });

  scenes.push(...result.scenes);
  await logoutOwner(session, scenes, scenes.length);
  finishOwnerTour("owner-mind", scenes, session.baseUrl, session.started);
}

const isDirect =
  typeof process.argv[1] === "string" &&
  (process.argv[1]
    .replace(/\\/g, "/")
    .endsWith("/scripts/bots/mind/owner-mind.ts") ||
    process.env.BOT_OWNER_MIND?.trim() === "1");

if (isDirect) {
  runOwnerMindBot().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
