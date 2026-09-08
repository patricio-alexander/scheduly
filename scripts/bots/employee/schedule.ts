/**
 * Tour Empleado · agenda turnos con servicios + productos dentro del
 * horario que define la dueña. Uno o todos (paralelo por sucursal).
 *
 * Cada empleado:
 *  - lee el rango de /api/settings
 *  - agenda N turnos en horas aleatorias del rango
 *  - asigna a sí mismo y a compañeros del local
 *  - prueba que fuera de horario se rechaza
 *  - cancela los turnos de prueba al final
 */
import { nowStamp } from "../../lib/menu-ui";
import { runOwnerAgendaHoursTour } from "../owner/agenda-hours";
import { AG_OWNER } from "../../lib/andrea-guerrero-demo";
import {
  AG_PASSWORD,
  EMPLOYEES,
  asArray,
  c,
  extractSessionCookie,
  failScene,
  finishEmployeeTour,
  getJson,
  getSchedulyBaseUrl,
  msgOf,
  pickEmployee,
  postJson,
  printEmployeeHeader,
  printFooter,
  printHeader,
  printScene,
  putJson,
  saveTestHistory,
  scenesForHistory,
  summarizeScenes,
  type EmployeeSeed,
  type MeUser,
  type StoryScene,
} from "./shared";

type Hours = { bookingStartHour: number; bookingEndHour: number };

type StaffRow = {
  id?: number;
  personId?: number | null;
  name?: string;
  username?: string;
  role?: string;
};

type CatalogItem = {
  id?: number;
  name?: string;
  price?: number;
  stock?: number;
};

const DEFAULT_APPOINTMENTS = Number(
  process.env.EMPLOYEE_TOUR_APPOINTMENTS?.trim() || "3",
);

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function hourSlots(hours: Hours): number[] {
  const slots: number[] = [];
  for (let h = hours.bookingStartHour; h < hours.bookingEndHour; h++) {
    slots.push(h);
  }
  return slots;
}

function slotDate(dayOffset: number, hour: number) {
  const when = new Date();
  when.setDate(when.getDate() + dayOffset);
  when.setHours(hour, 0, 0, 0);
  return when;
}

