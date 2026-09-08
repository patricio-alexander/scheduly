# LEARNING · Scheduly bots

Actualizado: 2026-09-08T00:06:17.226Z

Este archivo lo lee el agente para ver cómo va el sistema según los bots.
Detalle diario: `scripts/history/diary/` · JSON: `scripts/history/memory/`.

## Rol `owner`

- Corridas: **0** · probes: 0 (OK 0 / FAIL 0)
- Actualizado: 2026-09-08T00:06:17.226Z

## Rol `admin`

- Corridas: **3** · probes: 195 (OK 195 / FAIL 0)
- Actualizado: 2026-09-08T00:01:56.927Z

### Ya confía
- `services` Servicios: 100% (10 hits)
- `suppliers` Proveedores: 100% (9 hits)
- `inventory-movements` Kardex movimientos: 100% (9 hits)
- `appointments` Agenda: 100% (8 hits)
- `products` Productos: 100% (8 hits)
- `finance-summary` Finanzas resumen: 100% (8 hits)

### Insights
- Corrida limpia (71 probes) como admin · 2026-09-08
- Corrida limpia (84 probes) como admin · 2026-09-08
- Corrida limpia (40 probes) como admin · 2026-09-08

### Últimos comentarios
- `[learn]` Confirmado: admin no entra a Backups (dueña) (HTTP 403)
- `[ui]` Abre /operacion/caja · Chequea turno activo y caja
- `[ui]` Abre /sistema/configuracion · Lee settings del negocio (sin tocar aún)
- `[observe]` Settings: negocio «Andrea Guerrero Estética y Peluquería»
- `[observe]` Sucursales: vi 1 ítem(s) en respuesta
- `[observe]` Cobranzas workbench: vi 20 ítem(s) en respuesta
- `[ui]` Abre /finanzas/centro · Entra al centro financiero
- `[summary]` Admin admin_loja: 0.6666666666666666 min · probes 40 · OK 40 · FAIL 0

### Pantallas visitadas (tour mental)
- /finanzas/centro ×5
- /finanzas/cobranzas ×5
- /catalogo/productos ×5
- /compras/proveedores ×5
- /operacion/comprobantes-pos ×5
- /ventas/clientes ×5
- /operacion/agenda ×4
- /panel ×4

## Rol `employee`

- Corridas: **8** · probes: 318 (OK 244 / FAIL 74)
- Actualizado: 2026-09-08T00:06:17.224Z

### Áreas flojas / a vigilar
- `finance-expenses` Finanzas gastos: conf 0% · fail 11/11 · FALLÓ: debía bloquear y llegó HTTP 200
- `finance-collections` Cobranzas workbench: conf 0% · fail 10/10 · FALLÓ: debía bloquear y llegó HTTP 200
- `roles` Roles: conf 0% · fail 9/9 · FALLÓ: debía bloquear y llegó HTTP 200
- `inventory-movements` Kardex movimientos: conf 0% · fail 9/9 · FALLÓ: debía bloquear y llegó HTTP 200
- `finance-summary` Finanzas resumen: conf 0% · fail 9/9 · FALLÓ: debía bloquear y llegó HTTP 200
- `purchases` Compras: conf 0% · fail 7/7 · FALLÓ: debía bloquear y llegó HTTP 200
- `suppliers` Proveedores: conf 0% · fail 7/7 · FALLÓ: debía bloquear y llegó HTTP 200
- `orders-calendar` Pedidos calendario: conf 0% · fail 7/7 · FALLÓ: debía bloquear y llegó HTTP 200

### Ya confía
- `services` Servicios: 100% (24 hits)
- `backups-list` Backups (dueña): 100% (16 hits)
- `sri` SRI config: 100% (16 hits)
- `notifications` Notificaciones: 100% (15 hits)
- `shifts-active` Turno activo: 100% (15 hits)
- `cash` Caja: 100% (15 hits)

### Insights
- Hueco o bug: Compras como employee → FALLÓ: debía bloquear y llegó HTTP 200
- Hueco o bug: Finanzas resumen como employee → FALLÓ: debía bloquear y llegó HTTP 200
- Hubo 6 fallos allow/deny como employee · revisar permisos o catálogo
- Hubo 3 fallos allow/deny como employee · revisar permisos o catálogo
- Hueco o bug: Proveedores como employee → FALLÓ: debía bloquear y llegó HTTP 200
- Hueco o bug: Pedidos calendario como employee → FALLÓ: debía bloquear y llegó HTTP 200
- Hueco o bug: Finanzas ingresos como employee → FALLÓ: debía bloquear y llegó HTTP 200
- Hubo 9 fallos allow/deny como employee · revisar permisos o catálogo
- Hubo 13 fallos allow/deny como employee · revisar permisos o catálogo
- Hubo 14 fallos allow/deny como employee · revisar permisos o catálogo

### Últimos comentarios
- `[learn]` Confirmado: employee no entra a Backups (dueña) (HTTP 403)
- `[fail]` Fallo suppliers (Proveedores): FALLÓ: debía bloquear y llegó HTTP 200 · /api/suppliers
- `[ui]` Abre /sistema/logs · Mira mutaciones HTTP recientes
- `[learn]` Confirmado: employee no entra a Logs del sistema (programador/dueña) (HTTP 403)
- `[fail]` Fallo inventory-movements (Kardex movimientos): FALLÓ: debía bloquear y llegó HTTP 200 · /api/inventory/movements?take=20
- `[ui]` Abre /operacion/comprobantes-pos · Intenta ver config SRI (dueña sí, otros no)
- `[learn]` Confirmado: employee no entra a SRI config (HTTP 403)
- `[summary]` Empleado depilacion_ricardo: 0.4 min · probes 59 · OK 45 · FAIL 14

### Pantallas visitadas (tour mental)
- /sistema/configuracion?tab=backups ×11
- /operacion/comprobantes-pos ×11
- /panel ×10
- /operacion/caja ×10
- /catalogo/productos ×10
- /ventas/clientes ×10
- /operacion/agenda ×9
- /sistema/logs ×9

