/**
 * Simulación operativa general (no por rol suelto).
 *
 * Fechas forzadas:
 *  - 31 ago 2026: empleados agendan citas para el 1 sep
 *  - 1 sep 2026: abrir cajas → ejecutar/cobrar → POS → cerrar → supervisión
 *
 * Modo caja de este test: employee_own (cada empleado su caja).
 * La dueña configura el modo (también existe branch_shared).
 *
 * Uso:
 *   DAY_SIM_SCRIPT=1 npx tsx scripts/bots/day-simulation.ts
 *   o menú Testers → Simulación día 1 sep
 *
 * Nota: pensado para que lo corras tú y veas FAIL/OK en consola.
 */
import "dotenv/config";
import {
  AG_ADMINS,
  AG_EMPLOYEES,
  AG_OWNER,
  AG_PASSWORD,
} from "../lib/andrea-guerrero-demo";
import {
  asArray,
  msgOf,
  printFooter,
  printHeader,
  printScene,
  type StoryScene,
} from "../lib/bot-story";
import { c } from "../lib/menu-ui";
import {
  extractSessionCookie,
  getJson,
  getSchedulyBaseUrl,
  postJson,
  putJson,
} from "../lib/http";
import { saveTestHistory, scenesForHistory, summarizeScenes } from "../lib/test-history";
import { withBranchKey } from "./employee/shared";
import { prisma } from "../../shared/utils/prisma";

const OPS_DAY = "2026-09-01";
const BOOK_DAY_LABEL = "2026-08-31";
const OPEN_AT = `${OPS_DAY}T08:00:00.000`;
const CLOSE_AT = `${OPS_DAY}T19:00:00.000`;
const OPENING_CASH = 50;
/** Stock por sucursal para que citas+POS no fallen en corridas repetidas. */
const DEMO_BRANCH_STOCK = 80;

async function ensureDemoBranchStock() {
  const branches = await prisma.branch.findMany({ select: { id: true } });
  const products = await prisma.product.findMany({ select: { id: true } });
  for (const branch of branches) {
    for (const product of products) {
      await prisma.branchStock.upsert({
        where: {
          storeId_productId: {
            storeId: branch.id,
            productId: product.id,
          },
        },
        create: {
          storeId: branch.id,
          productId: product.id,
          quantity: DEMO_BRANCH_STOCK,
        },
        update: { quantity: DEMO_BRANCH_STOCK },
      });
    }
  }
  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: { stock: DEMO_BRANCH_STOCK * Math.max(branches.length, 1) },
    });
  }
  return {
    branches: branches.length,
    products: products.length,
  };
}

type MeUser = {
  id?: number;
  personId?: number;
  name?: string;
  role?: string;
  branch?: { id?: number; name?: string } | null;
};

function localIso(dateYmd: string, hour: number, minute = 0) {
  const d = new Date(
    Number(dateYmd.slice(0, 4)),
    Number(dateYmd.slice(5, 7)) - 1,
    Number(dateYmd.slice(8, 10)),
    hour,
    minute,
    0,
    0,
  );
  return d.toISOString();
}

async function login(username: string) {
  const baseUrl = getSchedulyBaseUrl();
  const login = await postJson(`${baseUrl}/api/auth/login`, {
    username,
    password:
      username === AG_OWNER.username ? AG_OWNER.password : AG_PASSWORD,
  });
  const cookie = extractSessionCookie(login.setCookie);
  if (!login.ok || !cookie) {
    return { ok: false as const, baseUrl, cookie: null, me: null as MeUser | null };
  }
  const meRes = await getJson(`${baseUrl}/api/auth/me`, cookie);
  return {
    ok: meRes.ok,
    baseUrl,
    cookie,
    me: (meRes.body ?? {}) as MeUser,
  };
}

async function logout(baseUrl: string, cookie: string) {
  await postJson(`${baseUrl}/api/auth/logout`, {}, cookie);
}

function push(
  scenes: StoryScene[],
  scene: StoryScene,
  quiet: boolean,
) {
  scenes.push(scene);
  if (!quiet) printScene(scenes.length, 20, scene);
}

