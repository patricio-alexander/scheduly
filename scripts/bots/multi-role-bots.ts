/**
 * Orquestador multi-bot · dueña + admins + empleados manejan el sistema
 * (revisión / interfaces según su rol). El detalle se ve en la terminal;
 * en la UI: Logs del sistema (/sistema/logs) para mutaciones HTTP.
 *
 * Uso:
 *   MULTI_BOTS_SCRIPT=1 npx tsx scripts/bots/multi-role-bots.ts
 *   o menú Testers → Orquestador multi-rol
 *
 * Env:
 *   MULTI_BOTS_SKIP_OWNER=1
 *   MULTI_BOTS_SKIP_ADMIN=1
 *   MULTI_BOTS_SKIP_EMPLOYEE=1
 */
import "dotenv/config";
import { c, nowStamp } from "../lib/menu-ui";
import { getSchedulyBaseUrl } from "../lib/http";
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

  console.log("");
  console.log(
    `${c.dim}[${nowStamp()}]${c.reset} ${c.brightMagenta}${c.bold}Orquestador multi-rol · bots operando el sistema${c.reset}`,
  );
  console.log(`${c.dim}URL: ${baseUrl}${c.reset}`);
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

  // ── Dueña ────────────────────────────────────────────────────
  if (!skipOwner) {
    console.log(
      `${c.brightYellow}${c.bold}1) Bot Dueña · revisión + panel widgets…${c.reset}`,
    );
    try {
      process.env.OWNER_TOUR_SCRIPT = "review";
      await runOwnerReviewTour();
      scenes.push({
        id: "owner-review",
        title: "Dueña · revisión",
        ok: true,
        lines: [`Login ${AG_OWNER.username} · recorre interfaces`],
      });
    } catch (err) {
      scenes.push({
        id: "owner-review",
        title: "Dueña · revisión",
        ok: false,
        lines: [err instanceof Error ? err.message : "Error"],
      });
    }
    try {
      await runOwnerPanelWidgetsTour();
      scenes.push({
        id: "owner-panel",
        title: "Dueña · panel widgets",
        ok: true,
        lines: ["Rutas del panel / charts"],
      });
    } catch (err) {
      scenes.push({
        id: "owner-panel",
        title: "Dueña · panel widgets",
        ok: false,
        lines: [err instanceof Error ? err.message : "Error"],
      });
    }
  }

  // ── Admins ───────────────────────────────────────────────────
  if (!skipAdmin) {
    console.log(
      `${c.brightCyan}${c.bold}2) Bots Administrador · revisión todos…${c.reset}`,
    );
    try {
      process.env.ADMIN_TOUR_ALL = "1";
      process.env.ADMIN_TOUR_SCRIPT = "review-all";
      await runAllAdminsReview();
      scenes.push({
        id: "admins-review",
        title: "Admins · revisión",
        ok: true,
        lines: ["admin_colon / admin_eguiguren / admin_loja"],
      });
    } catch (err) {
      scenes.push({
        id: "admins-review",
        title: "Admins · revisión",
        ok: false,
        lines: [err instanceof Error ? err.message : "Error"],
      });
    }
  }

  // ── Empleados ────────────────────────────────────────────────
  if (!skipEmployee) {
    console.log(
      `${c.brightGreen}${c.bold}3) Bots Empleado · revisión todos…${c.reset}`,
    );
    try {
      process.env.EMPLOYEE_TOUR_ALL = "1";
      process.env.EMPLOYEE_TOUR_SCRIPT = "review-all";
      await runAllEmployeesReview();
      scenes.push({
        id: "employees-review",
        title: "Empleados · revisión",
        ok: true,
        lines: ["Equipo estilistas / coloristas / etc."],
      });
    } catch (err) {
      scenes.push({
        id: "employees-review",
        title: "Empleados · revisión",
        ok: false,
        lines: [err instanceof Error ? err.message : "Error"],
      });
    }
  }

  scenes.push({
    id: "programmer-hint",
    title: "Programador · observación",
    ok: true,
    lines: [
      `Usuario ${AG_PROGRAMMER.username} / ${AG_PROGRAMMER.password}`,
      "UI: Desarrollador → Logs del sistema (POST/PUT/PATCH/DELETE).",
      "El recorrido del bot se ve completo en esta terminal (con hora:minuto:segundo).",
    ],
  });

  printFooter(scenes);
  const sum = summarizeScenes(scenes);
  saveTestHistory({
    tester: "multi-role-bots",
    mode: "orchestrator",
    baseUrl,
    durationMs: Date.now() - started,
    ok: sum.ok,
    summary: sum,
    scenes: scenesForHistory(scenes),
    meta: {
      owner: AG_OWNER.username,
      programmer: AG_PROGRAMMER.username,
    },
  });

  console.log("");
  console.log(
    sum.ok
      ? `${c.green}[${nowStamp()}] Orquestador OK · detalle arriba en terminal; mutaciones en /sistema/logs.${c.reset}`
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
