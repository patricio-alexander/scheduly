/**
 * Navegación de Scheduly (independiente de EdDeli / Store / Tienda).
 * Misma lógica de negocio, menú y módulos propios.
 */
import type { ComponentType, SVGProps } from "react";
import { appRoutes } from "@/shared/utils/app-routes";
import House from "@gravity-ui/icons/House";
import Person from "@gravity-ui/icons/Person";
import Gear from "@gravity-ui/icons/Gear";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import Calendar from "@gravity-ui/icons/Calendar";
import Shield from "@gravity-ui/icons/Shield";
import Cube from "@gravity-ui/icons/Cube";
import Tag from "@gravity-ui/icons/Tag";
import ListCheck from "@gravity-ui/icons/ListCheck";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";
import ArrowDownToLine from "@gravity-ui/icons/ArrowDownToLine";
import Briefcase from "@gravity-ui/icons/Briefcase";
import Layers from "@gravity-ui/icons/Layers";
import Megaphone from "@gravity-ui/icons/Megaphone";
import CircleDollar from "@gravity-ui/icons/CircleDollar";
import ArrowRightFromSquare from "@gravity-ui/icons/ArrowRightFromSquare";
import Database from "@gravity-ui/icons/Database";
import Gift from "@gravity-ui/icons/Gift";
import LayoutHeaderCells from "@gravity-ui/icons/LayoutHeaderCells";
import Car from "@gravity-ui/icons/Car";
import HandCoins from "@gravity-ui/icons/CreditCard";
import Receipt from "@gravity-ui/icons/Receipt";
import DisplayPulse from "@gravity-ui/icons/DisplayPulse";

export type IconComponent = ComponentType<
  SVGProps<SVGSVGElement> & { width?: number; height?: number }
>;

export type NavItem = {
  href: string;
  label: string;
  employeeLabel?: string;
  branchAdminLabel?: string;
  icon: IconComponent;
  showBadge?: boolean;
  adminOnly?: boolean;
  ownerOnly?: boolean;
  branchAdminOnly?: boolean;
  employeeExperienceOnly?: boolean;
  /** Solo empleado puro (p. ej. Mi liquidación) */
  employeeOnly?: boolean;
  /** Solo rol Programador (logs / tester) */
  programmerOnly?: boolean;
  tourId?: string;
};

export type NavModule = {
  id: string;
  label: string;
  icon: IconComponent;
  entitlementKey: string;
  adminOnly?: boolean;
  ownerOnly?: boolean;
  employeeExperienceOnly?: boolean;
  programmerOnly?: boolean;
  /** Sin encabezado acordeón: ítems al nivel raíz del sidebar */
  flat?: boolean;
  items: NavItem[];
};

export const quickAccessItems: NavItem[] = [];

