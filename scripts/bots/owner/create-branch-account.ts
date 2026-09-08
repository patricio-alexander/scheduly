/**
 * Tour Dueña · crea sucursal + cuenta Empleado vinculada + desactiva la cuenta demo.
 */
import { nowStamp } from "../../lib/menu-ui";
import {
  asArray,
  c,
  deleteJson,
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

export async function runOwnerCreateBranchAccountTour() {
  printOwnerHeader("Loja · crear local y cuenta");

  const auth = await loginAsOwner();
  if (!auth.ok) {
    finishOwnerTour(
      "create-branch-account-login-fail",
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
  const stamp = nowStamp().replace(/[: ]/g, "");
  const branchName = `Andrea Guerrero · Tour ${stamp.slice(-6)}`;

  const createBranch = await postJson(
    `${baseUrl}/api/branches`,
    {
      name: branchName,
      address: "Loja, Ecuador (local de prueba tour Dueña)",
      phone: "0994960155",
      city: "Loja",
      province: "Loja",
    },
    cookie,
  );
  const newBranch = (createBranch.body ?? {}) as {
    id?: number;
    name?: string;
  };
  scenes.push({
    id: "create-branch",
    title: "Crea una sucursal nueva",
    ok: createBranch.ok,
    lines: createBranch.ok
      ? [
          `Local creado: «${newBranch.name ?? branchName}»`,
          `id=${newBranch.id ?? "?"} · listo para vincular personal`,
        ]
      : [
          `No pudo crear · HTTP ${createBranch.status} ${msgOf(createBranch.body)}`,
        ],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  if (!createBranch.ok || !newBranch.id) {
    await logoutOwner(session, scenes, TOTAL);
    finishOwnerTour("create-branch-account", scenes, baseUrl, session.started);
    return;
  }

  const username = `emp_tour_${stamp.slice(-8)}`;
  const createUser = await postJson(
    `${baseUrl}/api/users`,
    {
      username,
      name: `Empleado Tour ${stamp.slice(-4)}`,
      email: `${username}@andreaguerrero.ec`,
      password: "12345678",
      roles: ["Empleado"],
      role: "Empleado",
      branchId: newBranch.id,
    },
    cookie,
  );
  const createdUser = (createUser.body ?? {}) as {
    id?: number;
    username?: string;
    branch?: { id?: number; name?: string } | null;
  };
  const linkedOk =
    createUser.ok &&
    (createdUser.branch?.id === newBranch.id ||
      createdUser.branch?.name === branchName);

  scenes.push({
    id: "create-account",
    title: "Crea cuenta Empleado y la vincula al local",
    ok: createUser.ok && linkedOk,
    lines: createUser.ok
      ? [
          `Cuenta: @${createdUser.username ?? username}`,
          `Rol: Empleado · local: ${createdUser.branch?.name ?? branchName}`,
          linkedOk
            ? `${c.green}Vínculo AccountBranch OK${c.reset}`
            : `${c.yellow}Cuenta creada pero el local no coincide${c.reset}`,
          `Password demo: 12345678`,
        ]
      : [
          `No pudo crear · HTTP ${createUser.status} ${msgOf(createUser.body)}`,
        ],
  });
  printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);

  // Verificar en listado withTeam
  {
    const res = await getJson(`${baseUrl}/api/branches?withTeam=1`, cookie);
    if (!res.ok) {
      scenes.push(failScene("verify-team", "Verifica equipo en el local", res));
    } else {
      const branches = asArray(res.body) as Array<{
        id: number;
        name: string;
        team?: Array<{ username?: string }>;
      }>;
      const b = branches.find((x) => x.id === newBranch.id);
      const inTeam = (b?.team ?? []).some((t) => t.username === username);
      scenes.push({
        id: "verify-team",
        title: "Verifica que la cuenta aparece en el equipo del local",
        ok: Boolean(b) && inTeam,
        lines: [
          b
            ? `Local «${b.name}» · equipo: ${(b.team ?? []).length}`
            : `No encontró el local creado`,
          inTeam
            ? `${c.green}@${username} está en el equipo${c.reset}`
            : `${c.red}@${username} no aparece en el equipo${c.reset}`,
        ],
      });
    }
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  if (createUser.ok && createdUser.id) {
    const deact = await deleteJson(
      `${baseUrl}/api/users/${createdUser.id}`,
      cookie,
    );
    scenes.push({
      id: "deactivate-account",
      title: "Desactiva la cuenta de prueba",
      ok: deact.ok,
      lines: deact.ok
        ? [`Cuenta @${username} quedó inactiva`]
        : [`No pudo desactivar · HTTP ${deact.status}`],
    });
    printScene(scenes.length, TOTAL, scenes[scenes.length - 1]);
  }

  await logoutOwner(session, scenes, TOTAL);
  finishOwnerTour("create-branch-account", scenes, baseUrl, session.started);
}
