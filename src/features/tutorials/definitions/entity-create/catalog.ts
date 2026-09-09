import {
  buildEntityCreateTourSteps,
  buildEntityFormTourSteps,
  type EntityCreateTourConfig,
} from "./builder";
import type { SchedulyTourStep } from "../../core/run-tour";

/** Demo data (solo UI; no se persiste en API). */
export const ENTITY_CREATE_DEMOS = {
  roles: { name: "Recepción demo" },
  categories: {
    name: "Cuidado demo",
    description: "Categoría de prueba del tutorial",
  },
  units: {
    name: "Mililitro demo",
    abbreviation: "mld",
    description: "Unidad de prueba",
  },
  customers: {
    name: "Ana",
    lastnames: "Pérez Demo",
    phone: "0990001111",
    email: "ana.demo@scheduly.test",
  },
  suppliers: {
    name: "Distribuidora Demo",
    phone: "0987654321",
    email: "demo@proveedor.test",
  },
  services: {
    name: "Corte demo",
    price: 15,
    durationMinutes: 30,
    commissionPct: 15,
  },
  products: {
    name: "Shampoo demo",
    price: 12,
    stock: 10,
    commissionPct: 8,
  },
  tasks: {
    title: "Reponer insumos demo",
    description: "Tarea de prueba del tutorial",
  },
  accounts: {
    username: "demo.empleado",
    name: "Empleado Demo",
    email: "empleado.demo@scheduly.test",
    password: "Demo1234",
  },
} as const;

const ROLES_CFG: EntityCreateTourConfig = {
  tourId: "roles-create",
  prefix: "roles",
  moduleId: "roles",
  helpTitle: "Tutorial de Roles",
  helpDescription:
    "Simulamos empezar sin roles. Vas a crear uno de prueba y verlo en la lista. Nada se guarda de verdad.",
  emptyTitle: "Sin roles",
  emptyDescription: "Así se ve al inicio. Hay que crear el primer rol.",
  createTitle: "Agregar rol",
  createDescription: "Abrimos el formulario para crear el rol.",
  listTitle: "Listo: tu rol",
  listDescription: "Aquí quedan los roles del sistema.",
  fields: [
    {
      key: "name",
      label: "Nombre",
      description: "Escribe el nombre del rol.",
      value: ENTITY_CREATE_DEMOS.roles.name,
      msPerChar: 50,
    },
  ],
};

const CATEGORIES_CFG: EntityCreateTourConfig = {
  tourId: "categories-create",
  prefix: "categories",
  moduleId: "categories",
  helpTitle: "Tutorial de Categorías",
  helpDescription:
    "Simulamos empezar sin categorías. Creas una de prueba y la ves en la lista. Nada se guarda de verdad.",
  emptyTitle: "Sin categorías",
  emptyDescription: "Así se ve al inicio. Organiza productos con categorías.",
  createTitle: "Agregar categoría",
  createDescription: "Abrimos el formulario.",
  listTitle: "Listo: tu categoría",
  listDescription: "Las categorías agrupan productos del inventario.",
  fields: [
    {
      key: "name",
      label: "Nombre",
      description: "Nombre de la categoría.",
      value: ENTITY_CREATE_DEMOS.categories.name,
    },
    {
      key: "description",
      label: "Descripción",
      description: "Una breve descripción (opcional).",
      value: ENTITY_CREATE_DEMOS.categories.description,
      control: "textarea",
      msPerChar: 28,
    },
  ],
};

const UNITS_CFG: EntityCreateTourConfig = {
  tourId: "units-create",
  prefix: "units",
  moduleId: "units",
  helpTitle: "Tutorial de Unidades",
  helpDescription:
    "Simulamos empezar sin unidades. Creas una de prueba y la ves en la lista. Nada se guarda de verdad.",
  emptyTitle: "Sin unidades",
  emptyDescription: "Así se ve al inicio. Define ml, L, und, etc.",
  createTitle: "Agregar unidad",
  createDescription: "Abrimos el formulario.",
  listTitle: "Listo: tu unidad",
  listDescription: "Las unidades se usan en productos e inventario.",
  fields: [
    {
      key: "name",
      label: "Nombre",
      description: "Nombre de la unidad.",
      value: ENTITY_CREATE_DEMOS.units.name,
    },
    {
      key: "abbreviation",
      label: "Abreviatura",
      description: "Código corto (ml, L, und…).",
      value: ENTITY_CREATE_DEMOS.units.abbreviation,
      msPerChar: 60,
    },
  ],
};

