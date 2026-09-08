/**
 * Tour Empleado · edita su propio perfil y restaura.
 */
import {
  AG_EMPLOYEES,
  c,
  finishEmployeeTour,
  getJson,
  loginAsEmployee,
  logoutEmployee,
  msgOf,
  pickEmployee,
  printEmployeeHeader,
  printScene,
  putJson,
  withBranchKey,
  type EmployeeSeed,
  type StoryScene,
} from "./shared";

export async function runEmployeeEditProfileTour(
  forced?: EmployeeSeed,
) {
  let employee = forced;
  if (!employee) {
    const user = process.env.EMPLOYEE_TOUR_USER?.trim();
    if (user) {
      const idx = AG_EMPLOYEES.findIndex((e) => e.username === user);
      if (idx >= 0) employee = withBranchKey(AG_EMPLOYEES[idx], idx);
    }
  }
  if (!employee) {
    const picked = await pickEmployee({
      allowAll: false,
      title: "Editar perfil · ¿qué Empleado?",
    });
    if (picked.kind !== "one") {
      console.log(`${c.dim}Cancelado.${c.reset}`);
      return;
    }
    employee = picked.employee;
  }

  process.stdout.write(c.clear + c.show);
  printEmployeeHeader(employee, "editar perfil");

  const auth = await loginAsEmployee(employee);
  if (!auth.ok) {
    finishEmployeeTour("edit-profile-login-fail", auth.scenes, {
      baseUrl: auth.baseUrl,
      started: auth.started,
      employee,
    });
    return;
  }

  const { session } = auth;
  const scenes: StoryScene[] = [...auth.scenes];
  const TOTAL = 6;
  const { baseUrl, cookie, me } = session;
  const userId = me.id;

  const get = await getJson(
    `${baseUrl}/api/profile?userId=${userId}`,
    cookie,
  );
  const profile = (get.body ?? {}) as {
    name?: string;
    email?: string;
    phone?: string;
  };
  scenes.push({
    id: "profile-get",
    title: "Lee su perfil",
    ok: get.ok,
    lines: get.ok
      ? [
          `Nombre: ${profile.name ?? "—"}`,
          `Email: ${profile.email ?? "—"}`,
          `Tel: ${profile.phone ?? "—"}`,
        ]
      : [`HTTP ${get.status} ${msgOf(get.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  if (!get.ok) {
    await logoutEmployee(session, scenes, TOTAL);
    finishEmployeeTour("edit-profile", scenes, session);
    return;
  }

  const original = {
    name: profile.name ?? `${employee.firstName} ${employee.firstLastName}`,
    email: profile.email || employee.email,
    phone: profile.phone || employee.phone,
  };
  const tourPhone = "0990000111";
  const tourName = `${employee.firstName} Tour`;

  const put = await putJson(
    `${baseUrl}/api/profile?userId=${userId}`,
    {
      name: tourName,
      email: original.email,
      phone: tourPhone,
    },
    cookie,
  );
  const updated = (put.body ?? {}) as { name?: string; phone?: string };
  scenes.push({
    id: "profile-put",
    title: "Edita nombre y teléfono",
    ok: put.ok && String(updated.name ?? "").includes("Tour"),
    lines: put.ok
      ? [
          `Nombre → ${updated.name}`,
          `Tel → ${updated.phone ?? tourPhone}`,
        ]
      : [`HTTP ${put.status} ${msgOf(put.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  const restore = await putJson(
    `${baseUrl}/api/profile?userId=${userId}`,
    original,
    cookie,
  );
  scenes.push({
    id: "profile-restore",
    title: "Restaura perfil original",
    ok: restore.ok,
    lines: restore.ok
      ? [
          `Nombre: ${original.name}`,
          `${c.green}Perfil OK · sin cambios permanentes${c.reset}`,
        ]
      : [`HTTP ${restore.status} ${msgOf(restore.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  await logoutEmployee(session, scenes, TOTAL);
  finishEmployeeTour("edit-profile", scenes, session);
}