export async function runOneEmployeeSchedule(
  employee: EmployeeSeed,
  opts?: { quiet?: boolean; skipHistory?: boolean; dayOffset?: number },
): Promise<{ employee: EmployeeSeed; scenes: StoryScene[] }> {
  const quiet = opts?.quiet === true;
  const skipHistory = opts?.skipHistory === true;
  const dayOffset = opts?.dayOffset ?? 1;
  const baseUrl = getSchedulyBaseUrl();
  const started = Date.now();
  const scenes: StoryScene[] = [];
  const TOTAL = 10;

  const emit = (scene: StoryScene) => {
    scenes.push(scene);
    if (!quiet) printScene(scenes.length, TOTAL, scene);
  };

  if (!quiet) printEmployeeHeader(employee, "agendar turnos");

  const login = await postJson(`${baseUrl}/api/auth/login`, {
    username: employee.username,
    password: AG_PASSWORD,
  });
  const cookie = extractSessionCookie(login.setCookie);
  if (!login.ok || !cookie) {
    emit(failScene("login", "Ingreso al sistema", login));
    if (!quiet) printFooter(scenes);
    if (!skipHistory) {
      finishEmployeeTour("schedule", scenes, { baseUrl, started, employee });
    }
    return { employee, scenes };
  }

  const meRes = await getJson(`${baseUrl}/api/auth/me`, cookie);
  const me = (meRes.body ?? {}) as MeUser;
  const roleOk = meRes.ok && me.role === "employee";
  const localName = me.branch?.name ?? employee.branchKey;
  const personId = me.personId;
  const branchId = me.branch?.id ?? null;

  emit({
    id: "login",
    title: "Ingreso al sistema",
    ok: roleOk && Boolean(personId),
    lines: roleOk
      ? [
          `Entró como ${c.bold}${me.name || employee.firstName}${c.reset}`,
          `Sucursal: ${c.bold}${localName}${c.reset}`,
        ]
      : [`Rol inesperado: ${me.role ?? "?"}`],
  });

  if (!roleOk || !personId) {
    if (!quiet) printFooter(scenes);
    if (!skipHistory) {
      finishEmployeeTour("schedule", scenes, { baseUrl, started, employee });
    }
    return { employee, scenes };
  }

  const settingsRes = await getJson(`${baseUrl}/api/settings`, cookie);
  const settings = (settingsRes.body ?? {}) as Partial<Hours>;
  const hours: Hours = {
    bookingStartHour: Number(settings.bookingStartHour ?? 9),
    bookingEndHour: Number(settings.bookingEndHour ?? 18),
  };
  const slots = hourSlots(hours);
  emit({
    id: "read-hours",
    title: "Lee horario definido por la dueña",
    ok: settingsRes.ok && slots.length > 0,
    lines: settingsRes.ok
      ? [
          `Rango: ${c.bold}${hours.bookingStartHour}:00–${hours.bookingEndHour}:00${c.reset}`,
          `Slots/hora disponibles: ${slots.join(", ")}`,
        ]
      : [`HTTP ${settingsRes.status}`],
  });

  const [customersRes, servicesRes, productsRes, staffRes] = await Promise.all([
    getJson(`${baseUrl}/api/customers`, cookie),
    getJson(`${baseUrl}/api/services`, cookie),
    getJson(`${baseUrl}/api/products`, cookie),
    getJson(
      `${baseUrl}/api/branches/staff${branchId ? `?branchId=${branchId}` : ""}`,
      cookie,
    ),
  ]);

  const customers = asArray(customersRes.body) as CatalogItem[];
  const services = asArray(servicesRes.body) as CatalogItem[];
  const products = asArray(productsRes.body) as CatalogItem[];
  const staff = (asArray(staffRes.body) as StaffRow[]).filter(
    (s) => s.personId && s.role === "employee",
  );

  emit({
    id: "load-catalog",
    title: "Carga clientes, catálogo y equipo del local",
    ok:
      customersRes.ok &&
      servicesRes.ok &&
      productsRes.ok &&
      customers.length > 0 &&
      services.length > 0 &&
      products.length > 0,
    lines: [
      `Clientes: ${customers.length} · Servicios: ${services.length} · Productos: ${products.length}`,
      staffRes.ok
        ? `Equipo del local: ${staff.length} empleado(s) (puede agendarles turnos)`
        : `Staff HTTP ${staffRes.status} ${msgOf(staffRes.body)}`,
    ],
  });

  if (
    customers.length === 0 ||
    services.length === 0 ||
    products.length === 0 ||
    slots.length === 0
  ) {
    await postJson(`${baseUrl}/api/auth/logout`, {}, cookie);
    if (!quiet) printFooter(scenes);
    if (!skipHistory) {
      finishEmployeeTour("schedule", scenes, { baseUrl, started, employee });
    }
    return { employee, scenes };
  }

  const assignees: Array<{ personId: number; name: string }> = [
    { personId, name: me.name || employee.firstName },
    ...staff
      .filter((s) => Number(s.personId) !== personId)
      .map((s) => ({
        personId: Number(s.personId),
        name: s.name || s.username || `Staff ${s.personId}`,
      })),
  ];

  const stamp = nowStamp().replace(/[: ]/g, "").slice(-6);
  const count = Math.min(
    Math.max(1, DEFAULT_APPOINTMENTS),
    slots.length,
    customers.length,
  );
  const pickedHours = shuffle(slots).slice(0, count);
  const createdIds: number[] = [];
  const createdLines: string[] = [];
  let createOk = true;
  let valueSum = 0;

  for (let i = 0; i < pickedHours.length; i++) {
    const hour = pickedHours[i];
    const when = slotDate(dayOffset, hour);
    const customer = customers[i % customers.length];
    const service = services[i % services.length];
    const product = products[i % products.length];
    const product2 = products[(i + 1) % products.length];
    const assignee = assignees[i % assignees.length];
    const svcPrice = Number(service.price ?? 0);
    const prodPrice =
      Number(product.price ?? 0) +
      (product2.id !== product.id ? Number(product2.price ?? 0) : 0);
    const total = svcPrice + prodPrice;
    valueSum += total;

    const productsPayload = [
      { productId: product.id, quantity: 1 },
      ...(product2.id && product2.id !== product.id
        ? [{ productId: product2.id, quantity: 1 }]
        : []),
    ];

    const create = await postJson(
      `${baseUrl}/api/appointments`,
      {
        title: `Tour ${employee.firstName} ${stamp} H${hour}`,
        description: `Bot agenda · ${localName} · para ${assignee.name}`,
        customerId: customer.id,
        userId: assignee.personId,
        branchId,
        appointmentDate: when.toISOString(),
        status: "scheduled",
        serviceIds: [service.id],
        products: productsPayload,
      },
      cookie,
    );
    const apt = (create.body ?? {}) as { id?: number };
    if (create.ok && apt.id) {
      createdIds.push(apt.id);
      createdLines.push(
        `${hour}:00 → ${assignee.name} · ${service.name} + prod · ~$${total.toFixed(2)} · id=${apt.id}`,
      );
    } else {
      createOk = false;
      createdLines.push(
        `${hour}:00 FAIL HTTP ${create.status} ${msgOf(create.body)}`,
      );
    }
  }

  emit({
    id: "create-appointments",
    title: `Agenda ${pickedHours.length} turnos (servicios + productos)`,
    ok: createOk && createdIds.length === pickedHours.length,
    lines: [
      `Valor aproximado servicios+productos: $${valueSum.toFixed(2)}`,
      ...createdLines.slice(0, 6),
    ],
  });

  const outsideHour =
    hours.bookingEndHour < 24 ? hours.bookingEndHour : hours.bookingStartHour - 1;
  const outside =
    outsideHour >= 0 && outsideHour <= 23
      ? outsideHour
      : (hours.bookingStartHour + 23) % 24;
  const rejectWhen = slotDate(dayOffset, outside);
  // Si outside cae dentro del rango (edge), forzar 1h antes del start o end+0
  if (
    rejectWhen.getHours() >= hours.bookingStartHour &&
    rejectWhen.getHours() < hours.bookingEndHour
  ) {
    rejectWhen.setHours(
      hours.bookingStartHour > 0 ? hours.bookingStartHour - 1 : hours.bookingEndHour,
      0,
      0,
      0,
    );
  }
  const reject = await postJson(
    `${baseUrl}/api/appointments`,
    {
      title: `Tour fuera horario ${stamp}`,
      description: "Debe rechazarse",
      customerId: customers[0].id,
      userId: personId,
      branchId,
      appointmentDate: rejectWhen.toISOString(),
      status: "scheduled",
      serviceIds: [services[0].id],
    },
    cookie,
  );
  emit({
    id: "reject-outside",
    title: "Rechaza turno fuera del rango de la dueña",
    ok: !reject.ok && (reject.status === 400 || reject.status === 500),
    lines: [
      `Intentó ${rejectWhen.getHours()}:00 (rango ${hours.bookingStartHour}–${hours.bookingEndHour})`,
      reject.ok
        ? `${c.red}API aceptó turno fuera de horario${c.reset}`
        : `Rechazado HTTP ${reject.status}: ${msgOf(reject.body)}`,
    ],
  });

  {
    const agenda = await getJson(
      `${baseUrl}/api/appointments?view=mine`,
      cookie,
    );
    const events = asArray(
      agenda.ok && agenda.body && typeof agenda.body === "object"
        ? ((agenda.body as { events?: unknown }).events ?? agenda.body)
        : agenda.body,
    ) as Array<{ id?: string; title?: string }>;
    const foundMine = createdIds.filter((id) =>
      events.some((e) => String(e.id) === String(id)),
    ).length;
    emit({
    id: "verify-agenda",
    title: "Verifica turnos en «mi agenda»",
    ok: agenda.ok,
    lines: [
      `Eventos en agenda: ${events.length}`,
      `De este tour visibles en mine: ${foundMine}/${createdIds.length}`,
      `${c.dim}(los asignados a compañeros aparecen en su agenda)${c.reset}`,
    ],
  });
  }

  // Deja los turnos como scheduled (no cancelar): así la dueña los ve en naranja/agendado.
  // Limpieza opcional: EMPLOYEE_TOUR_CLEANUP=1 borra al final del schedule-all (dueña).
  const cleanupMode = process.env.EMPLOYEE_TOUR_CLEANUP === "1";
  if (cleanupMode && createdIds.length > 0) {
    let cleanupOk = true;
    for (const id of createdIds) {
      const put = await putJson(
        `${baseUrl}/api/appointments/${id}`,
        {
          title: `Tour cancel ${stamp}`,
          description: "Limpieza bot",
          customerId: customers[0].id,
          userId: personId,
          branchId,
          appointmentDate: slotDate(dayOffset, hours.bookingStartHour).toISOString(),
          status: "cancelled",
          serviceIds: [services[0].id],
        },
        cookie,
      );
      if (!put.ok) cleanupOk = false;
    }
    emit({
      id: "cleanup",
      title: "Cancela turnos de prueba (CLEANUP=1)",
      ok: cleanupOk,
      lines: [`Cancelados: ${createdIds.length}`],
    });
  } else {
    emit({
      id: "keep-appointments",
      title: "Deja turnos agendados en la agenda",
      ok: createdIds.length > 0 || !createOk,
      lines: [
        `Quedan ${createdIds.length} turno(s) en estado scheduled`,
        `${c.dim}(para limpiar: EMPLOYEE_TOUR_CLEANUP=1)${c.reset}`,
      ],
    });
  }

  const logout = await postJson(`${baseUrl}/api/auth/logout`, {}, cookie);
  emit({
    id: "logout",
    title: "Cierra sesión",
    ok: logout.ok || logout.status === 200,
    lines: [`${employee.firstName} termina agenda de «${localName}».`],
  });

  if (!quiet) printFooter(scenes);
  if (!skipHistory) {
    finishEmployeeTour("schedule", scenes, { baseUrl, started, employee });
  }
  return { employee, scenes };
}