export const navModules: NavModule[] = [
  {
    id: "home",
    label: "Inicio",
    icon: House,
    entitlementKey: "operation",
    /** Visible para todos los roles, incluido Programador */
    flat: true,
    items: [
      {
        href: appRoutes.inicio,
        label: "Inicio",
        icon: House,
        tourId: "nav-inicio",
      },
      {
        href: appRoutes.dashboard,
        label: "Panel",
        icon: LayoutHeaderCells,
        tourId: "nav-dashboard",
        /** Programador también puede abrir el resumen */
      },
    ],
  },
  {
    id: "operation",
    label: "Operación",
    icon: Briefcase,
    entitlementKey: "operation",
    items: [
      {
        href: appRoutes.operation.agenda,
        label: "Agenda",
        icon: Calendar,
        tourId: "nav-agenda",
        employeeLabel: "Mi agenda",
        branchAdminLabel: "Agenda sucursal",
      },
      {
        href: `${appRoutes.operation.agenda}?view=mine`,
        label: "Mi agenda",
        icon: Person,
        branchAdminOnly: true,
      },
      {
        href: appRoutes.operation.services,
        label: "Servicios",
        icon: Gear,
        tourId: "nav-services",
      },
      {
        href: appRoutes.operation.cash,
        label: "Caja",
        icon: CircleDollar,
        tourId: "nav-cash",
      },
      {
        href: appRoutes.operation.shifts,
        label: "Turno",
        icon: ArrowRightFromSquare,
        tourId: "nav-shift",
      },
      {
        href: appRoutes.operation.tasks,
        label: "Tareas",
        icon: ListCheck,
        tourId: "nav-tasks",
      },
      {
        href: appRoutes.employee.myPayroll,
        label: "Mi liquidación",
        icon: CircleDollar,
        employeeOnly: true,
      },
      {
        href: appRoutes.operation.posReceipts,
        label: "Comprobantes POS",
        icon: Receipt,
        adminOnly: true,
      },
      {
        href: appRoutes.operation.shiftSupervision,
        label: "Supervisión caja",
        icon: ChartColumn,
        adminOnly: true,
      },
      {
        href: appRoutes.loyalty.hub,
        label: "Fidelización",
        icon: Gift,
        adminOnly: true,
      },
    ],
  },
  {
    id: "sales",
    label: "Ventas y Compras",
    icon: ShoppingCart,
    entitlementKey: "sales",
    items: [
      {
        href: appRoutes.sales.orders,
        label: "Pedidos",
        icon: ListCheck,
        adminOnly: true,
      },
      {
        href: appRoutes.sales.customers,
        label: "Clientes",
        icon: Person,
        tourId: "nav-customers",
      },
      {
        href: appRoutes.purchases.suppliers,
        label: "Proveedores",
        icon: Car,
        adminOnly: true,
      },
      {
        href: appRoutes.sales.salesHub,
        label: "Ventas",
        icon: ShoppingCart,
        tourId: "nav-register-sale",
        adminOnly: true,
      },
      {
        href: appRoutes.purchases.hub,
        label: "Compras",
        icon: ArrowDownToLine,
        adminOnly: true,
      },
    ],
  },
  {
    id: "finance",
    label: "Finanzas",
    icon: ChartColumn,
    entitlementKey: "finance",
    adminOnly: true,
    items: [
      {
        href: appRoutes.finance.transactions,
        label: "Finanzas",
        icon: ChartColumn,
        adminOnly: true,
      },
      {
        href: appRoutes.finance.collections,
        label: "Cobranzas",
        icon: HandCoins,
        adminOnly: true,
      },
      {
        href: appRoutes.finance.payroll,
        label: "Sueldos / comisiones",
        icon: CircleDollar,
        adminOnly: true,
      },
      {
        href: appRoutes.finance.payrollWeek,
        label: "Liquidación semanal",
        icon: CircleDollar,
        ownerOnly: true,
      },
      {
        href: appRoutes.finance.cashClose,
        label: "Cuadre de caja",
        icon: Receipt,
        adminOnly: true,
      },
      {
        href: appRoutes.finance.paymentMedia,
        label: "Medios de pago",
        icon: HandCoins,
        adminOnly: true,
      },
      {
        href: appRoutes.finance.recurringExpenses,
        label: "Gastos recurrentes",
        icon: Receipt,
        adminOnly: true,
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventario",
    icon: Boxes3,
    entitlementKey: "inventory",
    items: [
      {
        href: appRoutes.inventory.products,
        label: "Productos",
        icon: Boxes3,
        tourId: "nav-inventory",
      },
      {
        href: appRoutes.inventory.stores,
        label: "Sucursales / locales",
        icon: House,
        adminOnly: true,
        tourId: "nav-stores",
      },
      {
        href: appRoutes.inventory.movement,
        label: "Movimientos",
        icon: ArrowDownToLine,
        adminOnly: true,
      },
      {
        href: appRoutes.inventory.categories,
        label: "Categorías",
        icon: Tag,
        adminOnly: true,
      },
      {
        href: appRoutes.inventory.tierGroups,
        label: "Tramos",
        icon: LayoutHeaderCells,
        adminOnly: true,
      },
      {
        href: appRoutes.inventory.units,
        label: "Unidades",
        icon: Cube,
      },
      {
        href: appRoutes.inventory.batches,
        label: "Lotes y vencimientos",
        icon: Layers,
        adminOnly: true,
      },
      {
        href: appRoutes.inventory.value,
        label: "Inventario valorizado",
        icon: CircleDollar,
        adminOnly: true,
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    entitlementKey: "marketing",
    adminOnly: true,
    items: [
      {
        href: appRoutes.marketing.promotions,
        label: "Promociones",
        icon: Tag,
        adminOnly: true,
      },
      {
        href: appRoutes.marketing.catalog,
        label: "Catálogo config",
        icon: LayoutHeaderCells,
        adminOnly: true,
        tourId: "nav-catalog",
      },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    icon: Shield,
    entitlementKey: "admin",
    adminOnly: true,
    items: [
      {
        href: appRoutes.admin.accounts,
        label: "Cuentas",
        icon: Person,
        adminOnly: true,
      },
      {
        href: appRoutes.admin.roles,
        label: "Roles",
        icon: Shield,
        ownerOnly: true,
      },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    icon: Gear,
    entitlementKey: "system",
    ownerOnly: true,
    items: [
      {
        href: appRoutes.system.settings,
        label: "Configuración",
        icon: Gear,
        ownerOnly: true,
      },
      {
        href: appRoutes.system.backups,
        label: "Backups JSON",
        icon: Database,
        ownerOnly: true,
      },
      {
        href: appRoutes.system.logs,
        label: "Logs del sistema",
        icon: ListCheck,
        ownerOnly: true,
      },
      {
        href: appRoutes.system.tutorials,
        label: "Tutoriales",
        icon: DisplayPulse,
        ownerOnly: true,
        tourId: "nav-system-tutorials",
      },
      { href: appRoutes.system.profile, label: "Perfil", icon: Person },
      {
        href: appRoutes.system.donations,
        label: "Donaciones",
        icon: Gift,
        ownerOnly: true,
      },
    ],
  },
  {
    id: "dev",
    label: "Desarrollador",
    icon: ListCheck,
    entitlementKey: "system",
    programmerOnly: true,
    /** Ítems sueltos en sidebar (sin acordeón) */
    flat: true,
    items: [
      {
        href: appRoutes.system.profile,
        label: "Perfil",
        icon: Person,
        programmerOnly: true,
        tourId: "nav-dev-profile",
      },
      {
        href: appRoutes.system.logs,
        label: "Logs",
        icon: ListCheck,
        programmerOnly: true,
        tourId: "nav-dev-logs",
      },
      {
        href: appRoutes.admin.roles,
        label: "Roles",
        icon: Shield,
        programmerOnly: true,
        tourId: "nav-dev-roles",
      },
      {
        href: appRoutes.admin.users,
        label: "Usuarios",
        icon: Person,
        programmerOnly: true,
        tourId: "nav-dev-users",
      },
      {
        href: appRoutes.admin.accounts,
        label: "Cuentas",
        icon: Person,
        programmerOnly: true,
        tourId: "nav-dev-accounts",
      },
      {
        href: appRoutes.system.tutorials,
        label: "Tutoriales",
        icon: DisplayPulse,
        programmerOnly: true,
        tourId: "nav-dev-tutorials",
      },
      {
        href: appRoutes.system.settings,
        label: "Configuración",
        icon: Gear,
        programmerOnly: true,
        tourId: "nav-dev-settings",
      },
      {
        href: appRoutes.system.donations,
        label: "Donaciones",
        icon: Gift,
        programmerOnly: true,
      },
      {
        href: appRoutes.system.backups,
        label: "Backups",
        icon: Database,
        programmerOnly: true,
      },
    ],
  },
];
