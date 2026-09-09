/**
 * Tour Administrador · submenú de scripts.
 */
import { c, selectList, type MenuRow } from "../lib/menu-ui";
import { AG_ADMINS } from "./admin/shared";
import {
  runAdminReviewTour,
  runAllAdminsReview,
  runOneAdminReview,
} from "./admin/review";
import { runAdminEditEmployeeTour } from "./admin/edit-employee";
import { runAdminToggleAccountsTour } from "./admin/toggle-accounts";
import { runAdminCreateEmployeeTour } from "./admin/create-employee";
import {
  runAdminCatalogTour,
  runAllAdminsCatalog,
} from "./admin/catalog-products-services";
import {
  runAdminRegisterCustomersTour,
  runAllAdminsRegisterCustomers,
} from "./admin/register-customers";

function resolveAdminFromEnv() {
  const user =
    process.env.ADMIN_TOUR_USER?.trim() ||
    process.argv.find((a) => a.startsWith("--user="))?.slice("--user=".length);
  return AG_ADMINS.find((a) => a.username === user) ?? AG_ADMINS[0];
}

export async function runAdminTour(opts?: { all?: boolean }) {
  const forceScript =
    process.env.ADMIN_TOUR_SCRIPT?.trim() ||
    process.argv
      .find((a) => a.startsWith("--script="))
      ?.slice("--script=".length);

  const forceAll =
    opts?.all === true ||
    process.env.ADMIN_TOUR_ALL === "1" ||
    process.argv.includes("--all");

  if (forceAll || forceScript === "review-all") {
    process.stdout.write(c.clear + c.show);
    await runAllAdminsReview();
    return;
  }
  if (forceScript === "review") {
    await runOneAdminReview(resolveAdminFromEnv(), { quiet: false });
    return;
  }
  if (forceScript === "edit-employee") {
    await runAdminEditEmployeeTour(resolveAdminFromEnv());
    return;
  }
  if (forceScript === "create-employee") {
    await runAdminCreateEmployeeTour(resolveAdminFromEnv());
    return;
  }
  if (forceScript === "toggle-accounts") {
    await runAdminToggleAccountsTour(resolveAdminFromEnv());
    return;
  }
  if (forceScript === "catalog-all") {
    process.stdout.write(c.clear + c.show);
    await runAllAdminsCatalog();
    return;
  }
  if (forceScript === "catalog") {
    await runAdminCatalogTour(resolveAdminFromEnv());
    return;
  }
  if (forceScript === "register-customers-all") {
    process.stdout.write(c.clear + c.show);
    await runAllAdminsRegisterCustomers();
    return;
  }
  if (forceScript === "register-customers") {
    await runAdminRegisterCustomersTour(resolveAdminFromEnv());
    return;
  }

  console.log("");
  console.log(`${c.dim}Tour Administrador · elige qué script correr${c.reset}`);
  console.log("");

  const rows: MenuRow[] = [
    {
      kind: "script",
      index: 0,
      title: "Solo revisión (uno o todos)",
      item: {
        id: "review",
        title: "Solo revisión (uno o todos)",
        desc: "Panel, local, agenda, equipo del local… sin escribir.",
        danger: "low",
        action: "review",
      },
    },
    {
      kind: "script",
      index: 1,
      title: "Crear empleado de su local",
      item: {
        id: "create-employee",
        title: "Crear empleado de su local",
        desc: "Admin crea una cuenta Empleado en su sucursal y la desactiva (limpieza).",
        danger: "med",
        write: true,
        action: "create-employee",
      },
    },
    {
      kind: "script",
      index: 2,
      title: "Editar datos de empleado",
      item: {
        id: "edit-employee",
        title: "Editar datos de empleado",
        desc: "Elige un admin → edita nombre/correo de un empleado de su local y restaura.",
        danger: "med",
        write: true,
        action: "edit-employee",
      },
    },
    {
      kind: "script",
      index: 3,
      title: "Desactivar / reactivar cuentas",
      item: {
        id: "toggle-accounts",
        title: "Desactivar / reactivar cuentas",
        desc: "Elige un admin → desactiva un empleado de su local y lo vuelve a activar.",
        danger: "med",
        write: true,
        action: "toggle-accounts",
      },
    },
    {
      kind: "script",
      index: 4,
      title: "Productos y servicios (uno o todos)",
      item: {
        id: "catalog",
        title: "Productos y servicios (uno o todos)",
        desc: "Cada admin crea/edita/borra productos y servicios de prueba en su local.",
        danger: "med",
        write: true,
        action: "catalog",
      },
    },
    {
      kind: "script",
      index: 5,
      title: "Registrar clientes (10 c/u, uno o todos)",
      item: {
        id: "register-customers",
        title: "Registrar clientes (10 c/u, uno o todos)",
        desc: "Cada administrador da de alta 10 clientes en el sistema.",
        danger: "med",
        write: true,
        action: "register-customers",
      },
    },
    { kind: "back", id: "__cancel__", title: "Cancelar" },
  ];

  const picked = await selectList(
    "Scheduly",
    "Tour Administrador · ¿qué script?",
    rows,
    (r) => {
      if (r?.kind === "script" && r.item) {
        return `${c.dim}${r.item.desc}${c.reset}`;
      }
      return `${c.dim}Vuelve sin correr.${c.reset}`;
    },
  );

  if (!picked || picked.kind === "back" || !picked.item) {
    console.log(`${c.dim}Tour admin cancelado.${c.reset}`);
    return;
  }

  process.stdout.write(c.clear + c.show);

  switch (picked.item.action) {
    case "review":
      await runAdminReviewTour();
      break;
    case "edit-employee":
      await runAdminEditEmployeeTour();
      break;
    case "create-employee":
      await runAdminCreateEmployeeTour();
      break;
    case "toggle-accounts":
      await runAdminToggleAccountsTour();
      break;
    case "catalog":
      await runAdminCatalogTour();
      break;
    case "register-customers":
      await runAdminRegisterCustomersTour();
      break;
    default:
      console.log(`${c.red}Script desconocido.${c.reset}`);
  }
}

const isDirect =
  typeof process.argv[1] === "string" &&
  process.argv[1].replace(/\\/g, "/").endsWith("/scripts/bots/admin-tour.ts");

if (isDirect) {
  runAdminTour({ all: process.argv.includes("--all") }).catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
