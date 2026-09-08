/**
 * Tour Administrador · registra clientes del local (default 10 c/u).
 */
import { buildDemoCustomer } from "../../lib/demo-customers";
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
  msgOf,
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
  type MeUser,
  type StoryScene,
} from "./shared";

const COUNT = Math.max(
  1,
  Number(process.env.ADMIN_TOUR_CUSTOMERS?.trim() || "10"),
);

export async function runOneAdminRegisterCustomers(
  admin: AdminSeed,
  opts?: { quiet?: boolean; skipHistory?: boolean; count?: number },
): Promise<{ admin: AdminSeed; scenes: StoryScene[]; created: number }> {
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

  if (!quiet) printAdminHeader(admin, "registrar clientes");

  const login = await postJson(`${baseUrl}/api/auth/login`, {
    username: admin.username,
    password: AG_PASSWORD,
  });
  const cookie = extractSessionCookie(login.setCookie);
  if (!login.ok || !cookie) {
    emit(failScene("login", "Ingreso al sistema", login));
    if (!quiet) printFooter(scenes);
    if (!skipHistory) {
      finishAdminTour("register-customers", scenes, {
        baseUrl,
        started,
        admin,
      });
    }
    return { admin, scenes, created: 0 };
  }

  const meRes = await getJson(`${baseUrl}/api/auth/me`, cookie);
  const me = (meRes.body ?? {}) as MeUser;
  const localName = me.branch?.name ?? admin.branchKey;
  emit({
    id: "login",
    title: "Ingreso al sistema",
    ok: meRes.ok && me.role === "admin",
    lines: [
      `Entró como ${c.bold}${me.name || admin.firstName}${c.reset}`,
      `Local: ${c.bold}${localName}${c.reset}`,
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

  const lines: string[] = [];
  let created = 0;
  let allOk = true;
  for (let i = 0; i < count; i++) {
    const payload = buildDemoCustomer({
      actorTag: admin.username,
      index: i,
      branchHint: localName,
    });
    const res = await postJson(`${baseUrl}/api/customers`, payload, cookie);
    if (res.ok && (res.body as { id?: number })?.id) {
      created += 1;
      if (i < 4) lines.push(`· ${payload.name}`);
    } else {
      allOk = false;
      lines.push(`· FAIL #${i + 1} ${msgOf(res.body)}`);
    }
  }

  emit({
    id: "register",
    title: `Registra ${count} clientes`,
    ok: allOk && created === count,
    lines: [`Creados: ${created}/${count}`, ...lines],
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
    lines: [`${admin.firstName} registró ${created} clientes.`],
  });

  if (!quiet) printFooter(scenes);
  if (!skipHistory) {
    finishAdminTour("register-customers", scenes, { baseUrl, started, admin });
  }
  return { admin, scenes, created };
}

export async function runAllAdminsRegisterCustomers() {
  const baseUrl = getSchedulyBaseUrl();
  console.log("");
  console.log(
    `${c.brightCyan}${c.bold}Tour Admin · registrar clientes TODOS (${AG_ADMINS.length} × ${COUNT})${c.reset}`,
  );
  console.log("");

  const started = Date.now();
  const results = await Promise.all(
    AG_ADMINS.map((a) =>
      runOneAdminRegisterCustomers(a, { quiet: true, skipHistory: true }),
    ),
  );
  const ms = Date.now() - started;

  for (const { admin, scenes } of results) {
    printHeader({
      name: `${admin.firstName} ${admin.firstLastName}`,
      role: "Administrador",
      business: "Andrea Guerrero Estética y Peluquería",
      place: `local ${admin.branchKey} · clientes`,
    });
    for (let i = 0; i < scenes.length; i++) {
      printScene(i + 1, scenes.length, scenes[i]);
    }
    printFooter(scenes);
  }

  const totalCreated = results.reduce((n, r) => n + r.created, 0);
  const subjects = results.map(({ admin, scenes, created }) => {
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
      created,
      scenes: scenesForHistory(scenes),
    };
  });
  const anyFail = subjects.some((s) => !s.ok);

  console.log(
    `${c.bold}Resumen · ${AG_ADMINS.length} admins · ${totalCreated} clientes · ${ms} ms${c.reset}`,
  );
  for (const t of subjects) {
    console.log(
      `  · ${t.name} · ${t.created} clientes · ${t.failed === 0 ? "OK" : "FAIL"}`,
    );
  }
  console.log(
    anyFail
      ? `${c.red}Hay fallos.${c.reset}`
      : `${c.green}Cada admin registró ${COUNT} clientes.${c.reset}`,
  );
  console.log("");

  saveTestHistory({
    tester: "admin-tour",
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
    meta: { totalCreated, perAdmin: COUNT },
  });
}

export async function runAdminRegisterCustomersTour(forced?: AdminSeed) {
  if (forced) {
    process.stdout.write(c.clear + c.show);
    await runOneAdminRegisterCustomers(forced, { quiet: false });
    return;
  }
  const picked = await pickAdmin({
    allowAll: true,
    title: "Registrar clientes · ¿qué Admin?",
  });
  if (picked.kind === "cancel") {
    console.log(`${c.dim}Cancelado.${c.reset}`);
    return;
  }
  process.stdout.write(c.clear + c.show);
  if (picked.kind === "all") {
    await runAllAdminsRegisterCustomers();
    return;
  }
  await runOneAdminRegisterCustomers(picked.admin, { quiet: false });
}
