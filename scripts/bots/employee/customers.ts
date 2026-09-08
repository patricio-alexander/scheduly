/**
 * Tour Empleado · clientes: listar, crear y editar.
 * Uno o todos en paralelo (cada uno según su sucursal).
 */
import { nowStamp } from "../../lib/menu-ui";
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
  putJson,
  saveTestHistory,
  scenesForHistory,
  summarizeScenes,
  type EmployeeSeed,
  type MeUser,
  type StoryScene,
} from "./shared";

type CustomerRow = {
  id?: number;
  name?: string;
  phone?: string;
  email?: string;
};

export async function runOneEmployeeCustomers(
  employee: EmployeeSeed,
  opts?: { quiet?: boolean; skipHistory?: boolean },
): Promise<{ employee: EmployeeSeed; scenes: StoryScene[] }> {
  const quiet = opts?.quiet === true;
  const skipHistory = opts?.skipHistory === true;
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const scenes: StoryScene[] = [];
  const TOTAL = 7;

  const emit = (scene: StoryScene) => {
    scenes.push(scene);
    if (!quiet) printScene(scenes.length, TOTAL, scene);
  };

  if (!quiet) printEmployeeHeader(employee, "clientes");

  const login = await postJson(`${baseUrl}/api/auth/login`, {
    username: employee.username,
    password: AG_PASSWORD,
  });
  const cookie = extractSessionCookie(login.setCookie);
  if (!login.ok || !cookie) {
    emit(failScene("login", "Ingreso al sistema", login));
    if (!quiet) printFooter(scenes);
    if (!skipHistory) {
      finishEmployeeTour("customers", scenes, { baseUrl, started, employee });
    }
    return { employee, scenes };
  }

  const meRes = await getJson(`${baseUrl}/api/auth/me`, cookie);
  const me = (meRes.body ?? {}) as MeUser;
  const roleOk = meRes.ok && me.role === "employee";
  const localName = me.branch?.name ?? employee.branchKey;

  emit({
    id: "login",
    title: "Ingreso al sistema",
    ok: roleOk,
    lines: roleOk
      ? [
          `Entró como ${c.bold}${me.name || employee.firstName}${c.reset}`,
          `Sucursal: ${c.bold}${localName}${c.reset}`,
        ]
      : [`Rol inesperado: ${me.role ?? "?"}`],
  });
  if (!roleOk) {
    if (!quiet) printFooter(scenes);
    if (!skipHistory) {
      finishEmployeeTour("customers", scenes, { baseUrl, started, employee });
    }
    return { employee, scenes };
  }

  const list = await getJson(`${baseUrl}/api/customers`, cookie);
  const customers = asArray(list.body) as CustomerRow[];
  emit({
    id: "list-customers",
    title: `Ve clientes · ${localName}`,
    ok: list.ok,
    lines: list.ok
      ? [
          `Cargaron ${c.bold}${customers.length}${c.reset} cliente(s)`,
          ...customers.slice(0, 2).map((c0) => `· ${c0.name ?? "?"}`),
        ]
      : [`HTTP ${list.status} ${msgOf(list.body)}`],
  });

  const stamp = `${nowStamp().replace(/[: ]/g, "").slice(-5)}_${employee.username}`;
  const branchTag = (me.branch?.name || employee.branchKey)
    .replace(/Andrea Guerrero\s*·\s*/i, "")
    .trim() || employee.branchKey;
  const create = await postJson(
    `${baseUrl}/api/customers`,
    {
      name: `Cliente ${branchTag} ${stamp}`,
      phone: "0991112233",
      email: `cli.${employee.username}.${stamp.slice(-4)}@andreaguerrero.ec`,
      address: `Loja · ${localName}`,
    },
    cookie,
  );
  const created = (create.body ?? {}) as CustomerRow;
  emit({
    id: "create-customer",
    title: "Registra cliente (su sucursal)",
    ok: create.ok && Boolean(created.id),
    lines: create.ok
      ? [
          `Cliente: ${created.name ?? "—"}`,
          `id=${created.id} · ${localName}`,
        ]
      : [`HTTP ${create.status} ${msgOf(create.body)}`],
  });

  if (create.ok && created.id) {
    const editedName = `${created.name} · edit`;
    const editedPhone = "0987654321";
    const put = await putJson(
      `${baseUrl}/api/customers/${created.id}`,
      {
        name: editedName,
        phone: editedPhone,
        email: created.email,
        address: `Loja · ${localName} (actualizado)`,
      },
      cookie,
    );
    const updated = (put.body ?? {}) as CustomerRow;
    emit({
      id: "edit-customer",
      title: "Edita datos del cliente",
      ok:
        put.ok &&
        String(updated.name ?? "").includes("edit") &&
        String(updated.phone ?? "") === editedPhone,
      lines: put.ok
        ? [
            `Nombre → ${updated.name}`,
            `Tel → ${updated.phone}`,
            `${c.green}Empleado puede editar clientes${c.reset}`,
          ]
        : [`HTTP ${put.status} ${msgOf(put.body)}`],
    });

    const verify = await getJson(
      `${baseUrl}/api/customers/${created.id}`,
      cookie,
    );
    const one = (verify.body ?? {}) as CustomerRow;
    emit({
      id: "verify-customer",
      title: "Verifica el cliente editado",
      ok: verify.ok && one.name === editedName,
      lines: verify.ok
        ? [`GET: ${one.name} · ${one.phone}`]
        : [`HTTP ${verify.status}`],
    });
  }

  const logout = await postJson(`${baseUrl}/api/auth/logout`, {}, cookie);
  emit({
    id: "logout",
    title: "Cierra sesión",
    ok: logout.ok || logout.status === 200,
    lines: [`${employee.firstName} termina clientes de «${localName}».`],
  });

  if (!quiet) printFooter(scenes);
  if (!skipHistory) {
    finishEmployeeTour("customers", scenes, { baseUrl, started, employee });
  }
  return { employee, scenes };
}

