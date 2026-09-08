/**
 * Tour Dueña · proveedores + compras (gastos en Finanzas).
 *
 * Crea/usa proveedores demo y registra compras recibidas+pagadas
 * → genera Expense en el ledger (módulo Finanzas).
 *
 * Uso:
 *   OWNER_TOUR_SCRIPT=suppliers-purchases npx tsx scripts/bots/owner-tour.ts
 *   o menú Tour Dueña → Proveedores y compras
 */
import { AG_SUPPLIERS } from "../../lib/andrea-guerrero-demo";
import {
  asArray,
  c,
  failScene,
  finishOwnerTour,
  getJson,
  loginAsOwner,
  logoutOwner,
  msgOf,
  postJson,
  printOwnerHeader,
  printScene,
  type StoryScene,
} from "./shared";

const PURCHASE_DATE =
  process.env.OWNER_PURCHASE_DATE?.trim() || "2026-07-15";

export async function runOwnerSuppliersPurchasesTour(opts?: {
  purchaseDate?: string;
  /** Si true, no hace logout (para encadenar desde season). */
  keepSession?: boolean;
}) {
  printOwnerHeader("Proveedores y compras");

  const auth = await loginAsOwner();
  if (!auth.ok) {
    finishOwnerTour(
      "suppliers-purchases-login-fail",
      auth.scenes,
      auth.baseUrl,
      auth.started,
    );
    return { ok: false as const };
  }

  const { session } = auth;
  const scenes: StoryScene[] = [...auth.scenes];
  const TOTAL = 12;
  const { baseUrl, cookie } = session;
  const purchaseDate = opts?.purchaseDate ?? PURCHASE_DATE;

  // ── Proveedores ───────────────────────────────────────────────
  const existingRes = await getJson(`${baseUrl}/api/suppliers`, cookie);
  if (!existingRes.ok) {
    const scene = failScene("suppliers-list", "Lista proveedores", existingRes);
    scenes.push(scene);
    printScene(scenes.length, TOTAL, scene);
    await logoutOwner(session, scenes, TOTAL);
    finishOwnerTour("suppliers-purchases", scenes, baseUrl, session.started);
    return { ok: false as const };
  }

  let suppliers = asArray(existingRes.body) as Array<{
    id?: number;
    name?: string;
  }>;

  const createdIds: number[] = [];
  for (const demo of AG_SUPPLIERS) {
    const found = suppliers.find(
      (s) => (s.name ?? "").toLowerCase() === demo.name.toLowerCase(),
    );
    if (found?.id) {
      createdIds.push(found.id);
      continue;
    }
    const create = await postJson(
      `${baseUrl}/api/suppliers`,
      {
        name: demo.name,
        phone: demo.phone,
        email: demo.email,
        taxId: demo.taxId,
        address: demo.address,
      },
      cookie,
    );
    const body = (create.body ?? {}) as { id?: number };
    const ok = create.ok && Boolean(body.id);
    if (ok && body.id) {
      createdIds.push(body.id);
      suppliers = [...suppliers, { id: body.id, name: demo.name }];
    }
    scenes.push({
      id: `supplier-${demo.name}`,
      title: `Proveedor · ${demo.name}`,
      ok,
      lines: ok
        ? [`Alta #${body.id} · ${demo.address}`]
        : found
          ? [`Ya existía`]
          : [`HTTP ${create.status} ${msgOf(create.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  if (createdIds.length === 0 && suppliers.length > 0) {
    createdIds.push(
      ...suppliers
        .map((s) => s.id)
        .filter((id): id is number => typeof id === "number")
        .slice(0, 3),
    );
  }

  scenes.push({
    id: "suppliers-ready",
    title: "Proveedores listos",
    ok: createdIds.length > 0,
    lines: [`${createdIds.length} proveedor(es) para compras`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  // ── Sucursales + productos ────────────────────────────────────
  const [branchesRes, productsRes] = await Promise.all([
    getJson(`${baseUrl}/api/branches`, cookie),
    getJson(`${baseUrl}/api/products`, cookie),
  ]);
  const branches = asArray(branchesRes.body) as Array<{
    id?: number;
    name?: string;
  }>;
  const products = asArray(productsRes.body) as Array<{
    id?: number;
    name?: string;
    price?: number;
    cost?: number;
  }>;

  if (!branches.length || !products.length || !createdIds.length) {
    scenes.push({
      id: "purchase-skip",
      title: "Compras",
      ok: false,
      lines: ["Faltan sucursales, productos o proveedores"],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
    if (!opts?.keepSession) await logoutOwner(session, scenes, TOTAL);
    finishOwnerTour("suppliers-purchases", scenes, baseUrl, session.started);
    return { ok: false as const, session, scenes };
  }

  // ── Compras recibidas + pagadas (Expense) ─────────────────────
  let purchasesOk = 0;
  for (let i = 0; i < Math.min(createdIds.length, branches.length, 3); i++) {
    const supplierId = createdIds[i % createdIds.length];
    const branch = branches[i % branches.length];
    const lineProducts = [
      products[i % products.length],
      products[(i + 3) % products.length],
      products[(i + 7) % products.length],
    ].filter(Boolean);

    const lines = lineProducts.map((p, idx) => ({
      productId: p.id,
      quantity: 5 + idx * 2,
      unitCost: Number(p.cost ?? Math.max(1, Number(p.price ?? 10) * 0.55)),
    }));

    const purchase = await postJson(
      `${baseUrl}/api/purchases`,
      {
        supplierId,
        branchId: branch.id,
        purchasedAt: `${purchaseDate}T10:00:00.000`,
        method: "transfer",
        receiveNow: true,
        payNow: true,
        notes: `Reposición insumos ${purchaseDate}`,
        lines,
      },
      cookie,
    );
    const ok = purchase.ok;
    if (ok) purchasesOk += 1;
    const amount = (purchase.body as { amount?: number } | null)?.amount;
    scenes.push({
      id: `purchase-${i}`,
      title: `Compra · ${branch.name ?? "local"}`,
      ok,
      lines: ok
        ? [
            `PO #${(purchase.body as { id?: number })?.id} · $${Number(amount ?? 0).toFixed(2)}`,
            `Proveedor #${supplierId} · recibido+pagado → gasto Finanzas`,
          ]
        : [`HTTP ${purchase.status} ${msgOf(purchase.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  // ── Verificar ledger gastos ───────────────────────────────────
  const expenses = await getJson(`${baseUrl}/api/finance/expenses-ledger`, cookie);
  const expenseRows = asArray(expenses.body);
  scenes.push({
    id: "expenses-check",
    title: "Finanzas · gastos ledger",
    ok: expenses.ok && expenseRows.length > 0,
    lines: expenses.ok
      ? [
          `${c.bold}${expenseRows.length}${c.reset} gasto(s) en ledger`,
          purchasesOk > 0
            ? `Compras OK esta corrida: ${purchasesOk}`
            : "Sin compras nuevas",
        ]
      : [`HTTP ${expenses.status} ${msgOf(expenses.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  if (!opts?.keepSession) {
    await logoutOwner(session, scenes, TOTAL);
    finishOwnerTour("suppliers-purchases", scenes, baseUrl, session.started);
  }

  return {
    ok: purchasesOk > 0 && expenses.ok,
    session,
    scenes,
    purchasesOk,
  };
}

const isDirect =
  typeof process.argv[1] === "string" &&
  process.argv[1]
    .replace(/\\/g, "/")
    .endsWith("/scripts/bots/owner/suppliers-purchases.ts");

if (isDirect) {
  runOwnerSuppliersPurchasesTour().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
