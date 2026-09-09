import { appRoutes } from "@/shared/utils/app-routes";
import type { TourSequence } from "./types";

/**
 * Playlists multi-módulo reutilizables.
 * - demo: datos falsos (gates entity/branches con prepareTour)
 * - live: misma ruta pero el gate/orquestador usa datos reales cuando aplica
 *
 * Ampliar aquí a medida que se cableen más módulos a la corrida.
 */
export const TOUR_SEQUENCES: TourSequence[] = [
  {
    id: "owner-onboarding-demo",
    title: "Alta inicial (demo)",
    description:
      "Recorre roles → cuentas → clientes → productos con datos de prueba (sin persistir).",
    defaultMode: "demo",
    steps: [
      {
        id: "roles",
        route: appRoutes.admin.roles,
        tourId: "roles-create",
        label: "Roles",
        settleMs: 700,
      },
      {
        id: "accounts",
        route: appRoutes.admin.accounts,
        tourId: "accounts-create",
        label: "Cuentas",
        settleMs: 700,
      },
      {
        id: "customers",
        route: appRoutes.sales.customers,
        tourId: "customers-create",
        label: "Clientes",
        settleMs: 700,
      },
      {
        id: "products",
        route: appRoutes.inventory.products,
        tourId: "products-create",
        label: "Productos",
        settleMs: 700,
      },
    ],
  },
  {
    id: "caja-ops-guide",
    title: "Operación de caja (guía)",
    description: "Guía del POS y accesos relacionados sin mutar datos.",
    defaultMode: "guide",
    steps: [
      {
        id: "cash",
        route: appRoutes.operation.cash,
        tourId: "cash",
        label: "Caja",
        settleMs: 800,
      },
      {
        id: "shifts",
        route: appRoutes.operation.shifts,
        tourId: "shifts",
        label: "Turno",
        settleMs: 700,
      },
    ],
  },
];

export function getTourSequence(id: string): TourSequence | undefined {
  return TOUR_SEQUENCES.find((s) => s.id === id);
}

export const TUTORIAL_SEQUENCES_CATALOG = TOUR_SEQUENCES.map((s) => ({
  id: s.id,
  title: s.title,
  description: s.description,
}));