export async function runDaySimulation() {
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const scenes: StoryScene[] = [];
  const quiet = false;
  const employees = AG_EMPLOYEES.map(withBranchKey);

  console.log("");
  console.log(
    `${c.brightMagenta}${c.bold}Simulación día operativo · ${BOOK_DAY_LABEL} agenda → ${OPS_DAY} caja/cobros${c.reset}`,
  );
  console.log(`${c.dim}URL: ${baseUrl}${c.reset}`);
  console.log("");

  printHeader({
    name: "Simulación general",
    role: "Flujo completo",
    business: "Andrea Guerrero Estética y Peluquería",
    place: `${OPS_DAY} · caja propia por empleado`,
  });

  // ── 0) Dueña: horario + modo caja ─────────────────────────────
  {
    const auth = await login(AG_OWNER.username);
    if (!auth.ok || !auth.cookie) {
      push(scenes, {
        id: "owner-login",
        title: "Dueña ingresa",
        ok: false,
        lines: ["No pudo entrar"],
      }, quiet);
      finish(scenes, baseUrl, started);
      return;
    }
    push(scenes, {
      id: "owner-login",
      title: "Dueña ingresa",
      ok: true,
      lines: [`${auth.me?.name ?? "Andrea"} · configura el día`],
    }, quiet);

    try {
      const stocked = await ensureDemoBranchStock();
      push(scenes, {
        id: "prep-stock",
        title: "Prep · stock por sucursal",
        ok: true,
        lines: [
          `${stocked.products} productos × ${stocked.branches} locales = ${DEMO_BRANCH_STOCK} uds`,
        ],
      }, quiet);
    } catch (err) {
      push(scenes, {
        id: "prep-stock",
        title: "Prep · stock por sucursal",
        ok: false,
        lines: [err instanceof Error ? err.message : "Error al reponer stock"],
      }, quiet);
    }

    const cur = await getJson(`${baseUrl}/api/settings`, auth.cookie);
    const body = (cur.body ?? {}) as Record<string, unknown>;
    const put = await putJson(
      `${baseUrl}/api/settings`,
      {
        businessName: body.businessName,
        address: body.address ?? "",
        bookingStartHour: 10,
        bookingEndHour: 18,
        cashRegisterMode: "employee_own",
      },
      auth.cookie,
    );
    const after = (put.body ?? {}) as {
      bookingStartHour?: number;
      bookingEndHour?: number;
      cashRegisterMode?: string;
    };
    push(scenes, {
      id: "owner-config",
      title: "Dueña configura horario + modo caja",
      ok:
        put.ok &&
        after.bookingStartHour === 10 &&
        after.bookingEndHour === 18 &&
        after.cashRegisterMode === "employee_own",
      lines: put.ok
        ? [
            `Agenda: ${after.bookingStartHour}:00–${after.bookingEndHour}:00`,
            `Caja: ${after.cashRegisterMode} (cada empleado su turno)`,
          ]
        : [`HTTP ${put.status} ${msgOf(put.body)}`],
    }, quiet);
    await logout(baseUrl, auth.cookie);
  }

  // ── 1) 31 ago: cada empleado agenda 1 cita para el 1 sep ──────
  const booked: Array<{
    username: string;
    appointmentId: number;
    hour: number;
  }> = [];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const auth = await login(emp.username);
    if (!auth.ok || !auth.cookie || !auth.me?.personId) {
      push(scenes, {
        id: `book-${emp.username}`,
        title: `Agenda previa · ${emp.firstName}`,
        ok: false,
        lines: ["Login falló"],
      }, quiet);
      continue;
    }

    const [customersRes, servicesRes, productsRes] = await Promise.all([
      getJson(`${baseUrl}/api/customers`, auth.cookie),
      getJson(`${baseUrl}/api/services`, auth.cookie),
      getJson(`${baseUrl}/api/products`, auth.cookie),
    ]);
    const customers = asArray(customersRes.body) as Array<{ id?: number; name?: string }>;
    const services = asArray(servicesRes.body) as Array<{ id?: number; name?: string }>;
    const products = asArray(productsRes.body) as Array<{
      id?: number;
      stock?: number;
    }>;
    const hour = 10 + (i % 7);
    const customer = customers[i % Math.max(customers.length, 1)];
    const service = services[i % Math.max(services.length, 1)];
    const withStock = products.filter((p) => Number(p.stock ?? 0) > 0);
    const productPool = withStock.length > 0 ? withStock : products;
    const product = productPool[i % Math.max(productPool.length, 1)];

    const create = await postJson(
      `${baseUrl}/api/appointments`,
      {
        title: `Cita ${OPS_DAY} · ${emp.firstName}`,
        description: `Agendada el ${BOOK_DAY_LABEL} (simulación)`,
        customerId: customer?.id,
        userId: auth.me.personId,
        branchId: auth.me.branch?.id ?? null,
        appointmentDate: localIso(OPS_DAY, hour, 0),
        status: "scheduled",
        serviceIds: service?.id ? [service.id] : [],
        products: product?.id ? [{ productId: product.id, quantity: 1 }] : [],
      },
      auth.cookie,
    );
    const apt = (create.body ?? {}) as { id?: number };
    if (create.ok && apt.id) {
      booked.push({ username: emp.username, appointmentId: apt.id, hour });
    }
    push(scenes, {
      id: `book-${emp.username}`,
      title: `31 ago · ${emp.firstName} agenda para el 1 sep`,
      ok: create.ok && Boolean(apt.id),
      lines: create.ok
        ? [
            `${hour}:00 · ${customer?.name ?? "cliente"} · ${service?.name ?? "servicio"}`,
            `id=${apt.id} · ${auth.me.branch?.name ?? emp.branchKey}`,
          ]
        : [`HTTP ${create.status} ${msgOf(create.body)}`],
    }, quiet);
    await logout(baseUrl, auth.cookie);
  }

  // ── 2) 1 sep AM: admins abren caja ────────────────────────────
  const adminShifts: Array<{ username: string; shiftId: number }> = [];
  for (const admin of AG_ADMINS) {
    const auth = await login(admin.username);
    if (!auth.ok || !auth.cookie) {
      push(scenes, {
        id: `admin-open-${admin.username}`,
        title: `Admin abre caja · ${admin.firstName}`,
        ok: false,
        lines: ["Login falló"],
      }, quiet);
      continue;
    }
    const open = await postJson(
      `${baseUrl}/api/shifts/open`,
      {
        cashTotal: OPENING_CASH,
        storeId: auth.me?.branch?.id,
        openedAt: OPEN_AT,
        notes: `Apertura simulación ${OPS_DAY}`,
      },
      auth.cookie,
    );
    let shift = (open.body ?? {}) as { id?: number };
    if (!open.ok && String(msgOf(open.body)).includes("Ya tienes")) {
      const active = await getJson(`${baseUrl}/api/shifts/active`, auth.cookie);
      shift = (active.body ?? {}) as { id?: number };
    }
    if ((open.ok || shift.id) && shift.id) {
      adminShifts.push({ username: admin.username, shiftId: shift.id });
    }
    push(scenes, {
      id: `admin-open-${admin.username}`,
      title: `1 sep · Admin ${admin.firstName} abre caja`,
      ok: Boolean(shift.id),
      lines: shift.id
        ? [
            `Turno #${shift.id} · fondo $${OPENING_CASH}`,
            `Local: ${auth.me?.branch?.name ?? admin.branchKey}`,
            open.ok ? "Abierto ahora" : "Ya estaba abierto (reutilizado)",
          ]
        : [`HTTP ${open.status} ${msgOf(open.body)}`],
    }, quiet);
    // keep session for later close — logout and re-login at close
    await logout(baseUrl, auth.cookie);
  }

  // ── 3) Empleados abren su caja ────────────────────────────────
  const empShifts: Array<{ username: string; shiftId: number; cookie?: string }> =
    [];
  for (const emp of employees) {
    const auth = await login(emp.username);
    if (!auth.ok || !auth.cookie) {
      push(scenes, {
        id: `emp-open-${emp.username}`,
        title: `Empleado abre caja · ${emp.firstName}`,
        ok: false,
        lines: ["Login falló"],
      }, quiet);
      continue;
    }
    const open = await postJson(
      `${baseUrl}/api/shifts/open`,
      {
        cashTotal: OPENING_CASH,
        storeId: auth.me?.branch?.id,
        openedAt: `${OPS_DAY}T08:30:00.000`,
        notes: `Caja propia ${emp.firstName} · ${OPS_DAY}`,
      },
      auth.cookie,
    );
    let shift = (open.body ?? {}) as { id?: number };
    if (!open.ok && String(msgOf(open.body)).includes("Ya tienes")) {
      const active = await getJson(`${baseUrl}/api/shifts/active`, auth.cookie);
      shift = (active.body ?? {}) as { id?: number };
    }
    if (shift.id) {
      empShifts.push({ username: emp.username, shiftId: shift.id });
    }
    push(scenes, {
      id: `emp-open-${emp.username}`,
      title: `1 sep · ${emp.firstName} abre su caja`,
      ok: Boolean(shift.id),
      lines: shift.id
        ? [
            `Turno #${shift.id} · fondo $${OPENING_CASH}`,
            open.ok ? "Abierto ahora" : "Ya estaba abierto (reutilizado)",
          ]
        : [`HTTP ${open.status} ${msgOf(open.body)}`],
    }, quiet);
    await logout(baseUrl, auth.cookie);
  }

  // ── 4) Ejecutar citas propias + venta POS ─────────────────────
  for (let empIdx = 0; empIdx < employees.length; empIdx++) {
    const emp = employees[empIdx];
    const auth = await login(emp.username);
    if (!auth.ok || !auth.cookie) continue;

    const mine = booked.filter((b) => b.username === emp.username);
    let paid = 0;
    const payErrors: string[] = [];
    for (const b of mine) {
      const pay = await postJson(
        `${baseUrl}/api/appointments/${b.appointmentId}/payment`,
        {
          method: "cash",
          notes: `Cobro simulación ${OPS_DAY}`,
          paidAt: localIso(OPS_DAY, Math.min(b.hour + 1, 17), 0),
        },
        auth.cookie,
      );
      if (pay.ok) paid += 1;
      else payErrors.push(`cita ${b.appointmentId}: HTTP ${pay.status} ${msgOf(pay.body)}`);
    }

    const productsRes = await getJson(`${baseUrl}/api/products`, auth.cookie);
    const products = asArray(productsRes.body) as Array<{
      id?: number;
      price?: number;
      name?: string;
      stock?: number;
    }>;
    const withStock = products.filter((p) => Number(p.stock ?? 0) > 0);
    const product =
      withStock[empIdx % Math.max(withStock.length, 1)] ??
      products[empIdx % Math.max(products.length, 1)];
    let posOk = false;
    let posErr = "";
    if (product?.id) {
      const sale = await postJson(
        `${baseUrl}/api/product-sales`,
        {
          method: "cash",
          branchId: auth.me?.branch?.id,
          paidAt: `${OPS_DAY}T12:00:00.000`,
          lines: [
            {
              productId: product.id,
              quantity: 1,
              unitPrice: Number(product.price ?? 5),
            },
          ],
          notes: `POS simulación ${OPS_DAY}`,
        },
        auth.cookie,
      );
      posOk = sale.ok;
      if (!sale.ok) posErr = `HTTP ${sale.status} ${msgOf(sale.body)}`;
    }

    push(scenes, {
      id: `run-${emp.username}`,
      title: `1 sep · ${emp.firstName} cobra citas + POS`,
      ok: paid === mine.length && (posOk || !product?.id),
      lines: [
        `Citas cobradas: ${paid}/${mine.length}`,
        ...payErrors.slice(0, 2),
        posOk
          ? `Venta POS: ${product?.name ?? "producto"}`
          : `POS: ${posErr || (product ? "falló" : "sin productos")}`,
      ],
    }, quiet);
    await logout(baseUrl, auth.cookie);
  }

  // ── 5) Empleados cierran caja ─────────────────────────────────
  for (const row of empShifts) {
    const auth = await login(row.username);
    if (!auth.ok || !auth.cookie) continue;
    const active = await getJson(`${baseUrl}/api/shifts/active`, auth.cookie);
    const shift = (active.body ?? {}) as {
      id?: number;
      expectedCashTotal?: number;
      openingCashTotal?: number;
    };
    const closeTotal =
      shift.expectedCashTotal ??
      Number(shift.openingCashTotal ?? OPENING_CASH);
    const close = await postJson(
      `${baseUrl}/api/shifts/${shift.id ?? row.shiftId}/close`,
      {
        cashTotal: closeTotal,
        closedAt: CLOSE_AT,
        notes: `Cierre simulación ${OPS_DAY}`,
      },
      auth.cookie,
    );
    const body = (close.body ?? {}) as {
      cashDifference?: number;
      expectedCashTotal?: number;
    };
    push(scenes, {
      id: `emp-close-${row.username}`,
      title: `Cierre caja empleado · ${row.username}`,
      ok: close.ok,
      lines: close.ok
        ? [
            `Esperado $${body.expectedCashTotal ?? closeTotal}`,
            `Diferencia $${body.cashDifference ?? 0}`,
          ]
        : [`HTTP ${close.status} ${msgOf(close.body)}`],
    }, quiet);
    await logout(baseUrl, auth.cookie);
  }

  // ── 6) Admins revisan reporte y cierran ───────────────────────
  for (const row of adminShifts) {
    const auth = await login(row.username);
    if (!auth.ok || !auth.cookie) continue;
    const report = await getJson(
      `${baseUrl}/api/shifts/reports/daily?date=${OPS_DAY}`,
      auth.cookie,
    );
    const active = await getJson(`${baseUrl}/api/shifts/active`, auth.cookie);
    const shift = (active.body ?? {}) as {
      id?: number;
      expectedCashTotal?: number;
      openingCashTotal?: number;
    };
    const closeTotal =
      shift.expectedCashTotal ??
      Number(shift.openingCashTotal ?? OPENING_CASH);
    const close = shift.id
      ? await postJson(
          `${baseUrl}/api/shifts/${shift.id}/close`,
          {
            cashTotal: closeTotal,
            closedAt: CLOSE_AT,
            notes: `Cierre admin simulación ${OPS_DAY}`,
          },
          auth.cookie,
        )
      : { ok: true, status: 200, body: { skipped: true } };

    push(scenes, {
      id: `admin-close-${row.username}`,
      title: `Admin revisa ingresos y cierra · ${row.username}`,
      ok: report.ok && close.ok,
      lines: [
        report.ok ? `Reporte diario ${OPS_DAY} OK` : `Reporte FAIL`,
        close.ok ? `Caja admin cerrada` : `Cierre FAIL ${msgOf(close.body)}`,
      ],
    }, quiet);
    await logout(baseUrl, auth.cookie);
  }

  // ── 7) Dueña supervisión todas las sucursales ─────────────────
  {
    const auth = await login(AG_OWNER.username);
    if (auth.ok && auth.cookie) {
      const report = await getJson(
        `${baseUrl}/api/shifts/reports/daily?date=${OPS_DAY}`,
        auth.cookie,
      );
      const agenda = await getJson(
        `${baseUrl}/api/appointments`,
        auth.cookie,
      );
      const events = asArray(
        agenda.ok && agenda.body && typeof agenda.body === "object"
          ? (agenda.body as { events?: unknown }).events ?? agenda.body
          : agenda.body,
      );
      push(scenes, {
        id: "owner-supervise",
        title: "Dueña supervisa cajas de todas las sucursales",
        ok: report.ok && agenda.ok,
        lines: report.ok
          ? [
              `Reporte diario ${OPS_DAY} cargado`,
              `Eventos en agenda general: ${events.length}`,
              `${c.green}Supervisión OK (solo lectura)${c.reset}`,
            ]
          : [`HTTP reporte ${report.status}`],
      }, quiet);
      await logout(baseUrl, auth.cookie);
    }
  }

  finish(scenes, baseUrl, started);
}

function finish(scenes: StoryScene[], baseUrl: string, started: number) {
  printFooter(scenes);
  const sum = summarizeScenes(scenes);
  console.log("");
  console.log(
    sum.ok
      ? `${c.green}Simulación del ${OPS_DAY} completada.${c.reset}`
      : `${c.red}Simulación con fallos (${sum.failed}/${sum.total}).${c.reset}`,
  );
  console.log("");
  saveTestHistory({
    tester: "day-simulation",
    mode: "september-1-2026",
    baseUrl,
    durationMs: Date.now() - started,
    ok: sum.ok,
    summary: sum,
    scenes: scenesForHistory(scenes),
    meta: {
      bookDay: BOOK_DAY_LABEL,
      opsDay: OPS_DAY,
      cashRegisterMode: "employee_own",
    },
  });
  void prisma.$disconnect();
}

const isDirect =
  typeof process.argv[1] === "string" &&
  process.argv[1]
    .replace(/\\/g, "/")
    .endsWith("/scripts/bots/day-simulation.ts");

if (isDirect || process.env.DAY_SIM_SCRIPT === "1") {
  runDaySimulation().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
