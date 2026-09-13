# Scheduly — Documento de alcance

Versión: 1.0 · Fecha: 12 de septiembre de 2026  
Cliente: **Andrea Guerrero** — dueña de Andrea Guerrero Estética y Peluquería (Loja, Ecuador)  
Producto: **Scheduly** — plataforma de operación del negocio  
Stack: web (Next.js), base de datos MySQL/MariaDB, facturación electrónica SRI (Ecuador)

---

## 1. Objetivo del documento

Este documento sirve como:

- Referencia de alcance para evitar desviaciones durante la ejecución.
- Base de cálculo para la distribución de cobros por hitos.
- Guía funcional para el equipo de desarrollo, diseño y QA.
- Instrumento de validación por parte de Andrea Guerrero previo a la firma y arranque.

Todo lo que no esté descrito aquí se considera fuera de alcance, salvo adenda firmada.

---

## 2. Contexto del proyecto

### Sobre el cliente

[Texto del cliente — a cargo de Andrea Guerrero / del redactor. No completar aquí.]

### Situación actual

[Texto de la operación actual — a cargo de Andrea Guerrero / del redactor. No completar aquí.]

### Dolores identificados

- **Doble carga:** se anota el turno, luego se cobra, luego se anota la comisión. Tres lugares, tres oportunidades de error.
- **Caja opaca:** no se ve con claridad ventas por medio de pago (efectivo, De Una, Loja, tarjeta, etc.) ni el neto del día.
- **Dependencia de Andrea:** solo ella arma la liquidación; delegar a las encargadas de local es frágil.
- **Stock desfasado:** se vende un tinte y el inventario no se entera hasta el inventario físico.
- **Sin vista remota confiable:** Andrea no puede revisar otro local sin preguntar por teléfono.
- **Comprobantes desconectados:** la factura SRI no nace de la misma venta que se cobró en caja.

### Visión del proyecto

Construir para Andrea Guerrero una **plataforma web única** —con vistas diferenciadas por rol (dueña, administradora de sucursal, empleado)— que cubra la operación de sus locales de punta a punta: reservar, atender, cobrar, descontar stock, liquidar comisiones y, cuando corresponda, emitir el comprobante SRI.

No es un ecommerce ni una app nativa de stores. Es el sistema de operación de Andrea Guerrero Estética y Peluquería, usable en computador y en el celular del mostrador (web responsiva).

---

## 3. Alcance del proyecto — módulos funcionales

El sistema se entrega como **aplicación web** (escritorio y móvil en navegador), con un solo código y un menú que se filtra por rol.

Roles de sistema:

| Rol | Quién | Qué ve |
|---|---|---|
| Dueño | Andrea Guerrero | Todo: finanzas, liquidación, configuración, backups, sucursales |
| Administrador | Encargada de sucursal | Operación de su local, caja, supervisión, clientes, inventario del local |
| Empleado | Estilista / staff | Su agenda, su día, su liquidación |
| Programador | Cuenta técnica | Logs, tutoriales, usuarios; no opera el negocio |

### Módulo 1 — Agenda y servicios

Reemplaza el cuaderno / WhatsApp de citas.

**Funcionalidades**

- Calendario de citas por sucursal y por empleado (día / semana).
- Alta de turno: cliente, servicios, productos asociados, estilista, sucursal, horario.
- Estados del turno: programado, en espera de cobro, pagado pendiente, completado, cancelado, reprogramado.
- Catálogo de servicios (nombre, precio, comisión %, sucursales donde se ofrece).
- Vista “Mi agenda” para la administradora (su propio libro) y para el empleado.
- Reserva pública `/reservar` para que el cliente pida turno (sin entrar al ERP).
- Consulta pública de turno (`/mi-turno`) con cédula/correo.

### Módulo 2 — Caja (POS) y turno

Núcleo del mostrador: cobrar y abrir/cerrar el efectivo del día.

**Funcionalidades — Caja**

