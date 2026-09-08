/**
 * Tour Empleado · cada uno registra 1 cliente (o N vía env).
 */
import { buildDemoCustomer } from "../../lib/demo-customers";
import {
  AG_PASSWORD,
  EMPLOYEES,
  asArray,
  c,
  extractSessionCookie,
  failScene,
  finishEmployeeTour,
  getJson,
  getSchedulyBaseUrl,
  msgOf,
  pickEmployee,
  postJson,
  printEmployeeHeader,
  printFooter,
  printHeader,
  printScene,
  saveTestHistory,
  scenesForHistory,
  summarizeScenes,
  type EmployeeSeed,
  type MeUser,
  type StoryScene,
} from "./shared";

const COUNT = Math.max(
  1,
  Number(process.env.EMPLOYEE_TOUR_CUSTOMERS?.trim() || "1"),
);

export async function runOneEmployeeRegisterCustomers(
  employee: EmployeeSeed,
  opts?: { quiet?: boolean; skipHistory?: boolean; count?: number },
): Promise<{ employee: EmployeeSeed; scenes: StoryScene[]; created: number }> {
  const quiet = opts?.quiet === true;
  const skipHistory = opts?.skipHistory === true;
  const count = opts?.count ?? COUNT;
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const scenes: StoryScene[] = [];
  const TOTAL = 5;

  const emit = (scene: StoryScene) => {
    scenes.push(scene);
    if (!quiet) printScene(scenes.length, TOTAL, scene);
  };

  if (!quiet) printEmployeeHeader(employee, "registrar clientes");

  const login = await postJson(`${baseUrl}/api/auth/login`, {
    username: employee.username,
    password: AG_PASSWORD,
  });
  const cookie = extractSessionCookie(login.setCookie);
  if (!login.ok || !cookie) {
    emit(failScene("login", "Ingreso al sistema", login));
    if (!quiet) printFooter(scenes);
    if (!skipHistory) {
      finishEmployeeTour("register-customers", scenes, {
        baseUrl,
        started,
        employee,
      });
    }
    return { employee, scenes, created: 0 };
  }

  const meRes = await getJson(`${baseUrl}/api/auth/me`, cookie);
  const me = (meRes.body ?? {}) as MeUser;
  const localName = me.branch?.name ?? employee.branchKey;
  emit({
    id: "login",
    title: "Ingreso al sistema",
    ok: meRes.ok && me.role === "employee",
    lines: [
      `Entró como ${c.bold}${me.name || employee.firstName}${c.reset}`,
      `Sucursal: ${c.bold}${localName}${c.reset}`,
    ],
  });

  const before = await getJson(`${baseUrl}/api/customers`, cookie);
  const beforeCount = asArray(before.body).length;
  emit({
    id: "list-before",
    title: "Clientes antes de registrar",
    ok: before.ok,
    lines: [`Total en sistema: ${beforeCount}`],
  });

  const createdNames: string[] = [];
  let created = 0;
  let allOk = true;
  for (let i = 0; i < count; i++) {
    const payload = buildDemoCustomer({
      actorTag: employee.username,
      index: i,
      branchHint: localName,
    });
    const res = await postJson(`${baseUrl}/api/customers`, payload, cookie);
    if (res.ok && (res.body as { id?: number })?.id) {
      created += 1;
      createdNames.push(payload.name);
    } else {
      allOk = false;
      createdNames.push(`FAIL ${msgOf(res.body)}`);
    }
  }

  emit({
    id: "register",
    title: `Registra ${count} cliente(s)`,
    ok: allOk && created === count,
    lines: [
      `Creados: ${created}/${count}`,
      ...createdNames.slice(0, 5).map((n) => `· ${n}`),
    ],
  });

  const after = await getJson(`${baseUrl}/api/customers`, cookie);
  const afterCount = asArray(after.body).length;
  emit({
    id: "verify",
    title: "Verifica listado",
    ok: after.ok && afterCount >= beforeCount + created,
    lines: [`Antes ${beforeCount} → ahora ${afterCount}`],
  });

  await postJson(`${baseUrl}/api/auth/logout`, {}, cookie);
  emit({
    id: "logout",
    title: "Cierra sesión",
    ok: true,
    lines: [`${employee.firstName} registró ${created} cliente(s).`],
  });

  if (!quiet) printFooter(scenes);
  if (!skipHistory) {
    finishEmployeeTour("register-customers", scenes, {
      baseUrl,
      started,
      employee,
    });
  }
  return { employee, scenes, created };
}