const CUSTOMERS_CFG: EntityCreateTourConfig = {
  tourId: "customers-create",
  prefix: "customers",
  moduleId: "customers",
  helpTitle: "Tutorial de Clientes",
  helpDescription:
    "Simulamos empezar sin clientes. Creas uno de prueba y lo ves en la lista. Nada se guarda de verdad.",
  emptyTitle: "Sin clientes",
  emptyDescription: "Así se ve al inicio. Registra tu primera ficha.",
  createTitle: "Agregar cliente",
  createDescription: "Abrimos el formulario de cliente.",
  listTitle: "Listo: tu cliente",
  listDescription: "Los clientes se usan al agendar y vender.",
  fields: [
    {
      key: "name",
      label: "Nombre",
      description: "Nombre del cliente.",
      value: ENTITY_CREATE_DEMOS.customers.name,
    },
    {
      key: "lastnames",
      label: "Apellidos",
      description: "Apellidos del cliente.",
      value: ENTITY_CREATE_DEMOS.customers.lastnames,
    },
    {
      key: "phone",
      label: "Teléfono",
      description: "Teléfono de contacto.",
      value: ENTITY_CREATE_DEMOS.customers.phone,
      msPerChar: 40,
    },
    {
      key: "email",
      label: "Correo",
      description: "Correo electrónico.",
      value: ENTITY_CREATE_DEMOS.customers.email,
      msPerChar: 32,
    },
  ],
};

const SUPPLIERS_CFG: EntityCreateTourConfig = {
  tourId: "suppliers-create",
  prefix: "suppliers",
  moduleId: "suppliers",
  helpTitle: "Tutorial de Proveedores",
  helpDescription:
    "Simulamos empezar sin proveedores. Creas uno de prueba y lo ves en la lista. Nada se guarda de verdad.",
  emptyTitle: "Sin proveedores",
  emptyDescription: "Así se ve al inicio. Agrega tu primer proveedor.",
  createTitle: "Agregar proveedor",
  createDescription: "Abrimos el formulario.",
  listTitle: "Listo: tu proveedor",
  listDescription: "Los proveedores se usan al registrar compras.",
  fields: [
    {
      key: "name",
      label: "Nombre",
      description: "Nombre del proveedor.",
      value: ENTITY_CREATE_DEMOS.suppliers.name,
    },
    {
      key: "phone",
      label: "Teléfono",
      description: "Teléfono de contacto.",
      value: ENTITY_CREATE_DEMOS.suppliers.phone,
      msPerChar: 40,
    },
    {
      key: "email",
      label: "Correo",
      description: "Correo del proveedor.",
      value: ENTITY_CREATE_DEMOS.suppliers.email,
      msPerChar: 32,
    },
  ],
};

const SERVICES_CFG: EntityCreateTourConfig = {
  tourId: "services-create",
  prefix: "services",
  moduleId: "services",
  helpTitle: "Tutorial de Servicios",
  helpDescription:
    "Simulamos empezar sin servicios. Creas uno de prueba con todos los campos y lo ves en la lista. Nada se guarda de verdad.",
  emptyTitle: "Sin servicios",
  emptyDescription: "Así se ve al inicio. Define lo que ofreces a clientes.",
  createTitle: "Agregar servicio",
  createDescription: "Abrimos el formulario.",
  listTitle: "Listo: tu servicio",
  listDescription: "Los servicios se agendan en la agenda.",
  fields: [
    {
      key: "name",
      label: "Nombre",
      description: "Nombre del servicio que verán al agendar.",
      value: ENTITY_CREATE_DEMOS.services.name,
    },
    {
      key: "price",
      label: "Precio",
      description: "Cuánto cobra el negocio por este servicio.",
      value: String(ENTITY_CREATE_DEMOS.services.price),
      msPerChar: 70,
    },
    {
      key: "duration",
      label: "Duración",
      description: "Minutos que ocupa en la agenda.",
      value: String(ENTITY_CREATE_DEMOS.services.durationMinutes),
      msPerChar: 70,
    },
    {
      key: "commission",
      label: "Comisión %",
      description: "Porcentaje que recibe el estilista por realizarlo.",
      value: String(ENTITY_CREATE_DEMOS.services.commissionPct),
      msPerChar: 70,
    },
  ],
};

const PRODUCTS_CFG: EntityCreateTourConfig = {
  tourId: "products-create",
  prefix: "products",
  moduleId: "products",
  helpTitle: "Tutorial de Productos",
  helpDescription:
    "Simulamos empezar sin productos. Completas nombre, categoría, unidad, precio, comisión y stock. Nada se guarda de verdad.",
  emptyTitle: "Sin productos",
  emptyDescription: "Así se ve al inicio. Crea el primer producto del catálogo.",
  createTitle: "Agregar producto",
  createDescription: "Abrimos el formulario.",
  listTitle: "Listo: tu producto",
  listDescription: "El stock se descuenta al vender o usar en turnos.",
  fields: [
    {
      key: "name",
      label: "Nombre",
      description: "Nombre del producto en el catálogo.",
      value: ENTITY_CREATE_DEMOS.products.name,
    },
    {
      key: "category",
      label: "Categoría",
      description: "Agrupa el producto (opcional). Elige una de la lista.",
      demo: "pickFirst",
      value: "",
    },
    {
      key: "unit",
      label: "Unidad",
      description: "Unidad de medida (ml, L, und…). Elige una de la lista.",
      demo: "pickFirst",
      value: "",
    },
    {
      key: "price",
      label: "Precio",
      description: "Precio de venta al cliente.",
      value: String(ENTITY_CREATE_DEMOS.products.price),
      msPerChar: 60,
    },
    {
      key: "commission",
      label: "Comisión %",
      description:
        "Comisión del empleado. Pon 0 para heredar el % de la categoría.",
      value: String(ENTITY_CREATE_DEMOS.products.commissionPct),
      msPerChar: 70,
    },
    {
      key: "stock",
      label: "Stock",
      description: "Cantidad disponible en inventario.",
      value: String(ENTITY_CREATE_DEMOS.products.stock),
      msPerChar: 70,
    },
  ],
};