- Búsqueda de producto y accesos rápidos para armar el carrito.
- Cantidad con stepper −/+, aviso cuando se vende por encima del stock.
- Documento (documento / factura), condición de pago, cliente, método y medio de pago.
- Resumen de cobro: subtotal, IVA, total, monto recibido y vuelto, antes del botón Cobrar.
- Estado de turno abierto / sin turno y estado SRI (listo / no listo).
- Reimpresión y consulta de ventas de caja (hub Comprobantes POS).

**Funcionalidades — Turno**

- Apertura de caja con capital inicial y conteo.
- Cierre con efectivo esperado vs. contado.
- Movimientos de entrada y salida (gasto operativo, compra, retiro, otro).
- Multi-caja cuando hay más de un cajero en el local.

### Módulo 3 — Supervisión de caja

Vista de Andrea / administración para controlar el periodo, no el mostrador.

**Funcionalidades**

- Vista **semana** y **día**, con tira de 7 días y navegación.
- KPIs: ventas, gastos, neto (ventas − gastos), comisiones.
- Medios de pago del catálogo, **solo** tipos efectivo, tarjeta y transferencia (De Una, Loja, Pichincha, etc.), con total, cantidad de cobros y % del periodo.
- Fórmula de cierre del día: caja inicial + ventas = cierre.
- Detalle del día: producción por empleado (servicios / productos / tickets) y gastos.
- No incluye pestaña de “tienda”: este producto no es un retail genérico.

### Módulo 4 — Vales (adelantos de sueldo)

Registra el dinero que se le adelanta a un empleado para descontarlo después en la liquidación.

**Funcionalidades**

- Listado por periodo (hoy / semana / mes / todo).
- Totales: pendiente de descontar (histórico), dado en el periodo, ya descontado.
- Quiénes deben vales, con saldo y cantidad.
- Alta de vale: empleado, monto, medio de entrega (efectivo / tarjeta / transferencia), motivo.
- Marcar como descontado o volver a pendiente; anular solo si no está descontado.
- Visible solo para Andrea / administración. El empleado no ve ni registra vales ajenos.

**Nota de integración:** la liquidación semanal ya tiene la columna `Vales` (`vouchersAmount`). El registro uno a uno vive en este módulo. El arrastre automático del pendiente a la liquidación puede quedar como mejora (ver fuera de alcance / pendientes).

### Módulo 5 — Nómina, comisiones y liquidación

**Sueldos / comisiones**

- Comisiones generadas por turnos cobrados (servicios y productos).
- Registro de pagos al empleado (efectivo, tarjeta, transferencia).
- Historial de pagos.

**Liquidación semanal**

- Semana configurable (día de inicio).
- Cálculo automático de comisión de servicios (Se) y productos (Pr) en el rango.
- Columnas editables: vales, cafetería, multas, descuentos, adicionales.
- Total = Se + Pr + adicionales − vales − cafetería − multas − descuentos.
- Publicación y confirmación (firma) del empleado.
- Vista **Mi liquidación** para el empleado.

### Módulo 6 — Finanzas

Libro del negocio, alineado con el panel.

**Funcionalidades**

- Ingresos y gastos del ledger (mismo criterio que el Panel).
- KPIs: total dinero (ingresos − gastos), ingresos, gastos, margen del mes, turnos por cobrar.
- Fórmula de esperado: **Balance + turnos por cobrar = Esperado** (sin préstamos ni deudas en esta vista).
- Gastos recurrentes (plantillas y ocurrencias).
- Cuadre de caja diario por sucursal y medio de pago.
- Catálogo de medios de pago (efectivo, bancos, tarjeta, vales, etc.).
- Préstamos / deudas: el módulo puede existir en rutas internas; **no forma parte de los KPIs de finanzas** de este alcance.

### Módulo 7 — Inventario y compras

**Inventario**

- Productos (precio, stock, comisión, categoría, unidad).
- Multistock por sucursal / local.
- Categorías y unidades de medida.
- Movimientos (entradas, salidas, ajustes).
- Inventario valorizado (a costo y a precio de venta).
- Alertas de stock bajo en el Panel.

**Compras**

- Órdenes a proveedor, líneas, ingreso de stock.
- Historial de compras.

### Módulo 8 — Clientes, ventas y fidelización

