/** Rutas de Scheduly (menú propio; no enlazado 1:1 con las otras apps). */
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
    posReceipts: "/operacion/comprobantes-pos",
    shiftSupervision: "/operacion/supervision-caja",
    multiCash: "/operacion/turno/multi-caja",
    /** Scheduly propio (antes Canal digital) */
    catalog: "/canal/catalogo",
    stores: "/canal/locales",
  },
  electronicDocs: {
    hub: "/comprobantes-electronicos",
    invoices: "/comprobantes-electronicos/facturas",
    salesNotes: "/comprobantes-electronicos/notas-venta",
    creditNotes: "/comprobantes-electronicos/notas-credito",
    withholdings: "/comprobantes-electronicos/retenciones",
    deliveryGuides: "/comprobantes-electronicos/guias-remision",
    issued: "/comprobantes-electronicos/emitidos",
    sriSettings: "/sistema/configuracion?tab=sri",
  },
  sales: {
    salesHub: "/ventas/ventas",
    /** Alias legacy; el hub de ventas es la fuente de verdad */
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
    value: "/inventario/valor",
    /** Multistock (feature gestor); no es ítem del menú EdDeli */
    multistock: "/inventario/multistock",
  },
  purchases: {
    hub: "/compras",
    register: "/compras/registrar",
    history: "/compras/historial",
    suppliers: "/compras/proveedores",
  },
  finance: {
    hub: "/finanzas/centro",
    transactions: "/finanzas/centro",
    collections: "/finanzas/cobranzas",
    loansDebts: "/finanzas/prestamos-deudas",
    recurringExpenses: "/finanzas/gastos-recurrentes",
    /** Páginas Scheduly que siguen existiendo pero no van en el menú EdDeli */
    expenses: "/finanzas/gastos",
    payroll: "/finanzas/sueldos",
    payrollHistory: "/finanzas/sueldos/historial",
  },
  production: {
    ingredients: "/produccion/insumos",
    recipes: "/produccion/recetas",
    manufacturing: "/produccion/fabricacion",
  },
  /** Rutas legacy; el menú Scheduly ya no usa el módulo Canal digital */
  channel: {
    catalog: "/canal/catalogo",
    stores: "/canal/locales",
    featuredProducts: "/canal/productos-destacados",
    compareGroups: "/canal/grupos-comparativos",
  },
  marketing: {
    promotions: "/marketing/promociones",
    news: "/marketing/noticias",
  },
  advertising: {
    campaigns: "/publicidad",
    devices: "/publicidad/dispositivos",
    player: "/publicidad/reproductor",
  },
  promoDesign: {
    editor: "/diseno-promocional/editor",
    preview: "/diseno-promocional/vista",
    templates: "/diseno-promocional/plantillas",
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
    /** Legacy → marketing.promotions */
    list: "/marketing/promociones",
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
    /** Pestaña en Configuración (solo Dueño). */
    backups: "/sistema/configuracion?tab=backups",
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
