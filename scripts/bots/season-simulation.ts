/**
 * Simulación operativa · hoy−7 → hoy (todos los días del rango).
 *
 * Cada día:
 *  - empleados agendan 1 cita (fecha forzada), abren caja, cobran, POS, cierran
 *    → Income (Finanzas) + salidas kardex (venta/cita)
 *  - dueña compra a proveedores (recibido+pagado) varios días
 *    → Expense (Finanzas) + entradas kardex
 *  - mid-semana: traspaso entre locales + ajuste de inventario
 *
 * Prerrequisito recomendado: reset operativo (sin ingresos).
 *
 * Uso:
 *   SEASON_SIM_SCRIPT=1 npx tsx scripts/bots/season-simulation.ts
 *   o menú Testers → Simulación última semana
 *
 * Env opcionales:
 *   SEASON_START=YYYY-MM-DD  SEASON_END=YYYY-MM-DD
 *   SEASON_VERBOSE=1
 */
import "dotenv/config";
import {
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
import { runOwnerSuppliersPurchasesTour } from "./owner/suppliers-purchases";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultEndYmd() {
  return ymd(new Date());
}

function defaultStartYmd() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return ymd(d);
}

const SEASON_START = process.env.SEASON_START?.trim() || defaultStartYmd();
const SEASON_END = process.env.SEASON_END?.trim() || defaultEndYmd();
const OPENING_CASH = 50;
const DEMO_BRANCH_STOCK = 80;
const VERBOSE = process.env.SEASON_VERBOSE?.trim() === "1";

type MeUser = {
  id?: number;
  personId?: number;
  name?: string;
  role?: string;
  branch?: { id?: number; name?: string } | null;
};

function parseYmd(s: string) {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day, 12, 0, 0, 0);
}

