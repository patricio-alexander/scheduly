/** Rutas de la app alineadas al mapa de módulos/secciones del entitlement */
export const appRoutes = {
  dashboard: "/panel",
  home: "/",
  booking: "/reservar",
  login: "/login",
  operation: {
    agenda: "/operacion/agenda",
    services: "/operacion/servicios",
    cash: "/operacion/caja",
    shifts: "/operacion/turno",
    tasks: "/operacion/tareas",
    loyalty: "/operacion/fidelizacion",
    posReceipts: "/operacion/comprobantes-pos",
    shiftSupervision: "/operacion/supervision-caja",
    multiCash: "/operacion/turno/multi-caja",
  },
  electronicDocs: {
    hub: "/comprobantes-electronicos",
    invoices: "/comprobantes-electronicos/facturas",
    issued: "/comprobantes-electronicos/emitidos",
    sriSettings: "/sistema/configuracion?tab=sri",
  },
  sales: {
    register: "/ventas/registrar-venta",
    history: "/ventas/historial",
    productSales: "/ventas/productos-vendidos",
    orders: "/ventas/pedidos",
    customers: "/ventas/clientes",
    customerAccounts: "/ventas/clientes/cuentas",
  },
  inventory: {
    products: "/inventario/productos",
    movement: "/inventario/movimientos",
    categories: "/inventario/categorias",
    tierGroups: "/inventario/tramos",
    units: "/inventario/unidades",
    warehouses: "/inventario/bodegas",
    batches: "/inventario/lotes",
  },
  purchases: {
    register: "/compras/registrar",
    history: "/compras/historial",
    suppliers: "/compras/proveedores",
  },
  finance: {
    hub: "/finanzas/centro",
    expenses: "/finanzas/gastos",
    payroll: "/finanzas/sueldos",
    payrollHistory: "/finanzas/sueldos/historial",
  },
  branches: {
    list: "/administracion/sucursales",
    stock: "/inventario/multistock",
  },
  employee: {
    myDay: "/empleado/mi-dia",
  },
  loyalty: {
    hub: "/operacion/fidelizacion",
    feed: "/novedades",
    customerPortal: "/mi-cuenta",
    customerLogin: "/mi-cuenta",
  },
  promotions: {
    list: "/operacion/promociones",
  },
  admin: {
    users: "/administracion/usuarios",
    accounts: "/administracion/cuentas",
    roles: "/administracion/roles",
    controlPanel: "/administracion/panel-control",
    notificationPrograms: "/administracion/programas-notificacion",
  },
  system: {
    settings: "/sistema/configuracion",
    plans: "/sistema/planes",
    modules: "/sistema/modulos",
    profile: "/sistema/perfil",
    donations: "/sistema/donaciones",
    notifications: "/sistema/notificaciones",
  },
} as const;

export const electronicDocsSections = [
  {
    key: "hub",
    href: appRoutes.electronicDocs.hub,
    label: "Centro de comprobantes",
    description: "Vista general de facturación electrónica",
  },
  {
    key: "invoices",
    href: appRoutes.electronicDocs.invoices,
    label: "Facturas",
    description: "Emisión y consulta de facturas electrónicas",
  },
  {
    key: "issued",
    href: appRoutes.electronicDocs.issued,
    label: "Emitidos",
    description: "Historial de comprobantes emitidos",
  },
  {
    key: "sriSettings",
    href: appRoutes.electronicDocs.sriSettings,
    label: "Configuración SRI",
    description: "Parámetros de facturación electrónica",
  },
] as const;
