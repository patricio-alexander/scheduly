/**
 * Tour Empleado · submenú de scripts.
 */
import { c, selectList, type MenuRow } from "../lib/menu-ui";
import { EMPLOYEES } from "./employee/shared";
import {
  runAllEmployeesReview,
  runEmployeeReviewTour,
  runOneEmployeeReview,
} from "./employee/review";
import { runEmployeeEditProfileTour } from "./employee/edit-profile";
import { runEmployeeCustomersTour, runAllEmployeesCustomers } from "./employee/customers";
import {
  runEmployeeRegisterCustomersTour,
  runAllEmployeesRegisterCustomers,
} from "./employee/register-customers";
import {
  runEmployeeScheduleTour,
  runAllEmployeesSchedule,
} from "./employee/schedule";

function resolveEmployeeFromEnv() {
  const user =
    process.env.EMPLOYEE_TOUR_USER?.trim() ||
    process.argv.find((a) => a.startsWith("--user="))?.slice("--user=".length);
  return EMPLOYEES.find((e) => e.username === user) ?? EMPLOYEES[0];
}

export async function runEmployeeTour(opts?: { all?: boolean }) {
  const forceScript =
    process.env.EMPLOYEE_TOUR_SCRIPT?.trim() ||
    process.argv
      .find((a) => a.startsWith("--script="))
      ?.slice("--script=".length);

  const forceAll =
    opts?.all === true ||
    process.env.EMPLOYEE_TOUR_ALL === "1" ||
    process.argv.includes("--all");

  if (forceAll || forceScript === "review-all") {
    process.stdout.write(c.clear + c.show);
    await runAllEmployeesReview();
    return;
  }
  if (forceScript === "review") {
    await runOneEmployeeReview(resolveEmployeeFromEnv(), { quiet: false });
    return;
  }
  if (forceScript === "edit-profile") {
    await runEmployeeEditProfileTour(resolveEmployeeFromEnv());
    return;
  }
  if (forceScript === "customers-all") {
    process.stdout.write(c.clear + c.show);
    await runAllEmployeesCustomers();
    return;
  }
  if (forceScript === "customers") {
    await runEmployeeCustomersTour(resolveEmployeeFromEnv());
    return;
  }
  if (forceScript === "register-customers-all") {
    process.stdout.write(c.clear + c.show);
    await runAllEmployeesRegisterCustomers();
    return;
  }
  if (forceScript === "register-customers") {
    await runEmployeeRegisterCustomersTour(resolveEmployeeFromEnv());
    return;
  }
  if (forceScript === "schedule-all") {
    process.stdout.write(c.clear + c.show);
    await runAllEmployeesSchedule();
    return;
  }
  if (forceScript === "schedule") {
    await runEmployeeScheduleTour(resolveEmployeeFromEnv());
    return;
  }

  console.log("");
  console.log(`${c.dim}Tour Empleado · elige qué script correr${c.reset}`);
  console.log("");

  const rows: MenuRow[] = [
    {
      kind: "script",
      index: 0,
      title: "Solo revisión (uno o todos)",
      item: {
        id: "review",
        title: "Solo revisión (uno o todos)",
        desc: "Panel, clientes, servicios, mi agenda… sin escribir.",
        danger: "low",
        action: "review",
      },
    },
    {
      kind: "script",
      index: 1,
      title: "Editar mi perfil",
      item: {
        id: "edit-profile",
        title: "Editar mi perfil",
        desc: "Cambia nombre/teléfono de su perfil y restaura.",
        danger: "med",
        write: true,
        action: "edit-profile",
      },
    },
    {
      kind: "script",
      index: 2,
      title: "Clientes: agregar / editar (uno o todos)",
      item: {
        id: "customers",
        title: "Clientes: agregar / editar (uno o todos)",
        desc: "Cada empleado (según su sucursal) lista, crea y edita clientes.",
        danger: "med",
        write: true,
        action: "customers",
      },
    },
    {
      kind: "script",
      index: 3,
      title: "Registrar clientes (1 c/u, uno o todos)",
      item: {
        id: "register-customers",
        title: "Registrar clientes (1 c/u, uno o todos)",
        desc: "Cada empleado da de alta 1 cliente nuevo en el sistema.",
        danger: "med",
        write: true,
        action: "register-customers",
      },
    },
    {
      kind: "script",
      index: 4,
      title: "Agendar turnos + servicios/productos (uno o todos)",
      item: {
        id: "schedule",
        title: "Agendar turnos + servicios/productos (uno o todos)",
        desc: "Dueña fija horario; cada empleado agenda N turnos/hora con servicio+productos (también a compañeros).",
        danger: "med",
        write: true,
        action: "schedule",
      },
    },
    { kind: "back", id: "__cancel__", title: "Cancelar" },
  ];

  const picked = await selectList(
    "Scheduly",
    "Tour Empleado · ¿qué script?",
    rows,
    (r) => {
      if (r?.kind === "script" && r.item) {
        return `${c.dim}${r.item.desc}${c.reset}`;
      }
      return `${c.dim}Vuelve sin correr.${c.reset}`;
    },
  );

  if (!picked || picked.kind === "back" || !picked.item) {
    console.log(`${c.dim}Tour empleado cancelado.${c.reset}`);
    return;
  }

  process.stdout.write(c.clear + c.show);

  switch (picked.item.action) {
    case "review":
      await runEmployeeReviewTour();
      break;
    case "edit-profile":
      await runEmployeeEditProfileTour();
      break;
    case "customers":
      await runEmployeeCustomersTour();
      break;
    case "register-customers":
      await runEmployeeRegisterCustomersTour();
      break;
    case "schedule":
      await runEmployeeScheduleTour();
      break;
    default:
      console.log(`${c.red}Script desconocido.${c.reset}`);
  }
}

const isDirect =
  typeof process.argv[1] === "string" &&
  process.argv[1]
    .replace(/\\/g, "/")
    .endsWith("/scripts/bots/employee-tour.ts");

if (isDirect) {
  runEmployeeTour({ all: process.argv.includes("--all") }).catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