/** Todos los días inclusive entre start y end (ymd). */
function daysInRange(startYmd: string, endYmd: string) {
  const out: string[] = [];
  const cur = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  while (cur <= end) {
    out.push(ymd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

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

async function login(username: string, password = AG_PASSWORD) {
  const baseUrl = getSchedulyBaseUrl();
  const loginRes = await postJson(`${baseUrl}/api/auth/login`, {
    username,
    password: username === AG_OWNER.username ? AG_OWNER.password : password,
  });
  const cookie = extractSessionCookie(loginRes.setCookie);
  if (!loginRes.ok || !cookie) {
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

async function ensureDemoBranchStock() {
  const branches = await prisma.branch.findMany({ select: { id: true } });
  const products = await prisma.product.findMany({ select: { id: true } });
  for (const branch of branches) {
    for (const product of products) {
      await prisma.branchStock.upsert({
        where: {
          storeId_productId: { storeId: branch.id, productId: product.id },
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
}

function push(scenes: StoryScene[], scene: StoryScene, force = false) {
  scenes.push(scene);
  if (VERBOSE || force) printScene(scenes.length, 20, scene);
}

export async function runSeasonSimulation() {
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const scenes: StoryScene[] = [];
  const employees = AG_EMPLOYEES.map(withBranchKey);
  const days = daysInRange(SEASON_START, SEASON_END);

  console.log("");
  console.log(
    `${c.brightMagenta}${c.bold}Simulación última semana · ${SEASON_START} → ${SEASON_END}${c.reset}`,
  );
  console.log(
    `${c.dim}${days.length} días · ${employees.length} empleados · caja propia · ingresos+gastos+kardex${c.reset}`,
  );
  console.log(`${c.dim}URL: ${baseUrl}${c.reset}`);
  console.log("");

  printHeader({
    name: "Simulación última semana",
    role: "hoy−7 → hoy",
    business: "Andrea Guerrero Estética y Peluquería",
    place: `${SEASON_START} … ${SEASON_END}`,
  });

  // ── Setup dueña ───────────────────────────────────────────────
  {
    const auth = await login(AG_OWNER.username);
    if (!auth.ok || !auth.cookie) {
      push(
        scenes,
        {
          id: "owner-login",
          title: "Dueña ingresa",
          ok: false,
          lines: ["No pudo entrar"],
        },
        true,
      );
      finish(scenes, baseUrl, started);
      return;
    }
    push(
      scenes,
      {
        id: "owner-login",
        title: "Dueña ingresa",
        ok: true,
        lines: [`${auth.me?.name ?? "Andrea"} · configura simulación`],
      },
      true,
    );

    await ensureDemoBranchStock();
    const cur = await getJson(`${baseUrl}/api/settings`, auth.cookie);
    const put = await putJson(
      `${baseUrl}/api/settings`,
      {
        ...(typeof cur.body === "object" && cur.body ? cur.body : {}),
        bookingStartHour: 9,
        bookingEndHour: 19,
        cashRegisterMode: "employee_own",
      },
      auth.cookie,
    );
    push(
      scenes,
      {
        id: "owner-config",
        title: "Dueña configura horario + caja",
        ok: put.ok,
        lines: put.ok
          ? ["Agenda 09:00–19:00 · employee_own · stock repuesto"]
          : [`HTTP ${put.status} ${msgOf(put.body)}`],
      },
      true,
    );
    await logout(baseUrl, auth.cookie);
  }

  // Compras a proveedores (gastos Finanzas + entradas kardex)
  // Día 0, día ~mitad, penúltimo y último del rango
  {
    const purchaseIdx = new Set<number>([
      0,
      Math.floor(days.length / 2),
      Math.max(0, days.length - 2),
      Math.max(0, days.length - 1),
    ]);
    const purchaseDays = [...purchaseIdx]
      .map((i) => days[i])
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();

    for (const pd of purchaseDays) {
      console.log(
        `${c.dim}  Dueña: proveedores/compras ${pd} (gastos + entrada stock)…${c.reset}`,
      );
      process.env.OWNER_PURCHASE_DATE = pd;
      const buy = await runOwnerSuppliersPurchasesTour({
        purchaseDate: pd,
      });
      push(
        scenes,
        {
          id: `purchases-${pd}`,
          title: `Compras proveedores · ${pd}`,
          ok: Boolean(buy.ok),
          lines: buy.ok
            ? [`Gastos en Finanzas · entradas en Movimientos`]
            : [`Falló o parcial · revisá log del tour proveedores`],
        },
        true,
      );
    }
  }

  // Traspaso + ajuste (kardex) · día intermedio
  {
    const mid = days[Math.floor(days.length / 2)] ?? SEASON_START;
    const auth = await login(AG_OWNER.username);
    if (auth.ok && auth.cookie) {
      const [branchesRes, productsRes] = await Promise.all([
        getJson(`${baseUrl}/api/branches`, auth.cookie),
        getJson(`${baseUrl}/api/products`, auth.cookie),
      ]);
      const branches = asArray(branchesRes.body) as Array<{
        id?: number;
        name?: string;
      }>;
      const products = asArray(productsRes.body) as Array<{
        id?: number;
        name?: string;
      }>;
      const from = branches[0];
      const to = branches[1] ?? branches[0];
      const product = products[0];

      if (from?.id && to?.id && from.id !== to.id && product?.id) {
        const transfer = await postJson(
          `${baseUrl}/api/branches/transfers`,
          {
            fromBranchId: from.id,
            toBranchId: to.id,
            movedAt: `${mid}T14:00:00.000`,
            notes: `Rebalanceo simulación ${mid}`,
            lines: [{ productId: product.id, quantity: 3 }],
          },
          auth.cookie,
        );
        push(
          scenes,
          {
            id: `transfer-${mid}`,
            title: `Traspaso · ${mid}`,
            ok: transfer.ok,
            lines: transfer.ok
              ? [
                  `${from.name ?? from.id} → ${to.name ?? to.id} · ${product.name ?? product.id} ×3`,
                ]
              : [`HTTP ${transfer.status} ${msgOf(transfer.body)}`],
          },
          true,
        );
      }

      if (product?.id && from?.id) {
        const adj = await postJson(
          `${baseUrl}/api/inventory/movements`,
          {
            productId: product.id,
            quantity: 2,
            type: "ajuste",
            reason: "reconteo",
            branchId: from.id,
            deltaSign: "in",
            date: `${mid}T16:00:00.000`,
            description: `Ajuste inventario simulación ${mid}`,
          },
          auth.cookie,
        );
        push(
          scenes,
          {
            id: `ajuste-${mid}`,
            title: `Ajuste · ${mid}`,
            ok: adj.ok,
            lines: adj.ok
              ? [`Reconteo +2 · ${product.name ?? product.id}`]
              : [`HTTP ${adj.status} ${msgOf(adj.body)}`],
          },
          true,
        );
      }

      await logout(baseUrl, auth.cookie);
    }
  }

  let daysOk = 0;
  let daysFail = 0;
  let totalPaid = 0;
  let totalPos = 0;

  for (let di = 0; di < days.length; di++) {
    const day = days[di];
    let dayPaid = 0;
    let dayPos = 0;
    let dayErrors = 0;
    const notes: string[] = [];

    if (di > 0 && di % 4 === 0) {
      await ensureDemoBranchStock();
    }

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const auth = await login(emp.username);
      if (!auth.ok || !auth.cookie || !auth.me?.personId) {
        dayErrors += 1;
        notes.push(`${emp.firstName}: login fail`);
        continue;
      }

      const [customersRes, servicesRes, productsRes] = await Promise.all([
        getJson(`${baseUrl}/api/customers`, auth.cookie),
        getJson(`${baseUrl}/api/services`, auth.cookie),
        getJson(`${baseUrl}/api/products`, auth.cookie),
      ]);
      const customers = asArray(customersRes.body) as Array<{ id?: number }>;
      const services = asArray(servicesRes.body) as Array<{ id?: number }>;
      const products = asArray(productsRes.body) as Array<{
        id?: number;
        price?: number;
        stock?: number;
        name?: string;
      }>;
      const customer = customers[(di + i) % Math.max(customers.length, 1)];
      const service = services[(di + i) % Math.max(services.length, 1)];
      const withStock = products.filter((p) => Number(p.stock ?? 0) > 0);
      const productPool = withStock.length ? withStock : products;
      const product = productPool[(di + i) % Math.max(productPool.length, 1)];
      const hour = 9 + (i % 9);

      const create = await postJson(
        `${baseUrl}/api/appointments`,
        {
          title: `Cita ${day} · ${emp.firstName}`,
          description: `Simulación ${SEASON_START}→${SEASON_END}`,
          customerId: customer?.id,
          userId: auth.me.personId,
          branchId: auth.me.branch?.id ?? null,
          appointmentDate: localIso(day, hour, 0),
          status: "scheduled",
          serviceIds: service?.id ? [service.id] : [],
          products: product?.id ? [{ productId: product.id, quantity: 1 }] : [],
        },
        auth.cookie,
      );
      const apt = (create.body ?? {}) as { id?: number };
      if (!create.ok || !apt.id) {
        dayErrors += 1;
        notes.push(`${emp.firstName}: agenda ${msgOf(create.body)}`);
        await logout(baseUrl, auth.cookie);
        continue;
      }

      const open = await postJson(
        `${baseUrl}/api/shifts/open`,
        {
          cashTotal: OPENING_CASH,
          storeId: auth.me.branch?.id,
          openedAt: `${day}T08:00:00.000`,
          notes: `Semana ${day}`,
        },
        auth.cookie,
      );
      let shift = (open.body ?? {}) as { id?: number };
      if (!open.ok && String(msgOf(open.body)).includes("Ya tienes")) {
        const active = await getJson(`${baseUrl}/api/shifts/active`, auth.cookie);
        shift = (active.body ?? {}) as { id?: number };
      }
      if (!shift.id) {
        dayErrors += 1;
        notes.push(`${emp.firstName}: caja ${msgOf(open.body)}`);
        await logout(baseUrl, auth.cookie);
        continue;
      }

      const pay = await postJson(
        `${baseUrl}/api/appointments/${apt.id}/payment`,
        {
          method: "cash",
          notes: `Cobro simulación ${day}`,
          paidAt: localIso(day, Math.min(hour + 1, 18), 15),
        },
        auth.cookie,
      );
      if (pay.ok) dayPaid += 1;
      else {
        dayErrors += 1;
        notes.push(`${emp.firstName}: cobro ${msgOf(pay.body)}`);
      }

      if (product?.id) {
        const sale = await postJson(
          `${baseUrl}/api/product-sales`,
          {
            method: "cash",
            branchId: auth.me.branch?.id,
            paidAt: `${day}T12:30:00.000`,
            lines: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: Number(product.price ?? 5),
              },
            ],
            notes: `POS simulación ${day}`,
          },
          auth.cookie,
        );
        if (sale.ok) dayPos += 1;
        else {
          dayErrors += 1;
          notes.push(`${emp.firstName}: POS ${msgOf(sale.body)}`);
        }
      }

      const active = await getJson(`${baseUrl}/api/shifts/active`, auth.cookie);
      const activeShift = (active.body ?? {}) as {
        id?: number;
        expectedCashTotal?: number;
        openingCashTotal?: number;
      };
      const closeId = activeShift.id ?? shift.id;
      const closeTotal =
        activeShift.expectedCashTotal ??
        Number(activeShift.openingCashTotal ?? OPENING_CASH);
      const close = await postJson(
        `${baseUrl}/api/shifts/${closeId}/close`,
        {
          cashTotal: closeTotal,
          closedAt: `${day}T19:00:00.000`,
          notes: `Cierre simulación ${day}`,
        },
        auth.cookie,
      );
      if (!close.ok) {
        dayErrors += 1;
        notes.push(`${emp.firstName}: cierre ${msgOf(close.body)}`);
      }

      await logout(baseUrl, auth.cookie);
    }

    totalPaid += dayPaid;
    totalPos += dayPos;
    const dayOk = dayErrors === 0 && dayPaid > 0;
    if (dayOk) daysOk += 1;
    else daysFail += 1;

    push(
      scenes,
      {
        id: `day-${day}`,
        title: `${day} · operación`,
        ok: dayOk,
        lines: [
          `Cobradas ${dayPaid}/${employees.length} · POS ${dayPos} · errores ${dayErrors}`,
          ...(notes.length ? notes.slice(0, 3) : []),
        ],
      },
      true,
    );

    const pct = Math.round(((di + 1) / days.length) * 100);
    console.log(
      `${c.dim}  progreso ${di + 1}/${days.length} (${pct}%)${c.reset}`,
    );
  }

  // ── Dueña mira panel + finanzas + movimientos al final ────────
  {
    const auth = await login(AG_OWNER.username);
    if (auth.ok && auth.cookie) {
      const [dash, incomes, expenses, movements] = await Promise.all([
        getJson(
          `${baseUrl}/api/dashboard?userId=${auth.me?.id ?? ""}&period=all`,
          auth.cookie,
        ),
        getJson(`${baseUrl}/api/finance/incomes?take=5`, auth.cookie),
        getJson(`${baseUrl}/api/finance/expenses-ledger?take=5`, auth.cookie),
        getJson(`${baseUrl}/api/inventory/movements?take=20`, auth.cookie),
      ]);
      const d = (dash.body ?? {}) as Record<string, unknown>;
      const hero = (d.financeHero ?? null) as Record<string, unknown> | null;
      const revenue =
        hero && typeof hero.revenue === "number" ? hero.revenue : d.revenue;
      const incomeRows = asArray(incomes.body);
      const expenseRows = asArray(expenses.body);
      const moveRows = asArray(movements.body);
      const kinds = new Set(
        moveRows.map((m) => String((m as { kind?: string }).kind ?? "")),
      );

      push(
        scenes,
        {
          id: "owner-panel",
          title: "Dueña revisa panel / finanzas / kardex",
          ok: dash.ok && incomes.ok && expenses.ok && movements.ok,
          lines: [
            `Ingresos panel: $${Number(revenue ?? 0).toFixed(2)}`,
            `Finanzas · incomes≈${incomeRows.length}+ · expenses≈${expenseRows.length}+`,
            `Kardex · ${moveRows.length}+ filas · tipos: ${[...kinds].filter(Boolean).join(", ") || "—"}`,
          ],
        },
        true,
      );
      await logout(baseUrl, auth.cookie);
    }
  }

  push(
    scenes,
    {
      id: "season-summary",
      title: "Resumen simulación",
      ok: daysFail === 0,
      lines: [
        `Días OK ${daysOk}/${days.length} · fallidos ${daysFail}`,
        `Cobros ${totalPaid} · POS ${totalPos}`,
        `${SEASON_START} → ${SEASON_END}`,
        `Ver: Finanzas (ingresos/gastos) · Inventario → Movimientos`,
      ],
    },
    true,
  );

  finish(scenes, baseUrl, started);
}

function finish(scenes: StoryScene[], baseUrl: string, started: number) {
  printFooter(scenes);
  const sum = summarizeScenes(scenes);
  console.log("");
  console.log(
    sum.ok
      ? `${c.green}Simulación ${SEASON_START}→${SEASON_END} completada.${c.reset}`
      : `${c.red}Simulación con fallos (${sum.failed}/${sum.total}).${c.reset}`,
  );
  console.log("");
  saveTestHistory({
    tester: "season-simulation",
    mode: `${SEASON_START}_${SEASON_END}`,
    baseUrl,
    durationMs: Date.now() - started,
    ok: sum.ok,
    summary: sum,
    scenes: scenesForHistory(scenes),
    meta: {
      start: SEASON_START,
      end: SEASON_END,
      cashRegisterMode: "employee_own",
      window: "last-7-days",
    },
  });
  void prisma.$disconnect();
}

const isDirect =
  typeof process.argv[1] === "string" &&
  (process.argv[1].replace(/\\/g, "/").endsWith("/scripts/bots/season-simulation.ts") ||
    process.env.SEASON_SIM_SCRIPT?.trim() === "1");

if (isDirect) {
  runSeasonSimulation().catch((err) => {
    console.error(err);
    process.exitCode = 1;
    void prisma.$disconnect();
  });
}
