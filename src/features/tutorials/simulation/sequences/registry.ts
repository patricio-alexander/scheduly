import { appRoutes } from "@/shared/utils/app-routes";
import type { TourSequence } from "./types";

/**
 * Playlists multi-módulo por rol (hub Tutoriales → Simulación de módulos).
 */
export const TOUR_SEQUENCES: TourSequence[] = [
  {
    id: "owner-ops-demo",
    title: "Dueña · negocio y cierre",
    description:
      "Usuarios → promociones → fidelización → liquidación semanal (sin crear roles).",
    defaultMode: "demo",
    steps: [
      {
        id: "accounts",
        route: appRoutes.admin.accounts,
        tourId: "accounts-create",
        label: "Usuarios",
        settleMs: 700,
      },
      {
        id: "promotions",
        route: appRoutes.marketing.promotions,
        tourId: "promotions",
        label: "Promociones",
        settleMs: 700,
      },
      {
        id: "loyalty",
        route: appRoutes.loyalty.hub,
        tourId: "loyalty",
        label: "Fidelización",
        settleMs: 700,
      },
      {
        id: "payroll",
        route: appRoutes.finance.payrollWeek,
        tourId: "payroll-week",
        label: "Liquidación",
        settleMs: 800,
      },
    ],
  },
  {
    id: "admin-ops-demo",
    title: "Admin de sucursal · operación del local",
    description:
      "Empleados del local → agenda (citas para su equipo) → caja / turno.",
    defaultMode: "demo",
    steps: [
      {
        id: "accounts",
        route: appRoutes.admin.accounts,
        tourId: "accounts-create",
        label: "Empleados",
        settleMs: 700,
      },
      {
        id: "agenda",
        route: appRoutes.operation.agenda,
        tourId: "agenda",
        label: "Agenda",
        settleMs: 800,
      },
      {
        id: "cash",
        route: appRoutes.operation.cash,
        tourId: "cash",
        label: "Caja",
        settleMs: 700,
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
  {
    id: "employee-ops-demo",
    title: "Empleado · jornada y comisiones",
    description:
      "Agenda propia → mi día / atender → mi liquidación (aceptar valores y confirmar cobro).",
    defaultMode: "demo",
    steps: [
      {
        id: "agenda",
        route: appRoutes.operation.agenda,
        tourId: "agenda",
        label: "Mi agenda",
        settleMs: 800,
      },
      {
        id: "my-day",
        route: appRoutes.employee.myDay,
        tourId: "employee-day",
        label: "Mi día",
        settleMs: 700,
      },
      {
        id: "my-payroll",
        route: appRoutes.employee.myPayroll,
        tourId: "employee-payroll",
        label: "Mi liquidación",
        settleMs: 800,
      },
    ],
  },
  {
    id: "owner-onboarding-demo",
    title: "Alta inicial (legacy)",
    description:
      "Recorre roles → cuentas → clientes → productos con datos de prueba.",
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
        label: "Punto de venta",
        settleMs: 800,
      },
      {
        id: "shifts",
        route: appRoutes.operation.shifts,
        tourId: "shifts",
        label: "Caja",
        settleMs: 700,
      },
    ],
  },
];

export function getTourSequence(id: string): TourSequence | undefined {
  return TOUR_SEQUENCES.find((s) => s.id === id);
}

/** Catálogo visible en hub (sin legacy de alta inicial). */
export const TUTORIAL_SEQUENCES_CATALOG = TOUR_SEQUENCES.filter(
  (s) =>
    s.id === "owner-ops-demo" ||
    s.id === "admin-ops-demo" ||
    s.id === "employee-ops-demo",
).map((s) => ({
  id: s.id,
  title: s.title,
  description: s.description,
}));
