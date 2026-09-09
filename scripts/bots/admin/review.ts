/**
 * Tour Admin · solo revisión (uno o todos en paralelo).
 */
import {
  AG_ADMINS,
  AG_PASSWORD,
  asArray,
  c,
  extractSessionCookie,
  failScene,
  finishAdminTour,
  getJson,
  getSchedulyBaseUrl,
  money,
  num,
  pickAdmin,
  postJson,
  printAdminHeader,
  printFooter,
  printHeader,
  printScene,
  saveTestHistory,
  scenesForHistory,
  summarizeScenes,
  type AdminSeed,
  type StoryScene,
} from "./shared";
import { botConcurrency, mapPool } from "../../lib/map-pool";

export async function runOneAdminReview(
  admin: AdminSeed,
  opts?: { quiet?: boolean; skipHistory?: boolean },
): Promise<{ admin: AdminSeed; scenes: StoryScene[] }> {
  const quiet = opts?.quiet === true;
  const skipHistory = opts?.skipHistory === true;
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const scenes: StoryScene[] = [];
  const TOTAL = 12;

  const emit = (scene: StoryScene) => {
    scenes.push(scene);
    if (!quiet) printScene(scenes.length, TOTAL, scene);
  };

  if (!quiet) printAdminHeader(admin, "solo revisión");

  const login = await postJson(`${baseUrl}/api/auth/login`, {
    username: admin.username,
    password: AG_PASSWORD,
  });
  const cookie = extractSessionCookie(login.setCookie);

  if (!login.ok || !cookie) {
    emit(failScene("login", "Ingreso al sistema", login));
    if (!quiet) printFooter(scenes);
    if (!skipHistory) {
      finishAdminTour("review", scenes, { baseUrl, started, admin });
    }
    return { admin, scenes };
  }

  const me = await getJson(`${baseUrl}/api/auth/me`, cookie);
  const meUser = (me.body ?? {}) as {
    id?: number;
    name?: string;
    role?: string;
    branch?: { id?: number; name?: string } | null;
  };
  const roleOk = me.ok && meUser.role === "admin";
  const localName = meUser.branch?.name ?? admin.branchKey;

  emit({
    id: "login",
    title: "Ingreso al sistema",
    ok: roleOk,
    lines: roleOk
      ? [
          `Entró como ${c.bold}${meUser.name || `${admin.firstName} ${admin.firstLastName}`}${c.reset}`,
          `Rol: ${c.brightYellow}Administrador${c.reset} · local: ${c.bold}${localName}${c.reset}`,
        ]
      : [`Se esperaba admin, llegó: ${meUser.role ?? "?"}`],
  });
  if (!roleOk) {
    if (!quiet) printFooter(scenes);
    if (!skipHistory) {
      finishAdminTour("review", scenes, { baseUrl, started, admin });
    }
    return { admin, scenes };
  }

  const dash = await getJson(
    `${baseUrl}/api/dashboard?userId=${meUser.id ?? ""}&period=week`,
    cookie,
  );
  if (!dash.ok) {
    emit(failScene("panel", "Panel de su local", dash));
  } else {
    const d = dash.body as Record<string, unknown>;
    const hero = (d.financeHero ?? null) as Record<string, unknown> | null;
    const revenue =
      hero && typeof hero.revenue === "number" ? hero.revenue : d.revenue;
    emit({
      id: "panel",
      title: `Panel · solo ${localName}`,
      ok: true,
      lines: [
        `Ingresos: ${c.brightGreen}${money(revenue)}${c.reset}`,
        `Actividad: ${num(d.totalAppointments)} · completadas: ${num(d.completed)}`,
      ],
    });
  }

  async function reviewList(optsList: {
    id: string;
    title: string;
    path: string;
    emptyOk?: string;
  }) {
    const res = await getJson(`${baseUrl}${optsList.path}`, cookie!);
    if (!res.ok) {
      emit(failScene(optsList.id, optsList.title, res));
      return;
    }
    const items = asArray(res.body);
    emit({
      id: optsList.id,
      title: optsList.title,
      ok: true,
      lines: [
        items.length > 0
          ? `Cargaron ${c.bold}${items.length}${c.reset} registro(s)`
          : optsList.emptyOk ?? `Vista OK · 0 registros`,
      ],
    });
  }

  {
    const res = await getJson(`${baseUrl}/api/branches`, cookie);
    if (!res.ok) {
      emit(failScene("branches", "Revisa su local", res));
    } else {
      const items = asArray(res.body) as Array<{ name: string }>;
      emit({
        id: "branches",
        title: "Revisa Sucursales (solo la suya)",
        ok: items.length <= 1,
        lines: [
          `Vio ${items.length}: ${items.map((b) => b.name).join(" · ") || "—"}`,
          items.length <= 1
            ? `${c.green}Correcto: scope de local${c.reset}`
            : `${c.yellow}Vio más de un local${c.reset}`,
        ],
      });
    }
  }

  await reviewList({ id: "customers", title: "Clientes", path: "/api/customers" });
  await reviewList({ id: "services", title: "Servicios", path: "/api/services" });
  await reviewList({ id: "products", title: "Productos", path: "/api/products" });
  await reviewList({
    id: "appointments",
    title: "Agenda",
    path: "/api/appointments",
    emptyOk: `Agenda OK · sin citas`,
  });

  {
    const cash = await getJson(`${baseUrl}/api/cash`, cookie);
    const shift = await getJson(`${baseUrl}/api/shifts/active`, cookie);
    emit({
      id: "cash",
      title: "Caja / turno",
      ok: cash.ok && shift.ok,
      lines:
        cash.ok && shift.ok
          ? [`Cajas: ${asArray(cash.body).length}`]
          : [`Error caja/turno`],
    });
  }

  await reviewList({
    id: "pos",
    title: "Ventas POS",
    path: "/api/orders/pos-sales?limit=30",
    emptyOk: `Sin tickets aún`,
  });

  {
    const users = await getJson(
      `${baseUrl}/api/users?includeInactive=1`,
      cookie,
    );
    if (!users.ok) {
      emit(failScene("team", "Equipo de su local", users));
    } else {
      const items = asArray(users.body) as Array<{
        username?: string;
        roles?: string[];
        role?: string;
      }>;
      const hasOwner = items.some((u) =>
        (u.roles ?? [u.role]).some(
          (r) =>
            String(r).toLowerCase().includes("dueño") ||
            String(r).toLowerCase() === "owner",
        ),
      );
      emit({
        id: "team",
        title: "Lista empleados de su local",
        ok: !hasOwner,
        lines: [
          `Ve ${items.length} cuenta(s) de su sucursal`,
          hasOwner
            ? `${c.yellow}Ojo: aparece la Dueña en el listado${c.reset}`
            : `${c.green}Correcto: solo equipo del local (sin Dueña)${c.reset}`,
        ],
      });
    }
  }

  const logout = await postJson(`${baseUrl}/api/auth/logout`, {}, cookie);
  emit({
    id: "logout",
    title: "Cierra sesión",
    ok: logout.ok || logout.status === 200,
    lines: [`${admin.firstName} termina la revisión.`],
  });

  if (!quiet) printFooter(scenes);
  if (!skipHistory) {
    finishAdminTour("review", scenes, { baseUrl, started, admin });
  }
  return { admin, scenes };
}

