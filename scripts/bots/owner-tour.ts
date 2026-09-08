/**
 * Tour Dueña · submenú de scripts.
 * Uso: menú Testers → Tour Dueña, o npx tsx scripts/bots/owner-tour.ts
 */
import { c, selectList, type MenuRow } from "../lib/menu-ui";
import { runOwnerReviewTour } from "./owner/review";
import { runOwnerCreateBranchAccountTour } from "./owner/create-branch-account";
import { runOwnerLinkEmployeesTour } from "./owner/link-employees";
import { runOwnerSettingsTour } from "./owner/settings-config";
import { runOwnerCatalogTour } from "./owner/catalog-products-services";
import { runOwnerAgendaHoursTour } from "./owner/agenda-hours";
import { runOwnerRegisterCustomersTour } from "./owner/register-customers";
import { runOwnerPanelWidgetsTour } from "./owner/panel-widgets";
import { runOwnerSuppliersPurchasesTour } from "./owner/suppliers-purchases";

export async function runOwnerTour() {
  const force =
    process.env.OWNER_TOUR_SCRIPT?.trim() ||
    process.argv.find((a) => a.startsWith("--script="))?.slice("--script=".length);

  if (force === "review") return runOwnerReviewTour();
  if (force === "create-branch-account") return runOwnerCreateBranchAccountTour();
  if (force === "link-employees") return runOwnerLinkEmployeesTour();
  if (force === "settings") return runOwnerSettingsTour();
  if (force === "catalog") return runOwnerCatalogTour();
  if (force === "agenda-hours") return runOwnerAgendaHoursTour();
  if (force === "register-customers") return runOwnerRegisterCustomersTour();
  if (force === "panel-widgets") return runOwnerPanelWidgetsTour();
  if (force === "suppliers-purchases") return runOwnerSuppliersPurchasesTour();

  console.log("");
  console.log(
    `${c.dim}Tour Dueña · elige qué script correr${c.reset}`,
  );
  console.log("");

  const rows: MenuRow[] = [
    {
      kind: "script",
      index: 0,
      title: "Solo revisión (lectura)",
      item: {
        id: "review",
        title: "Solo revisión (lectura)",
        desc: "Recorre panel, sucursales, cuentas, agenda, finanzas, config… sin escribir.",
        danger: "low",
        action: "review",
      },
    },
    {
      kind: "script",
      index: 1,
      title: "Panel widgets (rutas que llenan /panel)",
      item: {
        id: "panel-widgets",
        title: "Panel widgets (rutas que llenan /panel)",
        desc: "Prueba dashboard + charts finance + notificaciones; marca CON DATOS o VACÍO.",
        danger: "low",
        action: "panel-widgets",
      },
    },
    {
      kind: "script",
      index: 2,
      title: "Crear sucursal + cuenta y vincular",
      item: {
        id: "create-branch-account",
        title: "Crear sucursal + cuenta y vincular",
        desc: "Crea un local, crea Empleado, lo vincula al local, verifica equipo y desactiva la cuenta demo.",
        danger: "med",
        write: true,
        action: "create-branch-account",
      },
    },
    {
      kind: "script",
      index: 3,
      title: "Vincular empleados a sucursales",
      item: {
        id: "link-employees",
        title: "Vincular empleados a sucursales",
        desc: "Reparte empleados activos entre Colón / Eguiguren (AccountBranch) y verifica equipos.",
        danger: "med",
        write: true,
        action: "link-employees",
      },
    },
    {
      kind: "script",
      index: 4,
      title: "Productos y servicios (crear/editar/precios)",
      item: {
        id: "catalog",
        title: "Productos y servicios (crear/editar/precios)",
        desc: "Crea, cambia nombres/precios, restaura existentes y borra los de prueba.",
        danger: "med",
        write: true,
        action: "catalog",
      },
    },
    {
      kind: "script",
      index: 5,
      title: "Horario de agenda (rango apertura–cierre)",
      item: {
        id: "agenda-hours",
        title: "Horario de agenda (rango apertura–cierre)",
        desc: "Define bookingStartHour/EndHour; los empleados solo pueden agendar dentro de ese rango.",
        danger: "med",
        write: true,
        action: "agenda-hours",
      },
    },
    {
      kind: "script",
      index: 6,
      title: "Registrar clientes (20)",
      item: {
        id: "register-customers",
        title: "Registrar clientes (20)",
        desc: "La dueña da de alta 20 clientes en el sistema.",
        danger: "med",
        write: true,
        action: "register-customers",
      },
    },
    {
      kind: "script",
      index: 7,
      title: "Proveedores y compras (gastos)",
      item: {
        id: "suppliers-purchases",
        title: "Proveedores y compras (gastos)",
        desc: "Alta proveedores demo + compras recibidas/pagadas → aparecen en Finanzas como gastos.",
        danger: "med",
        write: true,
        action: "suppliers-purchases",
      },
    },
    {
      kind: "script",
      index: 8,
      title: "Configuración (nombre, colores, flags)",
      item: {
        id: "settings",
        title: "Configuración (nombre, colores, flags)",
        desc: "Cambia nombre/colores, apaga y prende flags, PATCH theme y restaura lo original.",
        danger: "med",
        write: true,
        action: "settings",
      },
    },
    { kind: "back", id: "__cancel__", title: "Cancelar" },
  ];

  const picked = await selectList(
    "Scheduly",
    "Tour Dueña · ¿qué script?",
    rows,
    (r) => {
      if (r?.kind === "script" && r.item) {
        return `${c.dim}${r.item.desc}${c.reset}`;
      }
      return `${c.dim}Vuelve sin correr.${c.reset}`;
    },
  );

  if (!picked || picked.kind === "back" || !picked.item) {
    console.log(`${c.dim}Tour Dueña cancelado.${c.reset}`);
    return;
  }

  process.stdout.write(c.clear + c.show);

  switch (picked.item.action) {
    case "review":
      await runOwnerReviewTour();
      break;
    case "create-branch-account":
      await runOwnerCreateBranchAccountTour();
      break;
    case "link-employees":
      await runOwnerLinkEmployeesTour();
      break;
    case "catalog":
      await runOwnerCatalogTour();
      break;
    case "agenda-hours":
      await runOwnerAgendaHoursTour();
      break;
    case "register-customers":
      await runOwnerRegisterCustomersTour();
      break;
    case "suppliers-purchases":
      await runOwnerSuppliersPurchasesTour();
      break;
    case "panel-widgets":
      await runOwnerPanelWidgetsTour();
      break;
    case "settings":
      await runOwnerSettingsTour();
      break;
    default:
      console.log(`${c.red}Script desconocido.${c.reset}`);
  }
}

const isDirect =
  typeof process.argv[1] === "string" &&
  process.argv[1].replace(/\\/g, "/").endsWith("/scripts/bots/owner-tour.ts");

if (isDirect) {
  runOwnerTour().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
