/**
 * Tour Dueña · define el rango horario de agenda (apertura–cierre) y restaura.
 */
import {
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

type SettingsHours = {
  businessName?: string;
  address?: string;
  bookingStartHour?: number;
  bookingEndHour?: number;
};

export async function runOwnerAgendaHoursTour(opts?: {
  /** Si true, deja el rango de tour activo (no restaura). */
  leaveTourHours?: boolean;
  startHour?: number;
  endHour?: number;
}) {
  printOwnerHeader("Loja · horario de agenda");

  const auth = await loginAsOwner();
  if (!auth.ok) {
    finishOwnerTour(
      "agenda-hours-login-fail",
      auth.scenes,
      auth.baseUrl,
      auth.started,
    );
    return null;
  }

  const { session } = auth;
  const scenes: StoryScene[] = [...auth.scenes];
  const TOTAL = 7;
  const { baseUrl, cookie } = session;

  const originalRes = await getJson(`${baseUrl}/api/settings`, cookie);
  const original = (originalRes.body ?? {}) as SettingsHours;
  scenes.push({
    id: "hours-get",
    title: "Lee horario de agenda actual",
    ok: originalRes.ok,
    lines: originalRes.ok
      ? [
          `Rango: ${c.bold}${original.bookingStartHour ?? "?"}:00–${original.bookingEndHour ?? "?"}:00${c.reset}`,
          `Negocio: ${original.businessName ?? "—"}`,
        ]
      : [`HTTP ${originalRes.status} ${msgOf(originalRes.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  if (!originalRes.ok) {
    await logoutOwner(session, scenes, TOTAL);
    finishOwnerTour("agenda-hours", scenes, baseUrl, session.started);
    return null;
  }

  const tourStart = opts?.startHour ?? 10;
  const tourEnd = opts?.endHour ?? 16;

  const put = await putJson(
    `${baseUrl}/api/settings`,
    {
      businessName: original.businessName,
      address: original.address ?? "",
      bookingStartHour: tourStart,
      bookingEndHour: tourEnd,
    },
    cookie,
  );
  const after = (put.body ?? {}) as SettingsHours;
  scenes.push({
    id: "hours-set",
    title: "Define rango de agenda (dueña)",
    ok:
      put.ok &&
      after.bookingStartHour === tourStart &&
      after.bookingEndHour === tourEnd,
    lines: put.ok
      ? [
          `Nuevo rango: ${tourStart}:00–${tourEnd}:00`,
          `${c.green}Empleados deben agendar solo dentro de este horario${c.reset}`,
        ]
      : [`HTTP ${put.status} ${msgOf(put.body)}`],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  const verify = await getJson(`${baseUrl}/api/settings`, cookie);
  const verified = (verify.body ?? {}) as SettingsHours;
  scenes.push({
    id: "hours-verify",
    title: "Verifica horario guardado",
    ok:
      verify.ok &&
      verified.bookingStartHour === tourStart &&
      verified.bookingEndHour === tourEnd,
    lines: [
      `GET: ${verified.bookingStartHour}:00–${verified.bookingEndHour}:00`,
    ],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  if (!opts?.leaveTourHours) {
    const restore = await putJson(
      `${baseUrl}/api/settings`,
      {
        businessName: original.businessName,
        address: original.address ?? "",
        bookingStartHour: original.bookingStartHour ?? 9,
        bookingEndHour: original.bookingEndHour ?? 18,
      },
      cookie,
    );
    const restored = (restore.body ?? {}) as SettingsHours;
    scenes.push({
      id: "hours-restore",
      title: "Restaura horario original",
      ok: restore.ok,
      lines: restore.ok
        ? [
            `Restaurado: ${restored.bookingStartHour}:00–${restored.bookingEndHour}:00`,
          ]
        : [`HTTP ${restore.status} ${msgOf(restore.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  } else {
    scenes.push({
      id: "hours-keep",
      title: "Deja el rango activo para el tour empleados",
      ok: true,
      lines: [
        `Activo: ${tourStart}:00–${tourEnd}:00`,
        `${c.dim}(no se restaura; el tour de agenda lo usará)${c.reset}`,
      ],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  await logoutOwner(session, scenes, TOTAL);
  finishOwnerTour("agenda-hours", scenes, baseUrl, session.started);

  return {
    original: {
      bookingStartHour: original.bookingStartHour ?? 9,
      bookingEndHour: original.bookingEndHour ?? 18,
      businessName: original.businessName,
      address: original.address ?? "",
    },
    active: {
      bookingStartHour: opts?.leaveTourHours
        ? tourStart
        : (original.bookingStartHour ?? 9),
      bookingEndHour: opts?.leaveTourHours
        ? tourEnd
        : (original.bookingEndHour ?? 18),
    },
  };
}