export async function runAllAdminsReview() {
  const baseUrl = getSchedulyBaseUrl();
  const concurrency = botConcurrency(2);
  console.log("");
  console.log(
    `${c.brightYellow}${c.bold}Tour Admin · revisión TODOS (${AG_ADMINS.length}) · cola ${concurrency}${c.reset}`,
  );
  console.log("");

  const started = Date.now();
  const results = await mapPool(AG_ADMINS, concurrency, (a) =>
    runOneAdminReview(a, { quiet: true, skipHistory: true }),
  );
  const ms = Date.now() - started;

  for (const { admin, scenes } of results) {
    printHeader({
      name: `${admin.firstName} ${admin.firstLastName}`,
      role: "Administrador",
      business: "Andrea Guerrero Estética y Peluquería",
      place: `local ${admin.branchKey}`,
    });
    for (let i = 0; i < scenes.length; i++) {
      printScene(i + 1, scenes.length, scenes[i]);
    }
    printFooter(scenes);
  }

  const subjects = results.map(({ admin, scenes }) => {
    const sum = summarizeScenes(scenes);
    return {
      username: admin.username,
      name: `${admin.firstName} ${admin.firstLastName}`,
      role: "admin",
      branchKey: admin.branchKey,
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
    `${c.bold}Resumen global · ${AG_ADMINS.length} admins · ${ms} ms${c.reset}`,
  );
  for (const t of subjects) {
    console.log(
      `  · ${t.name} (@${t.username}) · ${t.failed === 0 ? "OK" : `${t.failed} FAIL`} · ${t.passed}/${t.total}`,
    );
  }
  console.log(
    anyFail ? `${c.red}Hay fallos.${c.reset}` : `${c.green}Todos OK.${c.reset}`,
  );
  console.log("");

  saveTestHistory({
    tester: "admin-tour",
    mode: "review-all-parallel",
    baseUrl,
    durationMs: ms,
    ok: !anyFail,
    summary: { passed, failed, total: passed + failed },
    subjects,
  });
}

export async function runAdminReviewTour() {
  const picked = await pickAdmin({
    allowAll: true,
    title: "Revisión · ¿qué Administrador?",
  });
  if (picked.kind === "cancel") {
    console.log(`${c.dim}Cancelado.${c.reset}`);
    return;
  }
  process.stdout.write(c.clear + c.show);
  if (picked.kind === "all") {
    await runAllAdminsReview();
    return;
  }
  await runOneAdminReview(picked.admin, { quiet: false });
}
