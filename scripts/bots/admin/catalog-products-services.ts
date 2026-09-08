/**
 * Tour Admin · catálogo productos/servicios.
 * Uno o todos en paralelo; cada admin usa items únicos de su local.
 */
import { nowStamp } from "../../lib/menu-ui";
import {
  AG_ADMINS,
  AG_PASSWORD,
  asArray,
  c,
  deleteJson,
  extractSessionCookie,
  failScene,
  finishAdminTour,
  getJson,
  getSchedulyBaseUrl,
  money,
  msgOf,
  pickAdmin,
  postJson,
  printAdminHeader,
  printFooter,
  printHeader,
  printScene,
  putJson,
  saveTestHistory,
  scenesForHistory,
  summarizeScenes,
  type AdminSeed,
  type MeUser,
  type StoryScene,
} from "./shared";

type ProductRow = {
  id?: number;
  name?: string;
  price?: number;
  stock?: number;
  categoryId?: number | null;
};

type ServiceRow = {
  id?: number;
  name?: string;
  price?: number;
  durationMinutes?: number;
  commissionPct?: number;
};

export async function runOneAdminCatalog(
  admin: AdminSeed,
  opts?: { quiet?: boolean; skipHistory?: boolean },
): Promise<{ admin: AdminSeed; scenes: StoryScene[] }> {
  const quiet = opts?.quiet === true;
  const skipHistory = opts?.skipHistory === true;
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const scenes: StoryScene[] = [];
  const TOTAL = 11;

  const emit = (scene: StoryScene) => {
    scenes.push(scene);
    if (!quiet) printScene(scenes.length, TOTAL, scene);
  };

  if (!quiet) printAdminHeader(admin, "productos / servicios");

  const login = await postJson(`${baseUrl}/api/auth/login`, {
    username: admin.username,
    password: AG_PASSWORD,
  });
  const cookie = extractSessionCookie(login.setCookie);
  if (!login.ok || !cookie) {
    emit(failScene("login", "Ingreso al sistema", login));
    if (!quiet) printFooter(scenes);
    if (!skipHistory) {
      finishAdminTour("catalog", scenes, { baseUrl, started, admin });
    }
    return { admin, scenes };
  }

  const meRes = await getJson(`${baseUrl}/api/auth/me`, cookie);
  const me = (meRes.body ?? {}) as MeUser;
  const roleOk = meRes.ok && me.role === "admin";
  const localName = me.branch?.name ?? admin.branchKey;
  const branchId = me.branch?.id;

  emit({
    id: "login",
    title: "Ingreso al sistema",
    ok: roleOk,
    lines: roleOk
      ? [
          `Entró como ${c.bold}${me.name || admin.firstName}${c.reset}`,
          `Local: ${c.bold}${localName}${c.reset}${branchId ? ` · id=${branchId}` : ""}`,
        ]
      : [`Rol inesperado: ${me.role ?? "?"}`],
  });
  if (!roleOk) {
    if (!quiet) printFooter(scenes);
    if (!skipHistory) {
      finishAdminTour("catalog", scenes, { baseUrl, started, admin });
    }
    return { admin, scenes };
  }

  const stamp = `${nowStamp().replace(/[: ]/g, "").slice(-5)}_${admin.username}`;

  // Productos
  const productsRes = await getJson(`${baseUrl}/api/products`, cookie);
  const products = asArray(productsRes.body) as ProductRow[];
  emit({
    id: "products-list",
    title: `Lista productos · ${localName}`,
    ok: productsRes.ok,
    lines: productsRes.ok
      ? [`Ve ${products.length} producto(s)`]
      : [`HTTP ${productsRes.status}`],
  });

  const createProduct = await postJson(
    `${baseUrl}/api/products`,
    {
      name: `Prod ${admin.branchKey} ${stamp}`,
      price: 9.9,
      stock: 8,
    },
    cookie,
  );
  const createdProduct = (createProduct.body ?? {}) as ProductRow;
  emit({
    id: "products-create",
    title: "Crea producto",
    ok: createProduct.ok && Boolean(createdProduct.id),
    lines: createProduct.ok
      ? [
          `«${createdProduct.name}»`,
          `Precio ${money(createdProduct.price)}`,
        ]
      : [`HTTP ${createProduct.status} ${msgOf(createProduct.body)}`],
  });

  if (createProduct.ok && createdProduct.id) {
    const edit = await putJson(
      `${baseUrl}/api/products/${createdProduct.id}`,
      {
        name: `Prod ${admin.branchKey} ${stamp} · edit`,
        price: 11.5,
        stock: Number(createdProduct.stock ?? 8),
        categoryId: createdProduct.categoryId ?? null,
      },
      cookie,
    );
    const edited = (edit.body ?? {}) as ProductRow;
    emit({
      id: "products-edit",
      title: "Edita nombre y precio",
      ok:
        edit.ok &&
        String(edited.name ?? "").includes("edit") &&
        Number(edited.price) === 11.5,
      lines: edit.ok
        ? [`→ ${edited.name} · ${money(edited.price)}`]
        : [`HTTP ${edit.status}`],
    });

    const del = await deleteJson(
      `${baseUrl}/api/products/${createdProduct.id}`,
      cookie,
    );
    emit({
      id: "products-delete",
      title: "Elimina producto de prueba",
      ok: del.ok,
      lines: [del.ok ? `Eliminado id=${createdProduct.id}` : `HTTP ${del.status}`],
    });
  }

  // Servicios
  const servicesRes = await getJson(`${baseUrl}/api/services`, cookie);
  const services = asArray(servicesRes.body) as ServiceRow[];
  emit({
    id: "services-list",
    title: `Lista servicios · ${localName}`,
    ok: servicesRes.ok,
    lines: servicesRes.ok
      ? [`Ve ${services.length} servicio(s)`]
      : [`HTTP ${servicesRes.status}`],
  });

  const createService = await postJson(
    `${baseUrl}/api/services`,
    {
      name: `Serv ${admin.branchKey} ${stamp}`,
      price: 14,
      durationMinutes: 35,
      commissionPct: 30,
    },
    cookie,
  );
  const createdService = (createService.body ?? {}) as ServiceRow;
  emit({
    id: "services-create",
    title: "Crea servicio",
    ok: createService.ok && Boolean(createdService.id),
    lines: createService.ok
      ? [
          `«${createdService.name}»`,
          `Precio ${money(createdService.price)}`,
        ]
      : [`HTTP ${createService.status} ${msgOf(createService.body)}`],
  });

  if (createService.ok && createdService.id) {
    const edit = await putJson(
      `${baseUrl}/api/services/${createdService.id}`,
      {
        name: `Serv ${admin.branchKey} ${stamp} · edit`,
        price: 16.5,
        durationMinutes: Number(createdService.durationMinutes ?? 35),
        commissionPct: Number(createdService.commissionPct ?? 30),
      },
      cookie,
    );
    const edited = (edit.body ?? {}) as ServiceRow;
    emit({
      id: "services-edit",
      title: "Edita nombre y precio del servicio",
      ok:
        edit.ok &&
        String(edited.name ?? "").includes("edit") &&
        Number(edited.price) === 16.5,
      lines: edit.ok
        ? [`→ ${edited.name} · ${money(edited.price)}`]
        : [`HTTP ${edit.status}`],
    });

    const del = await deleteJson(
      `${baseUrl}/api/services/${createdService.id}`,
      cookie,
    );
    emit({
      id: "services-delete",
      title: "Elimina servicio de prueba",
      ok: del.ok,
      lines: [del.ok ? `Eliminado id=${createdService.id}` : `HTTP ${del.status}`],
    });
  }

  const logout = await postJson(`${baseUrl}/api/auth/logout`, {}, cookie);
  emit({
    id: "logout",
    title: "Cierra sesión",
    ok: logout.ok || logout.status === 200,
    lines: [`${admin.firstName} termina catálogo de «${localName}».`],
  });

  if (!quiet) printFooter(scenes);
  if (!skipHistory) {
    finishAdminTour("catalog", scenes, { baseUrl, started, admin });
  }
  return { admin, scenes };
}

