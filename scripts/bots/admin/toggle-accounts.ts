/**
 * Tour Admin · desactiva y reactiva un empleado de su local.
 */
import {
  AG_ADMINS,
  asArray,
  c,
  deleteJson,
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
};

export async function runAdminToggleAccountsTour(forcedAdmin?: AdminSeed) {
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
      title: "Activar/desactivar · ¿qué Administrador?",
    });
    if (picked.kind !== "one") {
      console.log(`${c.dim}Cancelado.${c.reset}`);
      return;
    }
    admin = picked.admin;
  }

  process.stdout.write(c.clear + c.show);
  printAdminHeader(admin, "activar / desactivar");

  const auth = await loginAsAdmin(admin);
  if (!auth.ok) {
    finishAdminTour("toggle-accounts-login-fail", auth.scenes, {
      baseUrl: auth.baseUrl,
      started: auth.started,
      admin,
    });
    return;
  }

  const { session } = auth;
  const scenes: StoryScene[] = [...auth.scenes];
  const TOTAL = 7;
  const { baseUrl, cookie } = session;

  const list = await getJson(
    `${baseUrl}/api/users?includeInactive=1`,
    cookie,
  );
  if (!list.ok) {
    scenes.push({
      id: "list",
      title: "Lista equipo del local",
      ok: false,
      lines: [`HTTP ${list.status} ${msgOf(list.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
    await logoutAdmin(session, scenes, TOTAL);
    finishAdminTour("toggle-accounts", scenes, session);
    return;
  }

  const employees = (asArray(list.body) as UserRow[]).filter((u) => u.id);
  const active = employees.filter((u) => u.isActive !== false);
  scenes.push({
    id: "list",
    title: "Lista equipo del local",
    ok: active.length > 0,
    lines: [
      `Activos: ${active.length} · total: ${employees.length}`,
    ],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  if (active.length === 0) {
    await logoutAdmin(session, scenes, TOTAL);
    finishAdminTour("toggle-accounts", scenes, session);
    return;
  }

  const target = active[0];
  const email = target.email || `${target.username}@andreaguerrero.ec`;
  const name = target.name ?? target.username ?? "Empleado";

  const deact = await deleteJson(`${baseUrl}/api/users/${target.id}`, cookie);
  scenes.push({
    id: "deactivate",
    title: "Desactiva cuenta del empleado",
    ok: deact.ok,
    lines: deact.ok
      ? [`@${target.username} quedó inactiva`]
      : [`HTTP ${deact.status} ${msgOf(deact.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  {
    const after = await getJson(
      `${baseUrl}/api/users?includeInactive=1`,
      cookie,
    );
    const rows = asArray(after.body) as UserRow[];
    const row = rows.find((r) => r.id === target.id);
    scenes.push({
      id: "verify-inactive",
      title: "Verifica que aparece inactiva",
      ok: after.ok && row?.isActive === false,
      lines: [
        row
          ? `@${row.username} isActive=${String(row.isActive)}`
          : `No encontró la cuenta en el listado`,
      ],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  const react = await putJson(
    `${baseUrl}/api/users/${target.id}`,
    {
      username: target.username,
      name,
      email,
      roles: ["Empleado"],
      role: "Empleado",
      branchId: session.me.branch?.id,
      isActive: true,
    },
    cookie,
  );
  const reactivated = (react.body ?? {}) as UserRow;
  scenes.push({
    id: "reactivate",
    title: "Reactiva la cuenta",
    ok: react.ok && reactivated.isActive !== false,
    lines: react.ok
      ? [
          `@${target.username} volvió a activa`,
          `${c.green}Toggle OK${c.reset}`,
        ]
      : [`HTTP ${react.status} ${msgOf(react.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  {
    const after = await getJson(`${baseUrl}/api/users`, cookie);
    const rows = asArray(after.body) as UserRow[];
    const row = rows.find((r) => r.id === target.id);
    scenes.push({
      id: "verify-active",
      title: "Verifica que vuelve a listarse activa",
      ok: after.ok && Boolean(row) && row?.isActive !== false,
      lines: [
        row
          ? `@${row.username} visible y activa`
          : `No aparece en el listado activo`,
      ],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  await logoutAdmin(session, scenes, TOTAL);
  finishAdminTour("toggle-accounts", scenes, session);
}
