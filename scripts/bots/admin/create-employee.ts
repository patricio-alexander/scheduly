/**
 * Tour Admin · crea un empleado de prueba en su local y lo desactiva.
 */
import { nowStamp } from "../../lib/menu-ui";
import {
  AG_ADMINS,
  AG_PASSWORD,
  asArray,
  c,
  deleteJson,
  finishAdminTour,
  getJson,
  loginAsAdmin,
  logoutAdmin,
  msgOf,
  pickAdmin,
  postJson,
  printAdminHeader,
  printScene,
  type AdminSeed,
  type StoryScene,
} from "./shared";

export async function runAdminCreateEmployeeTour(forcedAdmin?: AdminSeed) {
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
      title: "Crear empleado · ¿qué Administrador?",
    });
    if (picked.kind !== "one") {
      console.log(`${c.dim}Cancelado.${c.reset}`);
      return;
    }
    admin = picked.admin;
  }

  process.stdout.write(c.clear + c.show);
  printAdminHeader(admin, "crear empleado");

  const auth = await loginAsAdmin(admin);
  if (!auth.ok) {
    finishAdminTour("create-employee-login-fail", auth.scenes, {
      baseUrl: auth.baseUrl,
      started: auth.started,
      admin,
    });
    return;
  }

  const { session } = auth;
  const scenes: StoryScene[] = [...auth.scenes];
  const TOTAL = 5;
  const { baseUrl, cookie } = session;
  const stamp = nowStamp().replace(/[:\s]/g, "").slice(-6);
  const username = `bot_emp_${admin.branchKey}_${stamp}`.slice(0, 40);
  const email = `${username}@andreaguerrero.ec`;

  const created = await postJson(
    `${baseUrl}/api/users`,
    {
      username,
      name: `Bot Empleado ${stamp}`,
      email,
      password: AG_PASSWORD,
      roles: ["Empleado"],
      role: "Empleado",
    },
    cookie,
  );

  const body = (created.body ?? {}) as {
    id?: number;
    username?: string;
    roles?: string[];
    branch?: { name?: string } | null;
    message?: string;
  };

  scenes.push({
    id: "create",
    title: "Crear cuenta Empleado",
    ok: created.ok && Number(body.id) > 0,
    lines: created.ok
      ? [
          `Usuario ${c.bold}${body.username ?? username}${c.reset}`,
          `Rol: Empleado · local: ${body.branch?.name ?? admin.branchKey}`,
        ]
      : [`HTTP ${created.status} ${msgOf(created.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  const accountId = Number(body.id);
  if (created.ok && accountId > 0) {
    const list = await getJson(
      `${baseUrl}/api/users?includeInactive=1`,
      cookie,
    );
    const items = asArray<Record<string, unknown>>(list.body);
    const found = items.some((u) => Number(u.id) === accountId);
    scenes.push({
      id: "list",
      title: "Aparece en equipo del local",
      ok: list.ok && found,
      lines: [
        found
          ? `${c.green}Visible en la lista de su sucursal${c.reset}`
          : "No aparece en el listado",
      ],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

    const deactivated = await deleteJson(
      `${baseUrl}/api/users/${accountId}`,
      cookie,
    );
    scenes.push({
      id: "cleanup",
      title: "Limpieza · desactivar cuenta bot",
      ok: deactivated.ok || deactivated.status === 200,
      lines: [`Cuenta de prueba ${username} desactivada`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  await logoutAdmin(session);
  scenes.push({
    id: "logout",
    title: "Cierra sesión",
    ok: true,
    lines: [`${admin.firstName} terminó de crear empleado.`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  finishAdminTour("create-employee", scenes, {
    baseUrl,
    started: auth.started,
    admin,
  });
}
