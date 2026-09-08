/**
 * Tour Admin · edita datos de un empleado de su local y restaura.
 */
import { nowStamp } from "../../lib/menu-ui";
import {
  AG_ADMINS,
  asArray,
  c,
  finishAdminTour,
  getJson,
  loginAsAdmin,
  logoutAdmin,
  msgOf,
  pickAdmin,
  printAdminHeader,
  printScene,
  putJson,
  type AdminSeed,
  type StoryScene,
} from "./shared";

type UserRow = {
  id?: number;
  username?: string;
  name?: string;
  email?: string;
  isActive?: boolean;
  roles?: string[];
  role?: string;
  branch?: { id?: number; name?: string } | null;
};

export async function runAdminEditEmployeeTour(forcedAdmin?: AdminSeed) {
  let admin = forcedAdmin;
  if (!admin) {
    const user = process.env.ADMIN_TOUR_USER?.trim();
    if (user) {
      admin = AG_ADMINS.find((a) => a.username === user);
    }
  }
  if (!admin) {
    const picked = await pickAdmin({
      allowAll: false,
      title: "Editar empleado · ¿qué Administrador?",
    });
    if (picked.kind !== "one") {
      console.log(`${c.dim}Cancelado.${c.reset}`);
      return;
    }
    admin = picked.admin;
  }

  process.stdout.write(c.clear + c.show);
  printAdminHeader(admin, "editar empleado");

  const auth = await loginAsAdmin(admin);
  if (!auth.ok) {
    finishAdminTour("edit-employee-login-fail", auth.scenes, {
      baseUrl: auth.baseUrl,
      started: auth.started,
      admin,
    });
    return;
  }

  const { session } = auth;
  const scenes: StoryScene[] = [...auth.scenes];
  const TOTAL = 6;
  const { baseUrl, cookie } = session;

  const list = await getJson(
    `${baseUrl}/api/users?includeInactive=1`,
    cookie,
  );
  if (!list.ok) {
    scenes.push({
      id: "list",
      title: "Lista empleados del local",
      ok: false,
      lines: [`HTTP ${list.status} ${msgOf(list.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
    await logoutAdmin(session, scenes, TOTAL);
    finishAdminTour("edit-employee", scenes, session);
    return;
  }

  const employees = (asArray(list.body) as UserRow[]).filter(
    (u) => u.id && u.isActive !== false,
  );
  scenes.push({
    id: "list",
    title: "Lista empleados del local",
    ok: employees.length > 0,
    lines: [
      `Encontró ${employees.length} empleado(s) activos`,
      ...employees.slice(0, 4).map((e) => `· @${e.username} · ${e.name}`),
    ],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  if (employees.length === 0) {
    await logoutAdmin(session, scenes, TOTAL);
    finishAdminTour("edit-employee", scenes, session);
    return;
  }

  const target = employees[0];
  const stamp = nowStamp().replace(/[: ]/g, "").slice(-6);
  const originalName = target.name ?? target.username ?? "Empleado";
  const originalEmail =
    target.email || `${target.username}@andreaguerrero.ec`;
  const tourName = `${originalName} · Tour ${stamp}`;
  const tourEmail = `tour.${target.username}.${stamp}@andreaguerrero.ec`;

  const put = await putJson(
    `${baseUrl}/api/users/${target.id}`,
    {
      username: target.username,
      name: tourName,
      email: tourEmail,
      roles: ["Empleado"],
      role: "Empleado",
      branchId: session.me.branch?.id,
      isActive: true,
    },
    cookie,
  );
  const updated = (put.body ?? {}) as UserRow;
  scenes.push({
    id: "edit",
    title: "Edita nombre y correo del empleado",
    ok: put.ok && updated.name === tourName,
    lines: put.ok
      ? [
          `@${target.username}`,
          `Nombre: ${originalName} → ${updated.name}`,
          `Email: ${updated.email ?? tourEmail}`,
        ]
      : [`HTTP ${put.status} ${msgOf(put.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  const restore = await putJson(
    `${baseUrl}/api/users/${target.id}`,
    {
      username: target.username,
      name: originalName,
      email: originalEmail,
      roles: ["Empleado"],
      role: "Empleado",
      branchId: session.me.branch?.id,
      isActive: true,
    },
    cookie,
  );
  const restored = (restore.body ?? {}) as UserRow;
  scenes.push({
    id: "restore",
    title: "Restaura datos originales",
    ok: restore.ok && restored.name === originalName,
    lines: restore.ok
      ? [
          `Nombre restaurado: ${restored.name}`,
          `${c.green}Edit OK · no dejó cambios permanentes${c.reset}`,
        ]
      : [`HTTP ${restore.status} ${msgOf(restore.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  await logoutAdmin(session, scenes, TOTAL);
  finishAdminTour("edit-employee", scenes, session);
}