- Cartera de clientes (datos, sucursal, historial).
- Hub de ventas de productos (además de la caja).
- Programa de fidelización: puntos, recompensas, configuración.
- Portal del cliente (`/mi-cuenta`) y novedades.
- Catálogo público y promociones públicas.

### Módulo 9 — Comprobantes electrónicos (SRI)

Para negocios en Ecuador que facturan electrónicamente.

**Funcionalidades**

- Configuración SRI (certificado, ambiente, establecimiento, punto de emisión).
- Emisión de facturas y notas de venta desde la venta de caja.
- Notas de crédito, retenciones y guías de remisión (según habilitación).
- Historial de emitidos y consulta de autorización.
- Reimpresión de comprobantes de caja.
- Worker de autorización (poll al SRI).

Si el negocio no está “SRI listo”, la caja opera igual y el chip lo indica.

### Módulo 10 — Panel, marketing y canal

- Panel (`/panel`): métricas del periodo, finanzas, citas/ventas, stock, top empleados, actividad reciente.
- Promociones del negocio.
- Configuración del catálogo / vitrina pública.
- Inicio del staff (portada del negocio).

### Módulo 11 — Administración y sistema

- Cuentas: 1 persona = 1 cuenta; una cuenta puede tener varios roles y varios locales (uno primario).
- Roles de sistema (Dueño, Administrador, Empleado, Programador) y roles custom.
- Configuración: negocio, apariencia, SRI, locales, flags de operación, backups JSON (solo Andrea).
- Logs de mutaciones (POST/PUT/PATCH/DELETE).
- Perfil del usuario autenticado.
- Tutoriales / playbooks (cuenta técnica).
- Notificaciones internas.

### Módulo 12 — Experiencia del empleado

- **Mi día:** turnos y comisiones del día.
- **Mi liquidación:** su semana, con vales y descuentos ya aplicados en la línea.
- **Mi agenda:** solo sus citas.

El empleado **no** accede a finanzas, vales de otros, liquidación general, backups ni configuración SRI.

---

## 4. Fuera de alcance y supuestos

### Exclusiones explícitas

Los siguientes elementos **no** están contemplados en esta propuesta y requieren cotización adicional:

- Aplicación nativa iOS / Android en App Store o Play Store (la web responsiva cubre el celular del mostrador).
- Pasarela de cobro en línea (tarjeta del cliente desde la web pública).
- Integración contable externa (QuickBooks, CONTPAQi, SuperCIAS, etc.).
- Facturación de otros países (AFIP, SAT, DIAN). El SRI es el único régimen electrónico incluido.
- Migración automática desde otro software de peluquería (Booksy, Fresha, etc.), salvo importación acordada en discovery.
- Módulo de e-commerce / carrito para el visitante (el catálogo público es vitrina, no checkout).
- Préstamos y deudas como motor financiero del dashboard (la ruta puede existir; no se promete como KPI).
- Arrastre automático de vales pendientes hacia la liquidación semanal (hoy el vale se registra y el monto de la columna se puede cargar a mano o en una iteración posterior).
- Multi-empresa / multi-marca en una sola instalación (un negocio = una base).
- App para el cliente final más allá de reserva pública, consulta de turno, catálogo y portal básico de fidelización.
- Lotes y vencimientos de inventario (control por lote, FEFO, alertas de caducidad).
- Mantenimiento evolutivo posterior a la entrega (se ofrece como servicio aparte).

### Supuestos del proyecto

- El punto de contacto único es **Andrea Guerrero**, con autoridad para validar entregables y aprobar hitos.
- Andrea entrega a tiempo: logo, datos del negocio, RUC, certificado SRI (si factura), listado de servicios, productos, empleados y sucursales.
- Las cuentas de hosting, dominio y certificado TLS se acuerdan en discovery. Se puede desplegar en la infraestructura que el cliente designe.
- Las fechas del cronograma son tentativas y se ajustan a la fecha efectiva de firma y pago del anticipo.
- Los porcentajes de cobro por hito se mantienen constantes, independientemente del monto total finalmente acordado.
- El ambiente de Ecuador (SRI) se configura en producción solo cuando Andrea entrega certificado y datos de emisión válidos.

---

## 5. Entregables

