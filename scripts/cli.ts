#!/usr/bin/env npx tsx
/**
 * Menú interactivo Scheduly (estilo EdDeli).
 * Uso: npm run scripts
 *
 * Controles: ↑↓ mover · Enter elegir · Esc / q salir
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import {
  askConfirm,
  askText,
  assertTty,
  c,
  dangerBadge,
  defaultCommitNote,
  nowStamp,
  selectList,
  waitEnter,
  type ScriptItem,
} from "./lib/menu-ui";
import {
  commitWithMessage,
  gitCurrentBranch,
  gitRepoRoot,
  gitStatusPorcelain,
  printGitStatus,
  pushCurrentBranch,
  stageAllSafe,
} from "./lib/git";
import { getSchedulyBaseUrl } from "./lib/http";
import { runLoginTester } from "./bots/login-tester";
import { runOwnerTour } from "./bots/owner-tour";
import { runAdminTour } from "./bots/admin-tour";
import { runEmployeeTour } from "./bots/employee-tour";
import { runDaySimulation } from "./bots/day-simulation";
import { runSeasonSimulation } from "./bots/season-simulation";
import { runOwnerPanelWidgetsTour } from "./bots/owner/panel-widgets";
import { runOwnerMindBot } from "./bots/mind/owner-mind";
import { runAdminMindBots } from "./bots/mind/admin-mind";
import { runEmployeeMindBots } from "./bots/mind/employee-mind";

const APP_LABEL = "Scheduly";
const EXIT_ID = "__exit__";
const BACK_ID = "__back__";

type CatalogGroup = {
  name: string;
  color: string;
  items: ScriptItem[];
};

const CATALOG: CatalogGroup[] = [
  {
    name: "Bots",
    color: "green",
    items: [
      {
        id: "bot-owner-mind",
        title: "Bot Dueña · conciencia (minutos)",
        desc: "Aprende, deja diario y “cliclea” pantallas; prioriza lo flojo. Opcional BOT_ALLOW_WRITES=1.",
        danger: "low",
        action: "bot-owner-mind",
      },
      {
        id: "bot-admin-mind",
        title: "Bots Administradores · conciencia (minutos)",
        desc: "Misma memoria/aprendizaje por rol admin; exploran UI+API allow/deny.",
        danger: "low",
        action: "bot-admin-mind",
      },
      {
        id: "bot-employee-mind",
        title: "Bots Empleados · conciencia (minutos)",
        desc: "Aprenden su perímetro (operación sí · finanzas no) y comentan en el diario.",
        danger: "low",
        action: "bot-employee-mind",
      },
      {
        id: "multi-role-bots",
        title: "Orquestador conciencia (3 roles)",
        desc: "Dueña + admins + empleados en paralelo (BOT_CONCURRENCY=2). Detalle en terminal; mutaciones en Logs.",
        danger: "low",
        action: "multi-role-bots",
      },
    ],
  },
  {
    name: "Testers",
    color: "cyan",
    items: [
      {
        id: "login-tester",
        title: "Login multi-cuenta",
        desc: "Prueba rápida de login (andrea, administrador, admins, empleados).",
        danger: "low",
        action: "login-tester",
      },
      {
        id: "day-simulation",
        title: "Simulación día 1 sep (flujo completo)",
        desc: "TESTER rápido de flujo: agenda → caja → cobros → POS → cierre.",
        danger: "med",
        write: true,
        action: "day-simulation",
      },
      {
        id: "season-simulation",
        title: "Simulación última semana",
        desc: "TESTER de datos: hoy−7 → hoy (ingresos, gastos, kardex).",
        danger: "med",
        write: true,
        action: "season-simulation",
      },
      {
        id: "panel-widgets",
        title: "Panel widgets (dueña · lectura)",
        desc: "TESTER rápido: rutas del /panel y charts CON DATOS / VACÍO / FAIL.",
        danger: "low",
        action: "panel-widgets",
      },
      {
        id: "owner-tour",
        title: "Tour Dueña · Andrea Guerrero",
        desc: "TESTER con submenú (escritura opcional): catálogo, horario, clientes…",
        danger: "med",
        write: true,
        action: "owner-tour",
      },
      {
        id: "admin-tour",
        title: "Tour Administrador",
        desc: "TESTER con submenú para admins (revisión / escritura).",
        danger: "med",
        write: true,
        action: "admin-tour",
      },
      {
        id: "employee-tour",
        title: "Tour Empleado",
        desc: "TESTER con submenú para empleados.",
        danger: "med",
        write: true,
        action: "employee-tour",
      },
    ],
  },
  {
    name: "Git",
    color: "magenta",
    items: [
      {
        id: "git-status",
        title: "Ver estado",
        desc: "Muestra rama, remote y cambios pendientes.",
        danger: "low",
        action: "git-status",
      },
      {
        id: "git-push",
        title: "Subir cambios (commit + push)",
        desc: "Pide mensaje (por defecto con fecha), hace add + commit + push. Omite .env*.",
        danger: "med",
        write: true,
        action: "git-push",
      },
      {
        id: "git-commit",
        title: "Solo commit (sin push)",
        desc: "Pide mensaje con fecha por defecto, add + commit. No sube al remote.",
        danger: "med",
        write: true,
        action: "git-commit",
      },
    ],
  },
  {
    name: "Utilidades",
    color: "yellow",
    items: [
      {
        id: "db-reset",
        title: "Reset BD (Andrea Guerrero demo)",
        desc: "Vacía tablas y carga roles, andrea/administrador + admins/empleados, 2 locales, catálogo.",
        danger: "high",
        write: true,
        action: "db-reset",
      },
      {
        id: "ops-reset",
        title: "Reset operativo (sin ingresos)",
        desc: "Borra citas/ventas/cajas/ingresos. Conserva clientes, productos, servicios y empleados.",
        danger: "high",
        write: true,
        action: "ops-reset",
      },
      {
        id: "ensure-accounts",
        title: "Asegurar andrea + administrador (sin wipe)",
        desc: "Crea/actualiza Dueña andrea y Programador administrador sin vaciar la BD.",
        danger: "med",
        write: true,
        action: "ensure-accounts",
      },
    ],
  },
];

function flattenForGroup(group: CatalogGroup) {
  return [
    ...group.items.map((item) => ({ kind: "script" as const, item })),
    { kind: "back" as const, id: BACK_ID, title: "← Volver" },
  ];
}

function groupMenuRows() {
  return [
    ...CATALOG.map((g, i) => ({
      kind: "group" as const,
      index: i,
      title: g.name,
      color: g.color,
      count: g.items.length,
    })),
    { kind: "exit" as const, id: EXIT_ID, title: "Salir" },
  ];
}

async function runGitUpload(doPush: boolean) {
  const root = gitRepoRoot();
  if (!root) {
    console.log(`${c.red}Este directorio no es un repo git.${c.reset}`);
    await waitEnter();
    return;
  }

  printGitStatus();
  console.log("");

  if (!gitStatusPorcelain()) {
    console.log(`${c.dim}No hay cambios locales.${c.reset}`);
    if (doPush) {
      const pushAnyway = await askConfirm(
        `${c.brightGreen}¿Hacer push de la rama actual de todos modos?${c.reset}`,
      );
      if (pushAnyway) {
        console.log(`\nPush → origin (${gitCurrentBranch()})…`);
        pushCurrentBranch();
        console.log(`${c.green}Push listo.${c.reset}`);
      }
    }
    await waitEnter();
    return;
  }

  const fallback = defaultCommitNote();
  const message = await askText(
    `${c.brightCyan}Mensaje del commit${c.reset}`,
    fallback,
  );
  if (!message) {
    console.log(`${c.dim}Cancelado: mensaje vacío.${c.reset}`);
    await waitEnter();
    return;
  }

  const ok = await askConfirm(
    doPush
      ? `${c.brightGreen}¿Commit + push con «${message}»?${c.reset}`
      : `${c.brightGreen}¿Commit con «${message}»?${c.reset}`,
  );
  if (!ok) {
    console.log(`${c.dim}Cancelado.${c.reset}`);
    await waitEnter();
    return;
  }

  console.log(`\n${c.dim}Staging (omite .env*)…${c.reset}`);
  const staged = stageAllSafe();
  if (!staged.ok) {
    console.log(staged.stderr || "No se pudo hacer git add.");
    await waitEnter();
    return;
  }

  console.log(`${c.dim}Commit…${c.reset}`);
  const committed = commitWithMessage(message);
  if (!committed.ok) {
    console.log(committed.stderr || committed.stdout || "Commit falló.");
    await waitEnter();
    return;
  }
  if (committed.stdout) console.log(committed.stdout);
  console.log(`${c.green}Commit OK.${c.reset}`);

  if (doPush) {
    console.log(`\nPush → origin (${gitCurrentBranch()})…`);
    pushCurrentBranch();
    console.log(`${c.green}Push listo.${c.reset}`);
  }

  await waitEnter();
}

async function runDbReset() {
  const ok = await askConfirm(
    `${c.red}${c.bold}¿Vaciar la BD y recrear Administrador?${c.reset}`,
  );
  if (!ok) {
    console.log(`${c.dim}Cancelado.${c.reset}`);
    await waitEnter();
    return;
  }

  const r = spawnSync("npx", ["tsx", "scripts/reset-db.ts"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  if ((r.status ?? 1) !== 0) {
    console.log(`${c.red}Reset falló.${c.reset}`);
  } else {
    console.log(`${c.green}Reset OK.${c.reset}`);
  }
  await waitEnter();
}

async function runOpsReset() {
  const ok = await askConfirm(
    `${c.red}${c.bold}¿Borrar citas, ventas, cajas e ingresos?${c.reset}\n${c.dim}Se conservan clientes, productos, servicios y empleados.${c.reset}`,
  );
  if (!ok) {
    console.log(`${c.dim}Cancelado.${c.reset}`);
    await waitEnter();
    return;
  }

  const r = spawnSync("npx", ["tsx", "scripts/reset-ops.ts"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  if ((r.status ?? 1) !== 0) {
    console.log(`${c.red}Reset operativo falló.${c.reset}`);
  } else {
    console.log(`${c.green}Reset operativo OK.${c.reset}`);
  }
  await waitEnter();
}

async function confirmAndRun(item: ScriptItem) {
  process.stdout.write(c.clear + c.show);
  console.log(
    `${c.brightMagenta}${c.bold}╭──────────────────────────────────────╮${c.reset}`,
  );
  console.log(
    `${c.brightMagenta}${c.bold}│${c.reset} ${c.brightCyan}${c.bold}${item.title}${c.reset}`,
  );
  console.log(
    `${c.brightMagenta}${c.bold}╰──────────────────────────────────────╯${c.reset}`,
  );
  console.log(dangerBadge(item.danger || "low"));
  console.log("");
  console.log(`${c.white}${item.desc}${c.reset}`);
  console.log("");
  console.log(`${c.dim}Ahora:${c.reset} ${c.yellow}${nowStamp()}${c.reset}`);
  console.log(
    `${c.dim}URL app:${c.reset} ${c.cyan}${getSchedulyBaseUrl()}${c.reset}`,
  );
  if (item.write) {
    console.log(
      `${c.yellow}${c.bold}Esta acción puede escribir en disco/BD/git.${c.reset}`,
    );
  }
  if (item.danger === "high") {
    console.log(
      `${c.red}${c.bold}ATENCIÓN: operación sensible / potencialmente destructiva.${c.reset}`,
    );
  }
  console.log("");

  if (item.action === "bot-owner-mind") {
    const mins = await askText(
      "¿Cuántos minutos de conciencia para la Dueña?",
      "10",
    );
    await runOwnerMindBot({ minutes: Number(mins) || 10 });
    await waitEnter();
    return;
  }

  if (item.action === "bot-admin-mind") {
    const mins = await askText(
      "¿Cuántos minutos totales para todos los Admins?",
      "10",
    );
    await runAdminMindBots({ minutes: Number(mins) || 10 });
    await waitEnter();
    return;
  }

  if (item.action === "bot-employee-mind") {
    const mins = await askText(
      "¿Cuántos minutos totales para todos los Empleados?",
      "10",
    );
    await runEmployeeMindBots({ minutes: Number(mins) || 10 });
    await waitEnter();
    return;
  }

  if (item.action === "multi-role-bots") {
    const mins = await askText(
      "¿Minutos por rol (dueña, luego admins, luego empleados)?",
      "5",
    );
    const m = Number(mins) || 5;
    const ok = await askConfirm(
      `${c.brightGreen}¿Correr conciencia ${m} min × 3 roles?${c.reset}`,
    );
    if (!ok) {
      console.log(`${c.dim}Cancelado.${c.reset}`);
      await waitEnter();
      return;
    }
    await runOwnerMindBot({ minutes: m });
    await runAdminMindBots({ minutes: m });
    await runEmployeeMindBots({ minutes: m });
    await waitEnter();
    return;
  }

  if (item.action === "login-tester") {
    const ok = await askConfirm(`${c.brightGreen}¿Ejecutar ahora?${c.reset}`);
    if (!ok) {
      console.log(`${c.dim}Cancelado.${c.reset}`);
      await waitEnter();
      return;
    }
    await runLoginTester();
    await waitEnter();
    return;
  }

  if (item.action === "day-simulation") {
    await runDaySimulation();
    await waitEnter();
    return;
  }

  if (item.action === "season-simulation") {
    const ok = await askConfirm(
      `${c.brightGreen}¿Simular última semana (hoy−7 → hoy)? (puede tardar)${c.reset}`,
    );
    if (!ok) {
      console.log(`${c.dim}Cancelado.${c.reset}`);
      await waitEnter();
      return;
    }
    await runSeasonSimulation();
    await waitEnter();
    return;
  }

  if (item.action === "panel-widgets") {
    const ok = await askConfirm(`${c.brightGreen}¿Ejecutar ahora?${c.reset}`);
    if (!ok) {
      console.log(`${c.dim}Cancelado.${c.reset}`);
      await waitEnter();
      return;
    }
    await runOwnerPanelWidgetsTour();
    await waitEnter();
    return;
  }

  if (item.action === "owner-tour") {
    await runOwnerTour();
    await waitEnter();
    return;
  }

  if (item.action === "admin-tour") {
    await runAdminTour();
    await waitEnter();
    return;
  }

  if (item.action === "employee-tour") {
    await runEmployeeTour();
    await waitEnter();
    return;
  }

  if (item.action === "git-status") {
    printGitStatus();
    await waitEnter();
    return;
  }

  if (item.action === "git-push") {
    await runGitUpload(true);
    return;
  }

  if (item.action === "git-commit") {
    await runGitUpload(false);
    return;
  }

  if (item.action === "db-reset") {
    await runDbReset();
    return;
  }

  if (item.action === "ops-reset") {
    await runOpsReset();
    return;
  }

  if (item.action === "ensure-accounts") {
    const ok = await askConfirm(
      `${c.brightGreen}¿Asegurar cuentas andrea + administrador sin wipe?${c.reset}`,
    );
    if (!ok) {
      console.log(`${c.dim}Cancelado.${c.reset}`);
      await waitEnter();
      return;
    }
    const r = spawnSync("npx", ["tsx", "scripts/ensure-programmer-owner.ts"], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });
    if ((r.status ?? 1) !== 0) {
      console.log(`${c.red}Falló ensure-accounts.${c.reset}`);
    } else {
      console.log(`${c.green}Cuentas OK.${c.reset}`);
    }
    await waitEnter();
    return;
  }

  console.log(`${c.red}Acción desconocida: ${item.action}${c.reset}`);
  await waitEnter();
}

async function openGroup(group: CatalogGroup) {
  while (true) {
    const row = await selectList(
      APP_LABEL,
      `Categoría: ${group.name}`,
      flattenForGroup(group),
      (r) => {
        if (r?.kind === "script" && r.item) {
          return `${c.dim}${r.item.desc}${c.reset}`;
        }
        if (r?.kind === "back") {
          return `${c.dim}Regresa al listado de categorías.${c.reset}`;
        }
        return "";
      },
    );

    if (!row || row.kind === "back") return;
    if (row.kind === "script" && row.item) {
      await confirmAndRun(row.item);
    }
  }
}

async function main() {
  assertTty(APP_LABEL);

  while (true) {
    const row = await selectList(
      APP_LABEL,
      "Elegí una categoría",
      groupMenuRows(),
      (r) => {
        if (r?.kind === "group" && typeof r.index === "number") {
          const g = CATALOG[r.index];
          const names = g.items
            .slice(0, 4)
            .map((i) => i.title)
            .join(" · ");
          const more = g.items.length > 4 ? "…" : "";
          return `${c.dim}${names}${more}${c.reset}`;
        }
        if (r?.kind === "exit") return `${c.dim}Cierra el menú.${c.reset}`;
        return "";
      },
    );

    if (!row || row.kind === "exit") {
      process.stdout.write(c.clear + c.show);
      console.log("Listo.");
      return;
    }

    if (row.kind === "group" && typeof row.index === "number") {
      await openGroup(CATALOG[row.index]);
    }
  }
}

main().catch((err) => {
  process.stdout.write(c.show);
  console.error("Error en el menú:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
