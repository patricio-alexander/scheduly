/**
 * Tour Dueña · registra clientes (default 20).
 */
import { buildDemoCustomer } from "../../lib/demo-customers";
import {
  asArray,
  c,
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

const COUNT = Math.max(
  1,
  Number(process.env.OWNER_TOUR_CUSTOMERS?.trim() || "20"),
);

export async function runOwnerRegisterCustomersTour(opts?: { count?: number }) {
  const count = opts?.count ?? COUNT;
  printOwnerHeader("Loja · registrar clientes");

  const auth = await loginAsOwner();
  if (!auth.ok) {
    finishOwnerTour(
      "register-customers-login-fail",
      auth.scenes,
      auth.baseUrl,
      auth.started,
    );
    return;
  }

  const { session } = auth;
  const scenes: StoryScene[] = [...auth.scenes];
  const TOTAL = 6;
  const { baseUrl, cookie } = session;

  const before = await getJson(`${baseUrl}/api/customers`, cookie);
  const beforeCount = asArray(before.body).length;
  scenes.push({
    id: "list-before",
    title: "Clientes antes de registrar",
    ok: before.ok,
    lines: [`Total en sistema: ${beforeCount}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  const lines: string[] = [];
  let created = 0;
  let allOk = true;
  for (let i = 0; i < count; i++) {
    const payload = buildDemoCustomer({
      actorTag: "owner_andrea",
      index: i,
      branchHint: "general",
    });
    const res = await postJson(`${baseUrl}/api/customers`, payload, cookie);
    if (res.ok && (res.body as { id?: number })?.id) {
      created += 1;
      if (i < 5) lines.push(`· ${payload.name}`);
    } else {
      allOk = false;
      lines.push(`· FAIL #${i + 1} HTTP ${res.status} ${msgOf(res.body)}`);
    }
  }

  scenes.push({
    id: "register",
    title: `Registra ${count} clientes (dueña)`,
    ok: allOk && created === count,
    lines: [`Creados: ${created}/${count}`, ...lines],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  const after = await getJson(`${baseUrl}/api/customers`, cookie);
  const afterCount = asArray(after.body).length;
  scenes.push({
    id: "verify",
    title: "Verifica listado",
    ok: after.ok && afterCount >= beforeCount + created,
    lines: [`Antes ${beforeCount} → ahora ${afterCount} (+${afterCount - beforeCount})`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  await logoutOwner(session, scenes, TOTAL);
  finishOwnerTour("register-customers", scenes, baseUrl, session.started);
}