export async function runAllEmployeesCustomers() {
  const baseUrl = getSchedulyBaseUrl();
  console.log("");
  console.log(
    `${c.brightYellow}${c.bold}Tour Empleado · clientes TODOS (${EMPLOYEES.length}) · por sucursal${c.reset}`,
  );
  console.log("");

  const started = Date.now();
  const results = await Promise.all(
    EMPLOYEES.map((e) =>
      runOneEmployeeCustomers(e, { quiet: true, skipHistory: true }),
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

  const subjects = results.map(({ employee, scenes }) => {
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
      scenes: scenesForHistory(scenes),
    };
  });
  const passed = subjects.reduce((n, s) => n + s.passed, 0);
  const failed = subjects.reduce((n, s) => n + s.failed, 0);
  const anyFail = subjects.some((s) => !s.ok);

  const byBranch = new Map<string, string[]>();
  for (const t of subjects) {
    const key = t.branchKey;
    const arr = byBranch.get(key) ?? [];
    arr.push(`${t.name}${t.ok ? "" : " FAIL"}`);
    byBranch.set(key, arr);
  }

  console.log(
    `${c.bold}Resumen · ${EMPLOYEES.length} empleados · ${ms} ms${c.reset}`,
  );
  for (const [branch, names] of byBranch) {
    console.log(`  · ${branch}: ${names.join(", ")}`);
  }
  for (const t of subjects) {
    console.log(
      `  · ${t.name} (@${t.username}) · ${t.branchKey} · ${t.failed === 0 ? "OK" : `${t.failed} FAIL`} · ${t.passed}/${t.total}`,
    );
  }
  console.log(
    anyFail
      ? `${c.red}Hay fallos.${c.reset}`
      : `${c.green}Todos agregaron y editaron clientes según su sucursal.${c.reset}`,
  );
  console.log("");

  saveTestHistory({
    tester: "employee-tour",
    mode: "customers-all-parallel",
    baseUrl,
    durationMs: ms,
    ok: !anyFail,
    summary: { passed, failed, total: passed + failed },
    subjects,
  });
}

export async function runEmployeeCustomersTour(forced?: EmployeeSeed) {
  if (forced) {
    process.stdout.write(c.clear + c.show);
    await runOneEmployeeCustomers(forced, { quiet: false });
    return;
  }

  const picked = await pickEmployee({
    allowAll: true,
    title: "Clientes · ¿qué Empleado? (uno o todos)",
  });
  if (picked.kind === "cancel") {
    console.log(`${c.dim}Cancelado.${c.reset}`);
    return;
  }
  process.stdout.write(c.clear + c.show);
  if (picked.kind === "all") {
    await runAllEmployeesCustomers();
    return;
  }
  await runOneEmployeeCustomers(picked.employee, { quiet: false });
}