export async function runAllEmployeesSchedule() {
  const baseUrl = getSchedulyBaseUrl();
  console.log("");
  console.log(
    `${c.brightYellow}${c.bold}Tour Empleado · agenda TODOS (${EMPLOYEES.length}) · con horario dueña${c.reset}`,
  );
  console.log("");

  const started = Date.now();

  console.log(
    `${c.dim}1) Dueña define rango de agenda (10:00–16:00)…${c.reset}`,
  );
  const hoursSetup = await runOwnerAgendaHoursTour({
    leaveTourHours: true,
    startHour: 10,
    endHour: 16,
  });

  console.log("");
  console.log(
    `${c.dim}2) Empleados agendan en paralelo respetando el rango…${c.reset}`,
  );
  console.log("");

  const results = await Promise.all(
    EMPLOYEES.map((e, idx) =>
      runOneEmployeeSchedule(e, {
        quiet: true,
        skipHistory: true,
        // Desplaza el día por empleado para evitar choques de título/hora al cancelar
        dayOffset: 1 + (idx % 3),
      }),
    ),
  );

  for (const { employee, scenes } of results) {
    printHeader({
      name: `${employee.firstName} ${employee.firstLastName}`,
      role: "Empleado",
      business: "Andrea Guerrero Estética y Peluquería",
      place: `local ${employee.branchKey} · agenda`,
    });
    for (let i = 0; i < scenes.length; i++) {
      printScene(i + 1, scenes.length, scenes[i]);
    }
    printFooter(scenes);
  }

  if (hoursSetup?.original) {
    console.log(
      `${c.dim}3) Dueña restaura horario original…${c.reset}`,
    );
    const login = await postJson(`${baseUrl}/api/auth/login`, {
      username: AG_OWNER.username,
      password: AG_OWNER.password,
    });
    const cookie = extractSessionCookie(login.setCookie);
    if (cookie) {
      await putJson(
        `${baseUrl}/api/settings`,
        {
          businessName: hoursSetup.original.businessName,
          address: hoursSetup.original.address,
          bookingStartHour: hoursSetup.original.bookingStartHour,
          bookingEndHour: hoursSetup.original.bookingEndHour,
        },
        cookie,
      );
      await postJson(`${baseUrl}/api/auth/logout`, {}, cookie);
      console.log(
        `${c.green}Horario restaurado: ${hoursSetup.original.bookingStartHour}:00–${hoursSetup.original.bookingEndHour}:00${c.reset}`,
      );
    }
  }

  const ms = Date.now() - started;
  const subjects = results.map(({ employee, scenes }) => {
    const sum = summarizeScenes(scenes);
    return {
      username: employee.username,
      name: `${employee.firstName} ${employee.firstLastName}`,
      role: "employee",
      branchKey: employee.branchKey,
      ok: sum.ok,
      passed: sum.passed,
      failed: sum.failed,
      total: sum.total,
      scenes: scenesForHistory(scenes),
    };
  });
  const passed = subjects.reduce((n, s) => n + s.passed, 0);
  const failed = subjects.reduce((n, s) => n + s.failed, 0);
  const anyFail = subjects.some((s) => !s.ok);

  console.log("");
  console.log(
    `${c.bold}Resumen · ${EMPLOYEES.length} empleados · ${ms} ms${c.reset}`,
  );
  for (const t of subjects) {
    console.log(
      `  · ${t.name} (@${t.username}) · ${t.branchKey} · ${t.failed === 0 ? "OK" : `${t.failed} FAIL`} · ${t.passed}/${t.total}`,
    );
  }
  console.log(
    anyFail
      ? `${c.red}Hay fallos.${c.reset}`
      : `${c.green}Todos agendaron turnos (servicios+productos) dentro del horario de la dueña.${c.reset}`,
  );
  console.log("");

  saveTestHistory({
    tester: "employee-tour",
    mode: "schedule-all-parallel",
    baseUrl,
    durationMs: ms,
    ok: !anyFail,
    summary: { passed, failed, total: passed + failed },
    subjects,
    meta: {
      hours: hoursSetup?.active ?? null,
    },
  });
}

export async function runEmployeeScheduleTour(forced?: EmployeeSeed) {
  if (forced) {
    process.stdout.write(c.clear + c.show);
    await runOneEmployeeSchedule(forced, { quiet: false });
    return;
  }

  const picked = await pickEmployee({
    allowAll: true,
    title: "Agendar turnos · ¿qué Empleado? (uno o todos)",
  });
  if (picked.kind === "cancel") {
    console.log(`${c.dim}Cancelado.${c.reset}`);
    return;
  }
  process.stdout.write(c.clear + c.show);
  if (picked.kind === "all") {
    await runAllEmployeesSchedule();
    return;
  }
  await runOneEmployeeSchedule(picked.employee, { quiet: false });
}
