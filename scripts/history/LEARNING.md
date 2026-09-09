# LEARNING · Scheduly bots

Actualizado: 2026-09-08T13:09:27.246Z

Este archivo lo lee el agente para ver cómo va el sistema según los bots.
Detalle diario: `scripts/history/diary/` · JSON: `scripts/history/memory/`.

## Rol `owner`

- Corridas: **1** · probes: 55 (OK 55 / FAIL 0)
- Actualizado: 2026-09-08T13:07:24.853Z

### Ya confía
- `services` Servicios: 100% (3 hits)
- `pos-sales` Ventas POS: 100% (3 hits)
- `backups-list` Backups (dueña): 100% (3 hits)

### Insights
- Corrida limpia (55 probes) como owner · 2026-09-08

### Últimos comentarios
- `[observe]` Servicios: vi 42 ítem(s) en respuesta
- `[observe]` Productos: vi 47 ítem(s) en respuesta
- `[observe]` Logs del sistema (programador/dueña): vi 33 ítem(s) en respuesta
- `[observe]` Cobranzas workbench: vi 20 ítem(s) en respuesta
- `[observe]` Notificaciones: vi 15 ítem(s) en respuesta
- `[observe]` Roles: vi 4 ítem(s) en respuesta
- `[ui]` Abre /sistema/configuracion?tab=backups · Lista backups (solo dueña)
- `[summary]` Dueña andrea: 1 min · probes 55 · OK 55 · FAIL 0

### Pantallas visitadas (tour mental)
- /sistema/configuracion?tab=backups ×2
- /panel ×1
- /operacion/agenda ×1
- /operacion/caja ×1
- /finanzas/centro ×1
- /sistema/configuracion ×1
- /administracion/cuentas ×1
- /catalogo/productos ×1

## Rol `admin`

- Corridas: **6** · probes: 347 (OK 347 / FAIL 0)
- Actualizado: 2026-09-08T13:08:27.502Z

### Ya confía
- `services` Servicios: 100% (19 hits)
- `inventory-movements` Kardex movimientos: 100% (15 hits)
- `appointments` Agenda: 100% (14 hits)
- `products` Productos: 100% (14 hits)
- `finance-summary` Finanzas resumen: 100% (14 hits)
- `dashboard` Panel: 100% (14 hits)

### Insights
- Corrida limpia (71 probes) como admin · 2026-09-08
- Corrida limpia (84 probes) como admin · 2026-09-08
- Corrida limpia (40 probes) como admin · 2026-09-08
- Corrida limpia (48 probes) como admin · 2026-09-08
- Corrida limpia (52 probes) como admin · 2026-09-08

### Últimos comentarios
- `[ui]` Abre /finanzas/cobranzas · Revisa workbench de cobros
- `[observe]` Cobranzas workbench: vi 20 ítem(s) en respuesta
- `[observe]` Proveedores: vi 3 ítem(s) en respuesta
- `[learn]` Confirmado: admin no entra a Backups (dueña) (HTTP 403)
- `[observe]` Clientes: vi 20 ítem(s) en respuesta
- `[observe]` Roles: vi 4 ítem(s) en respuesta
- `[observe]` Sucursales: vi 1 ítem(s) en respuesta
- `[summary]` Admin admin_loja: 0.32106666666666667 min · probes 52 · OK 52 · FAIL 0

### Pantallas visitadas (tour mental)
- /finanzas/centro ×8
- /finanzas/cobranzas ×8
- /catalogo/productos ×8
- /compras/proveedores ×8
- /operacion/comprobantes-pos ×8
- /ventas/clientes ×8
- /operacion/agenda ×7
- /panel ×7

## Rol `employee`

- Corridas: **13** · probes: 474 (OK 400 / FAIL 74)
- Actualizado: 2026-09-08T13:09:27.243Z

### Áreas flojas / a vigilar
- `finance-expenses` Finanzas gastos: conf 31% · fail 11/16 · OK denegado HTTP 403 (sin permiso)
- `finance-collections` Cobranzas workbench: conf 33% · fail 10/15 · OK denegado HTTP 403 (sin permiso)
- `roles` Roles: conf 36% · fail 9/14 · OK denegado HTTP 403 (sin permiso)
- `inventory-movements` Kardex movimientos: conf 36% · fail 9/14 · OK denegado HTTP 403 (sin permiso)
- `finance-summary` Finanzas resumen: conf 36% · fail 9/14 · OK denegado HTTP 403 (sin permiso)
- `purchases` Compras: conf 42% · fail 7/12 · OK denegado HTTP 403 (sin permiso)
- `suppliers` Proveedores: conf 42% · fail 7/12 · OK denegado HTTP 403 (sin permiso)
- `orders-calendar` Pedidos calendario: conf 42% · fail 7/12 · OK denegado HTTP 403 (sin permiso)

### Ya confía
- `services` Servicios: 100% (36 hits)
- `notifications` Notificaciones: 100% (23 hits)
- `cash` Caja: 100% (23 hits)
- `appointments` Agenda: 100% (22 hits)
- `customers` Clientes: 100% (22 hits)
- `me` Sesión /api/auth/me: 100% (21 hits)

### Insights
- Hueco o bug: Proveedores como employee → FALLÓ: debía bloquear y llegó HTTP 200
- Hueco o bug: Pedidos calendario como employee → FALLÓ: debía bloquear y llegó HTTP 200
- Hueco o bug: Finanzas ingresos como employee → FALLÓ: debía bloquear y llegó HTTP 200
- Hubo 9 fallos allow/deny como employee · revisar permisos o catálogo
- Hubo 13 fallos allow/deny como employee · revisar permisos o catálogo
- Hubo 14 fallos allow/deny como employee · revisar permisos o catálogo
- Corrida limpia (30 probes) como employee · 2026-09-08
- Corrida limpia (33 probes) como employee · 2026-09-08
- Corrida limpia (28 probes) como employee · 2026-09-08
- Corrida limpia (32 probes) como employee · 2026-09-08

### Últimos comentarios
- `[learn]` Confirmado: employee no entra a Cobranzas workbench (HTTP 403)
- `[ui]` Abre /operacion/comprobantes-pos · Intenta ver config SRI (dueña sí, otros no)
- `[learn]` Confirmado: employee no entra a SRI config (HTTP 403)
- `[learn]` Confirmado: employee no entra a Roles (HTTP 403)
- `[observe]` Servicios: vi 42 ítem(s) en respuesta
- `[learn]` Confirmado: employee no entra a Logs del sistema (programador/dueña) (HTTP 403)
- `[observe]` Settings: negocio «Andrea Guerrero Estética y Peluquería»
- `[summary]` Empleado makeup_andres: 0.2 min · probes 32 · OK 32 · FAIL 0

### Pantallas visitadas (tour mental)
- /sistema/configuracion?tab=backups ×16
- /operacion/comprobantes-pos ×16
- /panel ×15
- /operacion/caja ×15
- /catalogo/productos ×15
- /ventas/clientes ×15
- /operacion/agenda ×14
- /sistema/logs ×14