Al cierre del proyecto se entregan a Andrea Guerrero / Andrea Guerrero Estética y Peluquería:

1. **Sistema web operativo** en producción, con los módulos de la sección 3 (salvo lo marcado como pendiente / fuera de alcance).
2. **Accesos** para Andrea (dueña), administradoras de sucursal y empleados, con roles ya aplicados.
3. **Configuración inicial:** sucursales, medios de pago, servicios y productos de arranque (carga asistida, no migración histórica completa).
4. **Facturación SRI** operativa *si* el cliente entrega certificado y datos; si no, la caja queda lista y el SRI se activa en una sesión posterior sin reabrir el alcance.
5. **Código fuente** en repositorio versionado, como garantía de continuidad.
6. **Documentación de usuario** digital por rol (Andrea / dueña, administradora, empleado).
7. **Capacitación remota** al equipo interno (número de sesiones a definir en discovery).
8. **Acompañamiento post-lanzamiento** durante un periodo de estabilización a definir en el roadmap final.

---

## 6. Esquema de pagos por hitos

El pago total de **USD $[PENDIENTE]** se distribuye en cuatro hitos alineados a entregables verificables. Los porcentajes se mantienen fijos.

| Fase | Hitos incluidos | Entregas clave | % pago | Monto USD |
|---|---|---|---|---|
| Formalización | Inicio, alcance cerrado, arquitectura, mockups de flujos críticos (agenda, caja, liquidación). | Documento de alcance firmado, mockups aprobados, plan de trabajo. | 10% | [PENDIENTE] |
| Beta — MVP Core | Agenda, servicios, clientes, caja, turno, inventario básico, panel. | Módulos core en staging: se reserva, se cobra, baja stock, se abre y cierra turno. | 40% | [PENDIENTE] |
| Operación y dinero | Supervisión de caja, vales, sueldos / comisiones, liquidación semanal, finanzas, medios de pago, cuadre. | Andrea ve el día y la semana; el empleado ve su liquidación; vales quedan registrados. | 30% | [PENDIENTE] |
| Entrega final | SRI (si aplica), fidelización / catálogo público, QA, producción, capacitación, código. | Sistema en producción, equipo capacitado, repositorio entregado. | 20% | [PENDIENTE] |
| **Total** | | | **100%** | **[PENDIENTE]** |

---

## 7. Criterios de aceptación (resumen)

Se considera un hito aceptado cuando:

- **Agenda:** se crea un turno, se cobra y el estado pasa a completado / pagado.
- **Caja:** una venta con vuelto queda registrada y el stock del producto baja.
- **Turno:** se abre con capital, se cobra, se cierra; el cierre es visible en supervisión.
- **Supervisión:** semana y día muestran ventas, gastos, neto, comisiones y totales por medio (efectivo / tarjeta / transferencias del catálogo).
- **Vales:** se registra un adelanto a un empleado y aparece en pendiente hasta marcarlo descontado.
- **Liquidación:** la semana se arma con Se/Pr automáticos y el empleado puede ver **Mi liquidación**.
- **Finanzas:** Balance + turnos por cobrar = Esperado, sin préstamos ni deudas en la fórmula.
- **SRI (si está en el hito):** una factura de caja obtiene clave de acceso / autorización o un error explícito del SRI, no un fallo silencioso.

---

## 8. Glosario

| Término | Significado en Scheduly |
|---|---|
| Turno (agenda) | Cita con un cliente y un estilista. |
| Turno (caja) | Jornada de caja abierta: capital, ventas, egresos, cierre. |
| Vale | Adelanto de sueldo al empleado; se descuenta en la liquidación. |
| Se / Pr | Comisión por servicios / por productos. |
| Medio de pago | Ítem del catálogo (Efectivo, De Una, Loja, Tarjeta…). |
| Método | Familia: efectivo, tarjeta, transferencia. |
| SRI listo | Certificado y datos de emisión cargados para facturar. |

---

*Documento de alcance de Scheduly para Andrea Guerrero, dueña de Andrea Guerrero Estética y Peluquería. Los montos y fechas de hitos quedan en [PENDIENTE] hasta la propuesta comercial.*
