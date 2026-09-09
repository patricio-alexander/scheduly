/** Rutas de Scheduly (menú propio; no enlazado 1:1 con las otras apps). */
export const appRoutes = {
  /** Portada del staff (misma landing pública, sin Ingresar) */
  inicio: "/inicio",
  /** Resumen operativo / métricas */
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
    shiftSupervision: "/operacion/supervision-caja",
    multiCash: "/operacion/turno/multi-caja",
    /** Hub Comprobantes POS (facturas SRI, reimpresión caja, etc.) */
    posReceipts: "/operacion/comprobantes-pos",
  },
  /** Facturación SRI bajo Comprobantes POS (sin módulo «comprobantes electrónicos») */
  posDocs: {
    hub: "/operacion/comprobantes-pos",
    reprint: "/operacion/comprobantes-pos/reimpresion",
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
    /** Multistock; no es ítem del menú principal */
    multistock: "/inventario/multistock",
    stores: "/administracion/sucursales",
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
    paymentMedia: "/finanzas/medios-pago",
    cashClose: "/finanzas/cuadre-caja",
    payrollWeek: "/finanzas/liquidacion",
  },
  marketing: {
    promotions: "/marketing/promociones",
    catalog: "/canal/catalogo",
  },
  /** Rutas legacy /canal */
  channel: {
    catalog: "/canal/catalogo",
    stores: "/canal/locales",
    featuredProducts: "/canal/productos-destacados",
  },
  advertising: {
    campaigns: "/publicidad",
    devices: "/publicidad/dispositivos",
    player: "/publicidad/reproductor",
  },
  branches: {
    list: "/administracion/sucursales",
    stock: "/inventario/multistock",
  },
  employee: {
    myDay: "/empleado/mi-dia",
    myPayroll: "/empleado/mi-liquidacion",
  },
  loyalty: {
    hub: "/operacion/fidelizacion",
    feed: "/novedades",
    customerPortal: "/mi-cuenta",
    customerLogin: "/mi-cuenta",
    /** Consulta pública de turno (cédula/correo + clave) */
    myTurn: "/mi-turno",
    /** Catálogo de productos para el visitante */
    publicCatalog: "/catalogo",
    /** Promociones públicas */
    promos: "/promos",
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
    profile: "/sistema/perfil",
    donations: "/sistema/donaciones",
    notifications: "/sistema/notificaciones",
    /** Pestaña en Configuración (solo Dueño). */
    backups: "/sistema/configuracion?tab=backups",
    /** Logs del sistema (POST/PUT/PATCH/DELETE) */
    logs: "/sistema/logs",
    /** Tutoriales / playbooks (Programador) */
    tutorials: "/sistema/tutoriales",
  },
  /** Legacy → hub Comprobantes POS */
  legacy: {
    electronicDocsHub: "/operacion/comprobantes-pos",
  },
} as const;

export const posDocsSections = [
  {
    key: "reprint",
    href: appRoutes.posDocs.reprint,
    label: "Reimpresión caja",
    description: "Ventas de caja: reimprimir y consultar estado SRI",
  },
  {
    key: "invoices",
    href: appRoutes.posDocs.invoices,
    label: "Facturas",
    description: "Emisión y consulta de facturas electrónicas",
  },
  {
    key: "salesNotes",
    href: appRoutes.posDocs.salesNotes,
    label: "Notas de venta",
    description: "Notas de venta electrónicas",
  },
  {
    key: "creditNotes",
    href: appRoutes.posDocs.creditNotes,
    label: "Notas de crédito",
    description: "Notas de crédito electrónicas",
  },
  {
    key: "withholdings",
    href: appRoutes.posDocs.withholdings,
    label: "Retenciones",
    description: "Comprobantes de retención",
  },
  {
    key: "deliveryGuides",
    href: appRoutes.posDocs.deliveryGuides,
    label: "Guías de remisión",
    description: "Guías de remisión electrónicas",
  },
  {
    key: "issued",
    href: appRoutes.posDocs.issued,
    label: "Emitidos",
    description: "Historial y validez SRI de comprobantes emitidos",
  },
  {
    key: "sriSettings",
    href: appRoutes.posDocs.sriSettings,
    label: "Configuración SRI",
    description: "Certificado, ambiente y datos de facturación",
  },
] as const;