export async function runAllAdminsCatalog() {
  const baseUrl = getSchedulyBaseUrl();
  console.log("");
  console.log(
    `${c.brightYellow}${c.bold}Tour Admin · catálogo TODOS (${AG_ADMINS.length}) · cada uno su local${c.reset}`,
  );
  console.log("");

  const started = Date.now();
  const results = await Promise.all(
    AG_ADMINS.map((a) =>
      runOneAdminCatalog(a, { quiet: true, skipHistory: true }),
    ),
  );
  const ms = Date.now() - started;

  for (const { admin, scenes } of results) {
    printHeader({
      name: `${admin.firstName} ${admin.firstLastName}`,
      role: "Administrador",
      business: "Andrea Guerrero Estética y Peluquería",
      place: `local ${admin.branchKey} · catálogo`,
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
      `  · ${t.name} (@${t.username}) · ${t.branchKey} · ${t.failed === 0 ? "OK" : `${t.failed} FAIL`} · ${t.passed}/${t.total}`,
    );
  }
  console.log(
    anyFail
      ? `${c.red}Hay fallos.${c.reset}`
      : `${c.green}Todos los administradores gestionaron catálogo de su local.${c.reset}`,
  );
  console.log("");

  saveTestHistory({
    tester: "admin-tour",
    mode: "catalog-all-parallel",
    baseUrl,
    durationMs: ms,
    ok: !anyFail,
    summary: { passed, failed, total: passed + failed },
    subjects,
  });
}

export async function runAdminCatalogTour(forced?: AdminSeed) {
  if (forced) {
    process.stdout.write(c.clear + c.show);
    await runOneAdminCatalog(forced, { quiet: false });
    return;
  }

  const picked = await pickAdmin({
    allowAll: true,
    title: "Catálogo · ¿qué Administrador? (uno o todos)",
  });
  if (picked.kind === "cancel") {
    console.log(`${c.dim}Cancelado.${c.reset}`);
    return;
  }
  process.stdout.write(c.clear + c.show);
  if (picked.kind === "all") {
    await runAllAdminsCatalog();
    return;
  }
  await runOneAdminCatalog(picked.admin, { quiet: false });
}
