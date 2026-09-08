/**
 * Tester · Panel / widgets (solo lectura).
 *
 * Verifica las mismas rutas HTTP que llenan el home `/panel` y sus charts.
 * - HTTP error → FAIL (con mensaje)
 * - HTTP OK pero sin datos → OK + aviso VACÍO (así ves por qué el UI se ve vacío)
 *
 * Uso:
 *   npm run scripts  → Testers → Tour Dueña → Panel widgets
 *   PANEL_WIDGETS_SCRIPT=1 npx tsx scripts/bots/owner/panel-widgets.ts
 *   OWNER_TOUR_SCRIPT=panel-widgets npx tsx scripts/bots/owner-tour.ts
 *
 * Fecha foco (datos de prueba 1 sep): PANEL_FOCUS_DATE=2026-09-01 (default)
 */
import {
  asArray,
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
  type StoryScene,
} from "./shared";

const FOCUS =
  process.env.PANEL_FOCUS_DATE?.trim() || "2026-09-01";

function ymdParts(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { year: y, month: m, day: d };
}

/** Lunes–domingo de la semana que contiene `ymd` (hora local). */
function weekRangeOf(ymd: string) {
  const { year, month, day } = ymdParts(ymd);
  const ref = new Date(year, month - 1, day);
  const dow = (ref.getDay() + 6) % 7; // lun=0
  const start = new Date(year, month - 1, day - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  return { startDate: fmt(start), endDate: fmt(end) };
}

function push(
  scenes: StoryScene[],
  total: number,
  scene: StoryScene,
) {
  scenes.push(scene);
  printScene(scenes.length, total, scene);
}

function emptyTag(filled: boolean) {
  return filled
    ? `${c.green}CON DATOS${c.reset}`
    : `${c.yellow}VACÍO${c.reset}`;
}

export async function runOwnerPanelWidgetsTour() {
  printOwnerHeader(`Panel widgets · foco ${FOCUS}`);

  const auth = await loginAsOwner();
  if (!auth.ok) {
    finishOwnerTour("panel-widgets-login-fail", auth.scenes, auth.baseUrl, auth.started);
    return;
  }

  const { session } = auth;
  const scenes: StoryScene[] = [...auth.scenes];
  const TOTAL = 22;
  const { baseUrl, cookie } = session;
  const ownerId = session.me.id;
  const { year, month } = ymdParts(FOCUS);
  const week = weekRangeOf(FOCUS);

  console.log(
    `${c.dim}Solo lectura · mismas rutas que alimentan /panel y charts financieros${c.reset}`,
  );
  console.log(
    `${c.dim}Si ves VACÍO: la ruta responde OK pero no hay movimientos en ese periodo.${c.reset}`,
  );
  console.log("");

  // ── 1) Dashboard (KPIs / hero / stock / top / agenda reciente) ──
  for (const period of ["today", "week", "month", "all"] as const) {
    const dash = await getJson(
      `${baseUrl}/api/dashboard?userId=${ownerId ?? ""}&period=${period}`,
      cookie,
    );
    if (!dash.ok) {
      push(scenes, TOTAL, failScene(`dash-${period}`, `Panel · GET /api/dashboard?period=${period}`, dash));
      continue;
    }
    const d = dash.body as Record<string, unknown>;
    const hero = (d.financeHero ?? null) as Record<string, unknown> | null;
    const revenue =
      hero && typeof hero.revenue === "number" ? hero.revenue : d.revenue;
    const stockAlerts = asArray(d.stockAlerts);
    const topEmployees = asArray(d.topEmployees);
    const recent = asArray(d.recentAppointments);
    const payments = asArray(d.paymentBreakdown);
    const overview = asArray(d.appointmentStatusOverview);
    const hasCore =
      num(d.totalAppointments) > 0 ||
      num(revenue) > 0 ||
      recent.length > 0 ||
      topEmployees.length > 0;

    push(scenes, TOTAL, {
      id: `dash-${period}`,
      title: `Panel · dashboard (${period})`,
      ok: true,
      lines: [
        `GET /api/dashboard?userId=&period=${period} · ${emptyTag(hasCore)}`,
        `Ingresos: ${money(revenue)} · citas: ${num(d.totalAppointments)} · completadas: ${num(d.completed)}`,
        `Hero: ${hero ? "sí" : "no"} · stockAlerts: ${stockAlerts.length} · top empleados: ${topEmployees.length}`,
        `Agenda reciente: ${recent.length} · métodos pago: ${payments.length} · estados: ${overview.length}`,
        d.ownerInsights
          ? `ownerInsights: presente (API; panel UI puede no montarlo)`
          : `ownerInsights: ausente`,
      ],
    });
  }

  // ── 2) Sucursales (filtro del panel) ───────────────────────────
  {
    const res = await getJson(`${baseUrl}/api/branches`, cookie);
    if (!res.ok) {
      push(scenes, TOTAL, failScene("branches", "Panel · GET /api/branches", res));
    } else {
      const items = asArray(res.body);
      push(scenes, TOTAL, {
        id: "branches",
        title: "Panel · sucursales (filtro)",
        ok: true,
        lines: [
          `GET /api/branches · ${emptyTag(items.length > 0)} · ${items.length} local(es)`,
          ...items.slice(0, 4).map((b) => {
            const row = b as { id?: number; name?: string };
            return `· #${row.id} ${row.name ?? "?"}`;
          }),
        ],
      });
    }
  }

  // ── 3) Charts financieros (mismas query que los componentes) ──
  {
    const path = `/api/finance/calendar-year?year=${year}`;
    const res = await getJson(`${baseUrl}${path}`, cookie);
    if (!res.ok) {
      push(scenes, TOTAL, failScene("cal-year", `Chart año · ${path}`, res));
    } else {
      const body = res.body as Record<string, unknown>;
      const monthsObj =
        body.months && typeof body.months === "object" && !Array.isArray(body.months)
          ? (body.months as Record<string, { incomeAmount?: number }>)
          : {};
      const monthKeys = Object.keys(monthsObj);
      const monthsWithMoney = monthKeys.filter(
        (k) => Number(monthsObj[k]?.incomeAmount ?? 0) > 0,
      );
      const totals = (body.totals ?? null) as Record<string, unknown> | null;
      const income = Number(totals?.incomeAmount ?? totals?.income ?? 0);
      push(scenes, TOTAL, {
        id: "cal-year",
        title: "Chart · calendar-year",
        ok: true,
        lines: [
          `GET ${path} · ${emptyTag(income > 0 || monthsWithMoney.length > 0)}`,
          `Meses con ingreso: ${monthsWithMoney.length}/${monthKeys.length || 12} · ingreso anual: ${money(income)}`,
        ],
      });
    }
  }

  {
    const path = `/api/finance/calendar-month?year=${year}&month=${month}`;
    const res = await getJson(`${baseUrl}${path}`, cookie);
    if (!res.ok) {
      push(scenes, TOTAL, failScene("cal-month", `Chart mes · ${path}`, res));
    } else {
      const body = res.body as Record<string, unknown>;
      const daysObj =
        body.days && typeof body.days === "object" && !Array.isArray(body.days)
          ? (body.days as Record<string, { incomeAmount?: number }>)
          : {};
      const dayKeys = Object.keys(daysObj);
      const daysWithMoney = dayKeys.filter(
        (k) => Number(daysObj[k]?.incomeAmount ?? 0) > 0,
      );
      const totals = (body.totals ?? null) as Record<string, unknown> | null;
      const income = Number(totals?.incomeAmount ?? totals?.income ?? 0);
      push(scenes, TOTAL, {
        id: "cal-month",
        title: "Chart · calendar-month",
        ok: true,
        lines: [
          `GET ${path} · ${emptyTag(income > 0 || daysWithMoney.length > 0)}`,
          `Días con ingreso: ${daysWithMoney.length}/${dayKeys.length} · ingreso mes: ${money(income)}`,
        ],
      });
    }
  }

  {
    const path = `/api/finance/calendar-day?date=${FOCUS}`;
    const res = await getJson(`${baseUrl}${path}`, cookie);
    if (!res.ok) {
      push(scenes, TOTAL, failScene("cal-day", `Detalle día · ${path}`, res));
    } else {
      const body = res.body as Record<string, unknown>;
      const incomes = asArray(body.incomes);
      const income = Number(
        (body.totals as Record<string, unknown> | undefined)?.income ??
          (body.totals as Record<string, unknown> | undefined)?.incomeAmount ??
          0,
      );
      push(scenes, TOTAL, {
        id: "cal-day",
        title: "Modal · calendar-day",
        ok: true,
        lines: [
          `GET ${path} · ${emptyTag(incomes.length > 0 || income > 0)}`,
          `Líneas ingreso: ${incomes.length} · ingreso día: ${money(income)}`,
        ],
      });
    }
  }

  {
    const path =
      `/api/finance/cash-flow-candles?granularity=day&limit=18&offset=0`;
    const res = await getJson(`${baseUrl}${path}`, cookie);
    if (!res.ok) {
      push(scenes, TOTAL, failScene("candles", `Velas · ${path}`, res));
    } else {
      const body = res.body as Record<string, unknown>;
      const candles = asArray(body.candles) as Array<{
        open?: number;
        close?: number;
        high?: number;
        low?: number;
      }>;
      const withActivity = candles.filter((cndl) => {
        const o = Number(cndl.open ?? 0);
        const cl = Number(cndl.close ?? 0);
        const h = Number(cndl.high ?? 0);
        const l = Number(cndl.low ?? 0);
        return o !== cl || h !== l || o !== 0;
      });
      push(scenes, TOTAL, {
        id: "candles",
        title: "Chart · cash-flow-candles",
        ok: true,
        lines: [
          `GET ${path} · ${emptyTag(candles.length > 0 && withActivity.length > 0)}`,
          `Velas: ${candles.length} · con movimiento: ${withActivity.length}`,
        ],
      });
    }
  }

  {
    const path =
      `/api/finance/cash-flow-mirror?granularity=day&startDate=${week.startDate}&endDate=${week.endDate}`;
    const res = await getJson(`${baseUrl}${path}`, cookie);
    if (!res.ok) {
      push(scenes, TOTAL, failScene("mirror", `Mirror · ${path}`, res));
    } else {
      const body = res.body as Record<string, unknown>;
      const buckets = asArray(body.buckets ?? body.days ?? body.items) as Array<{
        income?: number;
        expenseTotal?: number;
        netBalance?: number;
      }>;
      const withMoney = buckets.filter(
        (b) =>
          Number(b.income ?? 0) > 0 ||
          Number(b.expenseTotal ?? 0) > 0 ||
          Number(b.netBalance ?? 0) !== 0,
      );
      push(scenes, TOTAL, {
        id: "mirror",
        title: "Chart · cash-flow-mirror",
        ok: true,
        lines: [
          `GET ${path}`,
          `${emptyTag(withMoney.length > 0)} · buckets: ${buckets.length} · con $: ${withMoney.length} · ${week.startDate}→${week.endDate}`,
        ],
      });
    }
  }

  {
    const path =
      `/api/finance/product-series?period=month&sortBy=amount&band=0&kind=all`;
    const res = await getJson(`${baseUrl}${path}`, cookie);
    if (!res.ok) {
      push(scenes, TOTAL, failScene("product-series", `Series · ${path}`, res));
    } else {
      const body = res.body as Record<string, unknown>;
      const sales = (body.sales ?? null) as Record<string, unknown> | null;
      const products = asArray(sales?.products);
      const services = asArray(sales?.services);
      push(scenes, TOTAL, {
        id: "product-series",
        title: "Chart · product-series",
        ok: true,
        lines: [
          `GET ${path} · ${emptyTag(products.length + services.length > 0)}`,
          `Productos: ${products.length} · servicios: ${services.length}`,
        ],
      });
    }
  }

  {
    const path = `/api/finance/customers-summary`;
    const res = await getJson(`${baseUrl}${path}`, cookie);
    if (!res.ok) {
      push(scenes, TOTAL, failScene("customers-summary", `Clientes · ${path}`, res));
    } else {
      const items = asArray(
        (res.body as Record<string, unknown>)?.customers ??
          (res.body as Record<string, unknown>)?.items ??
          res.body,
      );
      push(scenes, TOTAL, {
        id: "customers-summary",
        title: "Tabla · customers-summary",
        ok: true,
        lines: [
          `GET ${path} · ${emptyTag(items.length > 0)} · filas: ${items.length}`,
        ],
      });
    }
  }

  {
    const path = `/api/finance/ledger-summary`;
    const res = await getJson(`${baseUrl}${path}`, cookie);
    if (!res.ok) {
      push(scenes, TOTAL, failScene("ledger", `Finanzas · ${path}`, res));
    } else {
      const body = res.body as Record<string, unknown>;
      push(scenes, TOTAL, {
        id: "ledger",
        title: "Finanzas · ledger-summary",
        ok: true,
        lines: [
          `GET ${path} · ${emptyTag(true)}`,
          `Keys: ${Object.keys(body).slice(0, 8).join(", ") || "(vacío)"}`,
        ],
      });
    }
  }

  // ── 4) Notificaciones (badge header) ──────────────────────────
  {
    const personKey = session.me.personId ?? session.me.id ?? "";
    const path = `/api/notifications?userId=${personKey}`;
    const res = await getJson(`${baseUrl}${path}`, cookie);
    if (!res.ok) {
      push(scenes, TOTAL, failScene("notifications", `Header · ${path}`, res));
    } else {
      const items = asArray(res.body);
      push(scenes, TOTAL, {
        id: "notifications",
        title: "Header · notificaciones",
        ok: true,
        lines: [
          `GET ${path} · ${emptyTag(items.length > 0)} · ${items.length} aviso(s)`,
        ],
      });
    }
  }

  // ── 5) Supervisión caja (reporte del día foco) ────────────────
  {
    const path = `/api/shifts/reports/daily?date=${FOCUS}`;
    const res = await getJson(`${baseUrl}${path}`, cookie);
    if (!res.ok) {
      push(scenes, TOTAL, failScene("daily-report", `Cajas · ${path}`, res));
    } else {
      const body = res.body as Record<string, unknown>;
      const shifts = asArray(body.shifts ?? body.items ?? body.rows);
      push(scenes, TOTAL, {
        id: "daily-report",
        title: "Supervisión · reporte diario",
        ok: true,
        lines: [
          `GET ${path} · ${emptyTag(shifts.length > 0 || Object.keys(body).length > 0)}`,
          `Turnos/filas: ${shifts.length}`,
        ],
      });
    }
  }

  await logoutOwner(session, scenes, TOTAL);
  finishOwnerTour("panel-widgets", scenes, baseUrl, session.started);
}

const isDirect =
  typeof process.argv[1] === "string" &&
  (process.argv[1].replace(/\\/g, "/").endsWith("/scripts/bots/owner/panel-widgets.ts") ||
    process.env.PANEL_WIDGETS_SCRIPT?.trim() === "1");

if (isDirect) {
  runOwnerPanelWidgetsTour().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
