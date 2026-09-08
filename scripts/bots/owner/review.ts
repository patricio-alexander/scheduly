/**
 * Tour Dueña · solo revisión (lectura).
 */
import {
  c,
  failScene,
  finishOwnerTour,
  getJson,
  loginAsOwner,
  logoutOwner,
  money,
  num,
  printOwnerHeader,
  printScene,
  reviewList,
  type StoryScene,
} from "./shared";

export async function runOwnerReviewTour() {
  printOwnerHeader("Loja · solo revisión");

  const auth = await loginAsOwner();
  if (!auth.ok) {
    finishOwnerTour("review-login-fail", auth.scenes, auth.baseUrl, auth.started);
    return;
  }

  const { session } = auth;
  const scenes: StoryScene[] = [...auth.scenes];
  const TOTAL = 16;
  const { baseUrl, cookie } = session;
  const ownerId = session.me.id;

  const dash = await getJson(
    `${baseUrl}/api/dashboard?userId=${ownerId ?? ""}&period=week`,
    cookie,
  );
  if (!dash.ok) {
    const scene = failScene("panel", "Panel · vista de la semana", dash);
    scenes.push(scene);
    printScene(scenes.length, TOTAL, scene);
  } else {
    const d = dash.body as Record<string, unknown>;
    const hero = (d.financeHero ?? null) as Record<string, unknown> | null;
    const revenue =
      hero && typeof hero.revenue === "number" ? hero.revenue : d.revenue;
    scenes.push({
      id: "panel",
      title: "Está en el Panel · revisando la semana",
      ok: true,
      lines: [
        `Ingresos (periodo): ${c.brightGreen}${money(revenue)}${c.reset}`,
        `Citas / actividad: ${num(d.totalAppointments)} · completadas: ${num(d.completed)}`,
        `Clientes: ${num(d.totalCustomers)} · servicios: ${num(d.totalServices)} · productos: ${num(d.totalProducts)}`,
      ],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  await reviewList(baseUrl, cookie, scenes, TOTAL, {
    id: "branches",
    title: "Revisa sucursales",
    path: "/api/branches",
    describe: (items) => {
      const names = items
        .slice(0, 4)
        .map((b) => (b as { name?: string }).name ?? "?");
      return names.length ? [`Locales: ${names.join(" · ")}`] : [];
    },
  });

  await reviewList(baseUrl, cookie, scenes, TOTAL, {
    id: "accounts",
    title: "Entra a Cuentas (equipo)",
    path: "/api/users?includeInactive=1",
    describe: (items) => {
      const rows = items as Array<{ isActive?: boolean }>;
      const active = rows.filter((r) => r.isActive !== false).length;
      return [`Activas: ${active} · total listadas: ${rows.length}`];
    },
  });

  await reviewList(baseUrl, cookie, scenes, TOTAL, {
    id: "roles",
    title: "Entra a Roles",
    path: "/api/roles",
  });
  await reviewList(baseUrl, cookie, scenes, TOTAL, {
    id: "customers",
    title: "Entra a Clientes",
    path: "/api/customers",
  });
  await reviewList(baseUrl, cookie, scenes, TOTAL, {
    id: "services",
    title: "Entra a Servicios",
    path: "/api/services",
  });
  await reviewList(baseUrl, cookie, scenes, TOTAL, {
    id: "products",
    title: "Entra a Productos / inventario",
    path: "/api/products",
  });
  await reviewList(baseUrl, cookie, scenes, TOTAL, {
    id: "appointments",
    title: "Entra a Agenda",
    path: "/api/appointments",
    emptyOk: `Agenda OK · sin citas todavía`,
  });
  await reviewList(baseUrl, cookie, scenes, TOTAL, {
    id: "pos-sales",
    title: "Revisa ventas POS",
    path: "/api/orders/pos-sales?limit=50",
    emptyOk: `Ventas POS OK · sin tickets aún`,
  });

  {
    const fin = await getJson(`${baseUrl}/api/finance/ledger-summary`, cookie);
    if (!fin.ok) {
      scenes.push(failScene("finance", "Entra a Finanzas · resumen", fin));
    } else {
      const f = fin.body as Record<string, unknown>;
      scenes.push({
        id: "finance",
        title: "Entra a Finanzas · mira el dinero",
        ok: true,
        lines: [
          `Ingresos: ${c.brightGreen}${money(f.totalIncome)}${c.reset} · egresos: ${money(f.totalExpense)}`,
          `Balance: ${c.bold}${money(f.balance)}${c.reset}`,
        ],
      });
    }
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  await reviewList(baseUrl, cookie, scenes, TOTAL, {
    id: "suppliers",
    title: "Revisa proveedores",
    path: "/api/suppliers",
  });

  {
    const settings = await getJson(`${baseUrl}/api/settings`, cookie);
    const sri = await getJson(`${baseUrl}/api/sri`, cookie);
    const s = (settings.body ?? {}) as Record<string, unknown>;
    scenes.push({
      id: "system",
      title: "Revisa Configuración y SRI (solo lectura)",
      ok: settings.ok && sri.ok,
      lines:
        settings.ok && sri.ok
          ? [
              `Negocio: ${String(s.businessName ?? s.name ?? "—")}`,
              `Colores: accent ${String(s.accentColor ?? "—")}`,
              `SRI cargó OK`,
            ]
          : [`Settings/SRI falló`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  await logoutOwner(session, scenes, TOTAL);
  finishOwnerTour("review", scenes, baseUrl, session.started);
}
