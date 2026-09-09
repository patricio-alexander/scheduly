/** Personas de prueba para el tutorial de equipo (no se guardan). */
export const BRANCHES_TEAM_DEMO = {
  available: [
    {
      id: -901,
      username: "lucia.demo",
      name: "Lucía Demo",
      role: "Empleado",
      isActive: true,
      currentBranchId: null as number | null,
      currentBranchName: null as string | null,
      unlinked: true,
    },
    {
      id: -902,
      username: "marco.demo",
      name: "Marco Demo",
      role: "Administrador",
      isActive: true,
      currentBranchId: null as number | null,
      currentBranchName: "Otro local (demo)" as string | null,
      unlinked: false,
    },
  ],
  teamA: [
    {
      id: -801,
      username: "sofia.demo",
      name: "Sofía Demo",
      role: "Administrador",
      isActive: true,
      isPrimary: true,
      isManager: true,
    },
    {
      id: -802,
      username: "diego.demo",
      name: "Diego Demo",
      role: "Empleado",
      isActive: true,
      isPrimary: true,
      isManager: false,
    },
  ],
  teamB: [
    {
      id: -803,
      username: "valentina.demo",
      name: "Valentina Demo",
      role: "Administrador",
      isActive: true,
      isPrimary: true,
      isManager: true,
    },
    {
      id: -804,
      username: "andre.demo",
      name: "André Demo",
      role: "Empleado",
      isActive: true,
      isPrimary: true,
      isManager: false,
    },
  ],
} as const;

/** Local de prueba para el tutorial principal (crear desde vacío). */
export const BRANCHES_OVERVIEW_DEMO_BRANCH = {
  id: -700,
  name: "Local Demo Centro",
  code: "DEMO",
  address: "Av. Demo 123, Loja",
  phone: "0990000000",
  isMain: true,
  locationKind: "branch" as string | null,
  isActive: true,
  managerAccountId: -801 as number | null,
  teamCount: 2,
  team: BRANCHES_TEAM_DEMO.teamA.map((m) => ({ ...m })),
};

export const BRANCHES_OVERVIEW_DEMO_FORM = {
  name: "Local Demo Centro",
  address: "Av. Demo 123, Loja",
  phone: "0990000000",
};

export function isBranchesTeamDemoId(id: number) {
  return id <= -700;
}
