/**
 * Orquestador multi-bot · dueña + admins + empleados en paralelo (cola limitada).
 * El detalle se ve en la terminal; mutaciones HTTP → UI Logs (/sistema/logs).
 *
 * Uso:
 *   MULTI_BOTS_SCRIPT=1 npx tsx scripts/bots/multi-role-bots.ts
 *   o menú Testers → Orquestador multi-rol
 *
 * Env:
 *   BOT_CONCURRENCY=2          (default 2, máx 8) — hilos concurrentes por grupo
 *   MULTI_BOTS_SKIP_OWNER=1
 *   MULTI_BOTS_SKIP_ADMIN=1
 *   MULTI_BOTS_SKIP_EMPLOYEE=1
 */
import "dotenv/config";
import { c, nowStamp } from "../lib/menu-ui";
import { getSchedulyBaseUrl } from "../lib/http";
import { botConcurrency } from "../lib/map-pool";
import {
  saveTestHistory,
  scenesForHistory,
  summarizeScenes,
} from "../lib/test-history";
import { printFooter, printHeader, type StoryScene } from "../lib/bot-story";
import { AG_OWNER, AG_PROGRAMMER } from "../lib/andrea-guerrero-demo";
import { runOwnerReviewTour } from "./owner/review";
import { runOwnerPanelWidgetsTour } from "./owner/panel-widgets";
import { runAllAdminsReview } from "./admin/review";
import { runAllEmployeesReview } from "./employee/review";

export async function runMultiRoleBots() {
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const scenes: StoryScene[] = [];
  const concurrency = botConcurrency(2);

  console.log("");
  console.log(
    `${c.dim}[${nowStamp()}]${c.reset} ${c.brightMagenta}${c.bold}Orquestador multi-rol · bots en paralelo${c.reset}`,
  );
  console.log(`${c.dim}URL: ${baseUrl}${c.reset}`);
  console.log(
    `${c.dim}Concurrencia: ${concurrency} (BOT_CONCURRENCY). Dueña + admins + empleados a la vez.${c.reset}`,
  );
  console.log(
    `${c.dim}Detalle en esta terminal. Mutaciones HTTP → UI Logs del sistema (/sistema/logs).${c.reset}`,
  );
  console.log(
    `${c.dim}Dueña: ${AG_OWNER.username} / ${AG_OWNER.password}${c.reset}`,
  );
  console.log("");

  printHeader({
    name: "Multi-bots",
    role: "dueña + admins + empleados",
    business: "Andrea Guerrero Estética y Peluquería",
    place: "Loja",
  });

  const skipOwner = process.env.MULTI_BOTS_SKIP_OWNER?.trim() === "1";
  const skipAdmin = process.env.MULTI_BOTS_SKIP_ADMIN?.trim() === "1";
  const skipEmployee = process.env.MULTI_BOTS_SKIP_EMPLOYEE?.trim() === "1";

  process.env.BOT_CONCURRENCY = String(concurrency);

  type LaneResult = { id: string; title: string; ok: boolean; lines: string[] };

  const lanes: Array<Promise<LaneResult>> = [];

  if (!skipOwner) {
    lanes.push(
      (async (): Promise<LaneResult> => {
        console.log(
          `${c.brightYellow}${c.bold}▶ Bot Dueña (paralelo)…${c.reset}`,
        );
        const lines: string[] = [];
        let ok = true;
        try {
          process.env.OWNER_TOUR_SCRIPT = "review";
          await runOwnerReviewTour();
          lines.push(`Login ${AG_OWNER.username} · revisión`);
        } catch (err) {
          ok = false;
          lines.push(err instanceof Error ? err.message : "Error revisión");
        }
        try {
          await runOwnerPanelWidgetsTour();
          lines.push("Panel widgets");
        } catch (err) {
          ok = false;
          lines.push(err instanceof Error ? err.message : "Error panel");
        }
        return {
          id: "owner",
          title: "Dueña · revisión + panel",
          ok,
          lines,
        };
      })(),
    );
  }

  if (!skipAdmin) {
    lanes.push(
      (async (): Promise<LaneResult> => {
        console.log(
          `${c.brightCyan}${c.bold}▶ Bots Administrador (cola ${concurrency})…${c.reset}`,
        );
        try {
          process.env.ADMIN_TOUR_ALL = "1";
          process.env.ADMIN_TOUR_SCRIPT = "review-all";
          await runAllAdminsReview();
          return {
            id: "admins",
            title: "Admins · revisión",
            ok: true,
            lines: ["admin_colon / admin_eguiguren / admin_loja"],
          };
        } catch (err) {
          return {
            id: "admins",
            title: "Admins · revisión",
            ok: false,
            lines: [err instanceof Error ? err.message : "Error"],
          };
        }
      })(),
    );
  }

  if (!skipEmployee) {
    lanes.push(
      (async (): Promise<LaneResult> => {
        console.log(
          `${c.brightGreen}${c.bold}▶ Bots Empleado (cola ${concurrency})…${c.reset}`,
        );
        try {
          process.env.EMPLOYEE_TOUR_ALL = "1";
          process.env.EMPLOYEE_TOUR_SCRIPT = "review-all";
          await runAllEmployeesReview();
          return {
            id: "employees",
            title: "Empleados · revisión",
            ok: true,
            lines: ["Equipo estilistas / coloristas / etc."],
          };
        } catch (err) {
          return {
            id: "employees",
            title: "Empleados · revisión",
            ok: false,
            lines: [err instanceof Error ? err.message : "Error"],
          };
        }
      })(),
    );
  }

  const laneResults = await Promise.all(lanes);
  for (const r of laneResults) {
    scenes.push(r);
  }

  scenes.push({
    id: "programmer-hint",
    title: "Programador · observación",
    ok: true,
    lines: [
      `Usuario ${AG_PROGRAMMER.username} / ${AG_PROGRAMMER.password}`,
      "UI: Desarrollador → Logs del sistema (POST/PUT/PATCH/DELETE).",
      `Cola BOT_CONCURRENCY=${concurrency} (no satura la PC).`,
    ],
  });

  printFooter(scenes);
  const sum = summarizeScenes(scenes);
  saveTestHistory({
    tester: "multi-role-bots",
    mode: "orchestrator-parallel",
    baseUrl,
    durationMs: Date.now() - started,
    ok: sum.ok,
    summary: sum,
    scenes: scenesForHistory(scenes),
    meta: {
      owner: AG_OWNER.username,
      programmer: AG_PROGRAMMER.username,
      concurrency,
    },
  });

  console.log("");
  console.log(
    sum.ok
      ? `${c.green}[${nowStamp()}] Orquestador OK · paralelo (concurrencia ${concurrency}).${c.reset}`
      : `${c.red}[${nowStamp()}] Orquestador con fallos (${sum.failed}/${sum.total}).${c.reset}`,
  );
  console.log("");
}

const isDirect =
  typeof process.argv[1] === "string" &&
  (process.argv[1].replace(/\\/g, "/").endsWith("/scripts/bots/multi-role-bots.ts") ||
    process.env.MULTI_BOTS_SCRIPT?.trim() === "1");

if (isDirect) {
  runMultiRoleBots().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
