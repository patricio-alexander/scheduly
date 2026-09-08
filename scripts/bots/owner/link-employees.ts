/**
 * Tour Dueña · vincula empleados existentes a las sucursales (reparte Colón / Eguiguren).
 */
import {
  asArray,
  c,
  finishOwnerTour,
  getJson,
  loginAsOwner,
  logoutOwner,
  msgOf,
  printOwnerHeader,
  printScene,
  putJson,
  type StoryScene,
} from "./shared";

type UserRow = {
  id?: number;
  username?: string;
  name?: string;
  email?: string;
  isActive?: boolean;
  roles?: Array<string | { name?: string; label?: string }>;
  role?: string;
  branch?: { id?: number; name?: string } | null;
};

type BranchRow = {
  id: number;
  name: string;
};

function roleNames(u: UserRow): string[] {
  if (Array.isArray(u.roles) && u.roles.length) {
    return u.roles.map((r) => {
      if (typeof r === "string") return r.toLowerCase();
      return String(r.name ?? r.label ?? "").toLowerCase();
    });
  }
  if (u.role) return [String(u.role).toLowerCase()];
  return [];
}

/** Solo cuentas de equipo (Empleado), sin Dueña ni Administrador de negocio. */
function isPureEmployeeAccount(u: UserRow): boolean {
  if (!u.id || u.username === "Administrador") return false;
  const roles = roleNames(u);
  const isOwner = roles.some((r) => r === "dueño" || r === "dueno" || r === "owner");
  const isAdmin = roles.some(
    (r) => r === "administrador" || r === "admin",
  );
  const isEmp = roles.some((r) => r === "empleado" || r === "employee");
  return isEmp && !isOwner && !isAdmin;
}

export async function runOwnerLinkEmployeesTour() {
  printOwnerHeader("Loja · vincular empleados a locales");

  const auth = await loginAsOwner();
  if (!auth.ok) {
    finishOwnerTour(
      "link-employees-login-fail",
      auth.scenes,
      auth.baseUrl,
      auth.started,
    );
    return;
  }

  const { session } = auth;
  const scenes: StoryScene[] = [...auth.scenes];
  const TOTAL = 8;
  const { baseUrl, cookie } = session;

  const usersRes = await getJson(
    `${baseUrl}/api/users?includeInactive=1`,
    cookie,
  );
  const branchesRes = await getJson(`${baseUrl}/api/branches`, cookie);

  if (!usersRes.ok || !branchesRes.ok) {
    scenes.push({
      id: "load",
      title: "Carga cuentas y sucursales",
      ok: false,
      lines: [
        !usersRes.ok
          ? `Users HTTP ${usersRes.status}`
          : `Branches HTTP ${branchesRes.status}`,
      ],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
    await logoutOwner(session, scenes, TOTAL);
    finishOwnerTour("link-employees", scenes, baseUrl, session.started);
    return;
  }

  const users = asArray(usersRes.body) as UserRow[];
  const branches = asArray(branchesRes.body) as BranchRow[];
  const employees = users.filter(
    (u) => u.isActive !== false && isPureEmployeeAccount(u),
  );

  scenes.push({
    id: "load",
    title: "Carga cuentas y sucursales",
    ok: true,
    lines: [
      `Empleados activos: ${employees.length}`,
      `Locales: ${branches.map((b) => b.name).join(" · ") || "—"}`,
    ],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  if (branches.length < 1) {
    scenes.push({
      id: "no-branches",
      title: "Sin sucursales para vincular",
      ok: false,
      lines: [`Necesita al menos 1 local`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
    await logoutOwner(session, scenes, TOTAL);
    finishOwnerTour("link-employees", scenes, baseUrl, session.started);
    return;
  }

  // Preferir Colón / Eguiguren si existen; si no, los dos primeros
  const colon =
    branches.find((b) => /col[oó]n/i.test(b.name)) ?? branches[0];
  const eguiguren =
    branches.find((b) => /eguiguren/i.test(b.name)) ??
    branches[1] ??
    branches[0];
  const targets = [colon, eguiguren];

  let linked = 0;
  let failed = 0;
  const details: string[] = [];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const target = targets[i % targets.length];
    const put = await putJson(
      `${baseUrl}/api/users/${emp.id}`,
      {
        username: emp.username,
        name: emp.name ?? emp.username,
        email: emp.email || `${emp.username}@andreaguerrero.ec`,
        roles: ["Empleado"],
        role: "Empleado",
        branchId: target.id,
      },
      cookie,
    );
    if (put.ok) {
      linked += 1;
      details.push(`@${emp.username} → ${target.name}`);
    } else {
      failed += 1;
      details.push(
        `@${emp.username} FAIL HTTP ${put.status} ${msgOf(put.body)}`,
      );
    }
  }

  scenes.push({
    id: "link",
    title: "Vincula empleados a sucursales (reparto)",
    ok: failed === 0 && linked > 0,
    lines: [
      `Vinculados: ${c.bold}${linked}${c.reset} · fallos: ${failed}`,
      ...details.slice(0, 6).map((d) => `· ${d}`),
      details.length > 6 ? `· … y ${details.length - 6} más` : "",
    ].filter(Boolean),
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  // Verificar withTeam
  {
    const res = await getJson(`${baseUrl}/api/branches?withTeam=1`, cookie);
    if (!res.ok) {
      scenes.push({
        id: "verify",
        title: "Verifica equipos por local",
        ok: false,
        lines: [`HTTP ${res.status}`],
      });
    } else {
      const withTeam = asArray(res.body) as Array<{
        name: string;
        team?: unknown[];
        teamCount?: number;
      }>;
      scenes.push({
        id: "verify",
        title: "Verifica equipos por local",
        ok: true,
        lines: withTeam.map(
          (b) =>
            `${b.name}: ${b.team?.length ?? b.teamCount ?? 0} en equipo`,
        ),
      });
    }
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  await logoutOwner(session, scenes, TOTAL);
  finishOwnerTour("link-employees", scenes, baseUrl, session.started);
}
