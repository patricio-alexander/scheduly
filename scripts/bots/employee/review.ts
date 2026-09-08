/**
 * Tour Empleado · solo revisión (uno o todos).
 */
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
  money,
  num,
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
  type StoryScene,
} from "./shared";

export async function runOneEmployeeReview(
  employee: EmployeeSeed,
  opts?: { quiet?: boolean; skipHistory?: boolean },
): Promise<{ employee: EmployeeSeed; scenes: StoryScene[] }> {
  const quiet = opts?.quiet === true;
  const skipHistory = opts?.skipHistory === true;
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const scenes: StoryScene[] = [];
  const TOTAL = 10;

  const emit = (scene: StoryScene) => {
    scenes.push(scene);
    if (!quiet) printScene(scenes.length, TOTAL, scene);
  };

  if (!quiet) printEmployeeHeader(employee, "solo revisión");

  const login = await postJson(`${baseUrl}/api/auth/login`, {
    username: employee.username,
    password: AG_PASSWORD,
  });
  const cookie = extractSessionCookie(login.setCookie);
  if (!login.ok || !cookie) {
    emit(failScene("login", "Ingreso al sistema", login));
    if (!quiet) printFooter(scenes);
    if (!skipHistory) {
      finishEmployeeTour("review", scenes, { baseUrl, started, employee });
    }
    return { employee, scenes };
  }

  const me = await getJson(`${baseUrl}/api/auth/me`, cookie);
  const meUser = (me.body ?? {}) as {
    id?: number;
    name?: string;
    role?: string;
    branch?: { name?: string } | null;
  };
  const roleOk = me.ok && meUser.role === "employee";
  emit({
    id: "login",
    title: "Ingreso al sistema",
    ok: roleOk,
    lines: roleOk
      ? [
          `Entró como ${c.bold}${meUser.name || employee.firstName}${c.reset}`,
          `Local: ${meUser.branch?.name ?? employee.branchKey}`,
        ]
      : [`Rol inesperado: ${meUser.role ?? "?"}`],
  });
  if (!roleOk) {
    if (!quiet) printFooter(scenes);
    if (!skipHistory) {
      finishEmployeeTour("review", scenes, { baseUrl, started, employee });
    }
    return { employee, scenes };
  }

  const dash = await getJson(
    `${baseUrl}/api/dashboard?userId=${meUser.id ?? ""}&period=week`,
    cookie,
  );
  if (!dash.ok) emit(failScene("panel", "Panel", dash));
  else {
    const d = dash.body as Record<string, unknown>;
    emit({
      id: "panel",
      title: "Panel de trabajo",
      ok: true,
      lines: [
        `Actividad: ${num(d.totalAppointments)} · completadas: ${num(d.completed)}`,
        `Servicios/productos: ${num(d.totalServices)} / ${num(d.totalProducts)}`,
      ],
    });
  }

  for (const item of [
    { id: "customers", title: "Clientes", path: "/api/customers" },
    { id: "services", title: "Servicios", path: "/api/services" },
    { id: "products", title: "Productos", path: "/api/products" },
    {
      id: "appointments",
      title: "Mi agenda",
      path: "/api/appointments?view=mine",
      emptyOk: "Agenda OK · sin citas",
    },
  ] as const) {
    const res = await getJson(`${baseUrl}${item.path}`, cookie);
    if (!res.ok) emit(failScene(item.id, item.title, res));
    else {
      const items = asArray(res.body);
      emit({
        id: item.id,
        title: item.title,
        ok: true,
        lines: [
          items.length > 0
            ? `Cargaron ${c.bold}${items.length}${c.reset}`
            : ("emptyOk" in item ? item.emptyOk : "0 registros") ?? "0",
        ],
      });
    }
  }

  {
    const users = await getJson(`${baseUrl}/api/users`, cookie);
    emit({
      id: "users-forbidden",
      title: "No administra cuentas globales",
      ok: users.status === 403 || !users.ok,
      lines:
        users.status === 403
          ? [`${c.green}Correcto: 403 en /api/users${c.reset}`]
          : [`HTTP ${users.status}`],
    });
  }

  const logout = await postJson(`${baseUrl}/api/auth/logout`, {}, cookie);
  emit({
    id: "logout",
    title: "Cierra sesión",
    ok: logout.ok || logout.status === 200,
    lines: [`${employee.firstName} sale.`],
  });

  if (!quiet) printFooter(scenes);
  if (!skipHistory) {
    finishEmployeeTour("review", scenes, { baseUrl, started, employee });
  }
  return { employee, scenes };
}

export async function runAllEmployeesReview() {
  const baseUrl = getSchedulyBaseUrl();
  console.log(
    `${c.brightYellow}${c.bold}Tour Empleado · revisión TODOS (${EMPLOYEES.length})${c.reset}`,
  );
  const started = Date.now();
  const results = await Promise.all(
    EMPLOYEES.map((e) =>
      runOneEmployeeReview(e, { quiet: true, skipHistory: true }),
    ),
  );
  const ms = Date.now() - started;

  for (const { employee, scenes } of results) {
    printHeader({
      name: `${employee.firstName} ${employee.firstLastName}`,
      role: "Empleado",
      business: "Andrea Guerrero Estética y Peluquería",
      place: `local ${employee.branchKey}`,
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

  console.log(
    `${c.bold}Resumen · ${EMPLOYEES.length} empleados · ${ms} ms${c.reset}`,
  );
  for (const t of subjects) {
    console.log(
      `  · ${t.name} · ${t.failed === 0 ? "OK" : `${t.failed} FAIL`} · ${t.passed}/${t.total}`,
    );
  }
  console.log(
    anyFail ? `${c.red}Hay fallos.${c.reset}` : `${c.green}Todos OK.${c.reset}`,
  );

  saveTestHistory({
    tester: "employee-tour",
    mode: "review-all-parallel",
    baseUrl,
    durationMs: ms,
    ok: !anyFail,
    summary: { passed, failed, total: passed + failed },
    subjects,
  });
}

export async function runEmployeeReviewTour() {
  const picked = await pickEmployee({
    allowAll: true,
    title: "Revisión · ¿qué Empleado?",
  });
  if (picked.kind === "cancel") {
    console.log(`${c.dim}Cancelado.${c.reset}`);
    return;
  }
  process.stdout.write(c.clear + c.show);
  if (picked.kind === "all") {
    await runAllEmployeesReview();
    return;
  }
  await runOneEmployeeReview(picked.employee, { quiet: false });
}

void money;