const TASKS_CFG: EntityCreateTourConfig = {
  tourId: "tasks-create",
  prefix: "tasks",
  moduleId: "tasks",
  helpTitle: "Tutorial de Tareas",
  helpDescription:
    "Simulamos empezar sin tareas. Creas una de prueba y la ves en el tablero. Nada se guarda de verdad.",
  emptyTitle: "Sin tareas",
  emptyDescription: "Así se ve al inicio. Crea la primera tarea del equipo.",
  createTitle: "Nueva tarea",
  createDescription: "Abrimos el formulario.",
  listTitle: "Listo: tu tarea",
  listDescription: "El tablero organiza Por hacer, En progreso y Hecho.",
  fields: [
    {
      key: "title",
      label: "Título",
      description: "Título de la tarea.",
      value: ENTITY_CREATE_DEMOS.tasks.title,
    },
    {
      key: "description",
      label: "Descripción",
      description: "Detalle breve (opcional).",
      value: ENTITY_CREATE_DEMOS.tasks.description,
      control: "textarea",
      msPerChar: 28,
    },
  ],
};

const ACCOUNTS_CFG: EntityCreateTourConfig = {
  tourId: "accounts-create",
  prefix: "accounts",
  moduleId: "accounts",
  helpTitle: "Tutorial de Cuentas",
  helpDescription:
    "Simulamos empezar sin cuentas. Creas un empleado de prueba y lo ves en la lista. Nada se guarda de verdad.",
  emptyTitle: "Sin cuentas",
  emptyDescription: "Así se ve al inicio. Da de alta al primer usuario.",
  createTitle: "Nueva cuenta",
  createDescription: "Abrimos el formulario de usuario.",
  listTitle: "Listo: tu cuenta",
  listDescription: "Aquí administras accesos del equipo.",
  fields: [
    {
      key: "username",
      label: "Usuario",
      description: "Nombre de usuario para iniciar sesión.",
      value: ENTITY_CREATE_DEMOS.accounts.username,
      msPerChar: 40,
    },
    {
      key: "name",
      label: "Nombre",
      description: "Nombre visible del empleado.",
      value: ENTITY_CREATE_DEMOS.accounts.name,
    },
    {
      key: "email",
      label: "Correo",
      description: "Correo de la cuenta.",
      value: ENTITY_CREATE_DEMOS.accounts.email,
      msPerChar: 32,
    },
    {
      key: "password",
      label: "Contraseña",
      description: "Clave temporal de acceso.",
      value: ENTITY_CREATE_DEMOS.accounts.password,
      msPerChar: 45,
    },
  ],
};

export const ENTITY_CREATE_TOUR_CONFIGS = {
  roles: ROLES_CFG,
  categories: CATEGORIES_CFG,
  units: UNITS_CFG,
  customers: CUSTOMERS_CFG,
  suppliers: SUPPLIERS_CFG,
  services: SERVICES_CFG,
  products: PRODUCTS_CFG,
  tasks: TASKS_CFG,
  accounts: ACCOUNTS_CFG,
} as const;

export type EntityCreateModuleId = keyof typeof ENTITY_CREATE_TOUR_CONFIGS;

export function getEntityCreateTourSteps(
  moduleId: EntityCreateModuleId,
): SchedulyTourStep[] {
  return buildEntityCreateTourSteps(ENTITY_CREATE_TOUR_CONFIGS[moduleId]);
}

/** Tour solo del modal (campos). Id distinto al overview de página. */
export function getEntityFormTourSteps(
  moduleId: EntityCreateModuleId,
): SchedulyTourStep[] {
  return buildEntityFormTourSteps(ENTITY_CREATE_TOUR_CONFIGS[moduleId]);
}

export function getEntityCreateTourId(moduleId: EntityCreateModuleId): string {
  return ENTITY_CREATE_TOUR_CONFIGS[moduleId].tourId;
}

export function getEntityFormTourId(moduleId: EntityCreateModuleId): string {
  return `${ENTITY_CREATE_TOUR_CONFIGS[moduleId].tourId}-form`;
}

export const TUTORIAL_ENTITY_CREATE_CATALOG = (
  Object.keys(ENTITY_CREATE_TOUR_CONFIGS) as EntityCreateModuleId[]
).flatMap((id) => {
  const cfg = ENTITY_CREATE_TOUR_CONFIGS[id];
  return [
    {
      id: cfg.tourId,
      title: cfg.helpTitle,
      description: cfg.helpDescription,
    },
    {
      id: getEntityFormTourId(id),
      title: `${cfg.createTitle} — campos del formulario`,
      description:
        "Tutorial del modal: indica cada campo para registrar (sin reiniciar la pantalla).",
    },
  ];
});