export async function runAllEmployeesRegisterCustomers() {
  const baseUrl = getSchedulyBaseUrl();
  console.log("");
  console.log(
    `${c.brightYellow}${c.bold}Tour Empleado · registrar clientes TODOS (${EMPLOYEES.length} × ${COUNT})${c.reset}`,
  );
  console.log("");

  const started = Date.now();
  const results = await Promise.all(
    EMPLOYEES.map((e) =>
      runOneEmployeeRegisterCustomers(e, { quiet: true, skipHistory: true }),
    ),
  );
  const ms = Date.now() - started;

  for (const { employee, scenes } of results) {
    printHeader({
      name: `${employee.firstName} ${employee.firstLastName}`,
      role: "Empleado",
      business: "Andrea Guerrero Estética y Peluquería",
      place: `local ${employee.branchKey} · clientes`,
    });
    for (let i = 0; i < scenes.length; i++) {
      printScene(i + 1, scenes.length, scenes[i]);
    }
    printFooter(scenes);
  }

  const totalCreated = results.reduce((n, r) => n + r.created, 0);
  const subjects = results.map(({ employee, scenes, created }) => {
    const sum = summarizeScenes(scenes);
    return {
      username: employee.username,
      name: `${employee.firstName} ${employee.firstLastName}`,
      role: "employee",
      branchKey: employee.branchKey,
      ok: sum.ok,
      passed: sum.passed,
      failed: sum.failed,
      total: sum.total,
      created,
      scenes: scenesForHistory(scenes),
    };
  });
  const anyFail = subjects.some((s) => !s.ok);

  console.log(
    `${c.bold}Resumen · ${EMPLOYEES.length} empleados · ${totalCreated} clientes · ${ms} ms${c.reset}`,
  );
  for (const t of subjects) {
    console.log(
      `  · ${t.name} · ${t.created} cliente(s) · ${t.failed === 0 ? "OK" : "FAIL"}`,
    );
  }
  console.log(
    anyFail
      ? `${c.red}Hay fallos.${c.reset}`
      : `${c.green}Cada empleado registró su(s) cliente(s).${c.reset}`,
  );
  console.log("");

  saveTestHistory({
    tester: "employee-tour",
    mode: "register-customers-all",
    baseUrl,
    durationMs: ms,
    ok: !anyFail,
    summary: {
      passed: subjects.reduce((n, s) => n + s.passed, 0),
      failed: subjects.reduce((n, s) => n + s.failed, 0),
      total: subjects.reduce((n, s) => n + s.total, 0),
    },
    subjects,
    meta: { totalCreated, perEmployee: COUNT },
  });
}

export async function runEmployeeRegisterCustomersTour(forced?: EmployeeSeed) {
  if (forced) {
    process.stdout.write(c.clear + c.show);
    await runOneEmployeeRegisterCustomers(forced, { quiet: false });
    return;
  }
  const picked = await pickEmployee({
    allowAll: true,
    title: "Registrar clientes · ¿qué Empleado?",
  });
  if (picked.kind === "cancel") {
    console.log(`${c.dim}Cancelado.${c.reset}`);
    return;
  }
  process.stdout.write(c.clear + c.show);
  if (picked.kind === "all") {
    await runAllEmployeesRegisterCustomers();
    return;
  }
  await runOneEmployeeRegisterCustomers(picked.employee, { quiet: false });
}
