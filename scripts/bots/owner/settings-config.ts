/**
 * Tour Dueña · configura nombre, colores y flags operativos (activa/desactiva) y restaura.
 */
import {
  c,
  finishOwnerTour,
  getJson,
  loginAsOwner,
  logoutOwner,
  msgOf,
  patchJson,
  printOwnerHeader,
  printScene,
  putJson,
  type StoryScene,
} from "./shared";

type SettingsBody = {
  businessName?: string;
  address?: string;
  ruc?: string;
  tradeName?: string;
  obligationAccounting?: boolean;
  accentColor?: string;
  successColor?: string;
  warningColor?: string;
  dangerColor?: string;
  operationFlags?: Record<string, boolean>;
};

export async function runOwnerSettingsTour() {
  printOwnerHeader("Loja · configuración del negocio");

  const auth = await loginAsOwner();
  if (!auth.ok) {
    finishOwnerTour(
      "settings-login-fail",
      auth.scenes,
      auth.baseUrl,
      auth.started,
    );
    return;
  }

  const { session } = auth;
  const scenes: StoryScene[] = [...auth.scenes];
  const TOTAL = 10;
  const { baseUrl, cookie } = session;

  const originalRes = await getJson(`${baseUrl}/api/settings`, cookie);
  if (!originalRes.ok) {
    scenes.push({
      id: "settings-get",
      title: "Lee configuración actual",
      ok: false,
      lines: [`HTTP ${originalRes.status} ${msgOf(originalRes.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
    await logoutOwner(session, scenes, TOTAL);
    finishOwnerTour("settings", scenes, baseUrl, session.started);
    return;
  }

  const original = (originalRes.body ?? {}) as SettingsBody;
  scenes.push({
    id: "settings-get",
    title: "Lee configuración actual",
    ok: true,
    lines: [
      `Nombre: ${original.businessName ?? "—"}`,
      `Accent: ${original.accentColor ?? "—"} · success: ${original.successColor ?? "—"}`,
      `Flags cargados: ${Object.keys(original.operationFlags ?? {}).length}`,
    ],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  const tourName = `${original.businessName ?? "Scheduly"} · Tour CFG`;
  const tourColors = {
    accentColor: "#0EA5E9",
    successColor: "#16A34A",
    warningColor: "#F59E0B",
    dangerColor: "#DC2626",
  };

  const flagsOff = {
    ...(original.operationFlags ?? {}),
    showPublicCatalog: false,
    showPublicBranches: false,
    receiptShowBarcode: false,
    cajaAllowCreateProductFromSelect: false,
  };
  const flagsOn = {
    ...(original.operationFlags ?? {}),
    showPublicCatalog: true,
    showPublicBranches: true,
    receiptShowBarcode: true,
    cajaAllowCreateProductFromSelect: true,
  };

  // 1) Cambiar nombre + colores + flags OFF
  {
    const put = await putJson(
      `${baseUrl}/api/settings`,
      {
        businessName: tourName,
        address: original.address ?? "Loja, Ecuador",
        ruc: original.ruc,
        tradeName: original.tradeName,
        obligationAccounting: original.obligationAccounting,
        ...tourColors,
        operationFlags: flagsOff,
      },
      cookie,
    );
    const body = (put.body ?? {}) as SettingsBody;
    const nameOk = put.ok && body.businessName === tourName;
    const colorOk = put.ok && body.accentColor === tourColors.accentColor;
    const flagOk =
      put.ok &&
      body.operationFlags?.showPublicCatalog === false &&
      body.operationFlags?.cajaAllowCreateProductFromSelect === false;
    scenes.push({
      id: "settings-put-tour",
      title: "Cambia nombre, colores y desactiva flags",
      ok: nameOk && colorOk && flagOk,
      lines: put.ok
        ? [
            `Nombre → «${body.businessName}»`,
            `Accent → ${body.accentColor}`,
            `showPublicCatalog=${String(body.operationFlags?.showPublicCatalog)} · createProductFromSelect=${String(body.operationFlags?.cajaAllowCreateProductFromSelect)}`,
          ]
        : [`HTTP ${put.status} ${msgOf(put.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  // 2) Verificar GET
  {
    const get = await getJson(`${baseUrl}/api/settings`, cookie);
    const body = (get.body ?? {}) as SettingsBody;
    scenes.push({
      id: "settings-verify-tour",
      title: "Verifica GET tras el cambio",
      ok:
        get.ok &&
        body.businessName === tourName &&
        body.operationFlags?.showPublicCatalog === false,
      lines: get.ok
        ? [
            `GET nombre: ${body.businessName}`,
            `GET showPublicCatalog: ${String(body.operationFlags?.showPublicCatalog)}`,
          ]
        : [`HTTP ${get.status}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  // 3) Activar flags de nuevo
  {
    const put = await putJson(
      `${baseUrl}/api/settings`,
      {
        businessName: tourName,
        address: original.address ?? "Loja, Ecuador",
        ...tourColors,
        operationFlags: flagsOn,
      },
      cookie,
    );
    const body = (put.body ?? {}) as SettingsBody;
    scenes.push({
      id: "settings-flags-on",
      title: "Reactiva flags operativos",
      ok:
        put.ok &&
        body.operationFlags?.showPublicCatalog === true &&
        body.operationFlags?.cajaAllowCreateProductFromSelect === true,
      lines: put.ok
        ? [
            `showPublicCatalog=${String(body.operationFlags?.showPublicCatalog)}`,
            `showPublicBranches=${String(body.operationFlags?.showPublicBranches)}`,
            `cajaAllowCreateProductFromSelect=${String(body.operationFlags?.cajaAllowCreateProductFromSelect)}`,
            `receiptShowBarcode=${String(body.operationFlags?.receiptShowBarcode)}`,
          ]
        : [`HTTP ${put.status} ${msgOf(put.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  // 4) PATCH theme colors
  {
    const patch = await patchJson(
      `${baseUrl}/api/settings/theme`,
      {
        accentColor: "#D4AF37",
        successColor: "#22C55E",
        warningColor: "#F0B429",
        dangerColor: "#F04438",
      },
      cookie,
    );
    const body = (patch.body ?? {}) as SettingsBody;
    scenes.push({
      id: "settings-theme-patch",
      title: "Cambia solo colores (PATCH /theme)",
      ok: patch.ok,
      lines: patch.ok
        ? [
            `Accent: ${body.accentColor}`,
            `Success: ${body.successColor}`,
            `Warning: ${body.warningColor}`,
            `Danger: ${body.dangerColor}`,
          ]
        : [`HTTP ${patch.status} ${msgOf(patch.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  // 5) Restaurar original
  {
    const put = await putJson(
      `${baseUrl}/api/settings`,
      {
        businessName: original.businessName,
        address: original.address ?? "",
        ruc: original.ruc,
        tradeName: original.tradeName,
        obligationAccounting: original.obligationAccounting,
        accentColor: original.accentColor,
        successColor: original.successColor,
        warningColor: original.warningColor,
        dangerColor: original.dangerColor,
        operationFlags: original.operationFlags,
      },
      cookie,
    );
    const body = (put.body ?? {}) as SettingsBody;
    const restored =
      put.ok && body.businessName === original.businessName;
    scenes.push({
      id: "settings-restore",
      title: "Restaura configuración original",
      ok: restored,
      lines: put.ok
        ? [
            `Nombre restaurado: «${body.businessName}»`,
            `Accent: ${body.accentColor}`,
            restored
              ? `${c.green}Config OK · tour no dejó cambios permanentes${c.reset}`
              : `${c.yellow}Restauró parcialmente${c.reset}`,
          ]
        : [`HTTP ${put.status} ${msgOf(put.body)}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  await logoutOwner(session, scenes, TOTAL);
  finishOwnerTour("settings", scenes, baseUrl, session.started);
}
