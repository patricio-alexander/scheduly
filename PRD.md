# PRD — Scheduly

**Producto:** Scheduly  
**Tipo:** Aplicación web de operación comercial (agenda, ventas, inventario y tareas)  
**Documento:** Product Requirements Document  
**Versión:** 1.0  
**Fecha:** 2026-07-25  
**Estado:** Activo (producto en producción / despliegue on-premise o VPS)

---

## 1. Resumen ejecutivo

Scheduly es una plataforma web para negocios de servicios y retail ligero que necesitan:

- Agendar y gestionar turnos/citas
- Controlar inventario y alertas de stock
- Registrar ventas y clientes
- Coordinar tareas del equipo en tiempo real
- Administrar usuarios, roles y suscripción por módulos

La app se entrega como producto SaaS multi-módulo, controlado por entitlements (planes/módulos) sincronizados con un gestor externo, y puede desplegarse detrás de Apache con un custom server Node.js (Next.js + Socket.io).

---

## 2. Problema

Los negocios pequeños y medianos suelen operar con:

- Agenda en papel o WhatsApp
- Inventario desconectado de las citas/ventas
- Poca visibilidad de ingresos y actividad
- Coordinación lenta entre admin y empleados
- Software genérico caro o incompleto para su flujo

Esto genera turnos perdidos, stock desactualizado, falta de control financiero y fricción operativa.

---

## 3. Objetivos del producto

### Objetivos de negocio

1. Centralizar operación diaria (agenda, inventario, ventas, tareas) en un solo panel.
2. Monetizar por suscripción/planes y módulos activables.
3. Reducir tiempo de adopción con onboarding y roles claros (admin vs empleado).
4. Permitir despliegue controlado (base path, proxy Apache, PM2).

### Objetivos de usuario

1. Agendar y reprogramar turnos en segundos.
2. Ver actividad y KPIs relevantes según rol.
3. Mantener stock al día y recibir alertas.
4. Colaborar en tiempo real (Kanban / Agenda) sin refrescar la página.

### Métricas de éxito (sugeridas)

| Métrica | Meta inicial |
|--------|---------------|
| Turnos creados / semana por tenant | Crecimiento sostenido post-onboarding |
| Tiempo hasta primer turno agendado | < 10 minutos desde login |
| Uso de agenda + tareas en el mismo día | ≥ 40% de usuarios activos |
| Alertas de stock atendidas | Reducción de quiebres recurrentes |
| Errores de acceso por suscripción | < 1% de sesiones |

---

## 4. Usuarios y roles

### 4.1 Administrador

- Acceso completo a módulos habilitados por suscripción
- Dashboard con KPIs financieros (incl. ingresos)
- Gestión de usuarios, roles, configuración, planes y módulos
- Historial de ventas y documentos electrónicos (cuando estén activos)
- Eliminación de registros (productos, categorías, unidades, clientes)

### 4.2 Empleado

- Acceso a dashboard operativo **sin** KPI de ingresos
- Agenda y tareas (típicamente las asignadas a sí mismo)
- Inventario y clientes con permisos restringidos (sin eliminar)
- Sin acceso al módulo Sistema ni a secciones admin-only

### 4.3 Sistema / Gestor externo

- Push/pull de entitlements y catálogo de planes/módulos vía API con Bearer secret

---

## 5. Alcance

### 5.1 In scope (actual / entregado)

- Autenticación por usuario/contraseña con cookie de sesión (`scheduly_session`)
- Dashboard con KPIs, comparativas y últimos turnos
- Agenda (FullCalendar): crear, editar, pagar, drag & drop, highlight desde dashboard
- Tareas Kanban en tiempo real (Socket.io)
- Agenda en tiempo real (Socket.io)
- Clientes, productos, categorías, unidades
- Ventas / historial de pagos (admin)
- Notificaciones (stock bajo, marcar leídas, deep-link a producto)
- Suscripción: gate por módulo/sección, planes, módulos, expiración
- Roles admin/empleado con restricciones de UI y rutas
- Onboarding guiado (tours)
- Despliegue con custom server + PM2 + base path (`/scheduly`)

### 5.2 Planned / placeholders en navegación

Rutas previstas o en preparación (algunas solo placeholder / entitlement map):

- Caja, multi-caja, supervisión de turnos
- Amplio inventario (bodegas, lotes, movimientos, tramos)
- Pedidos y cuentas de clientes
- Suite completa de comprobantes electrónicos SRI (facturas, NC, ND, retenciones, etc.)

### 5.3 Out of scope (por ahora)

- App móvil nativa
- Marketplace multi-tenant self-serve completo en UI
- Contabilidad avanzada / nómina
- Integraciones bancarias / pasarelas de pago online de consumo
- Multi-idioma completo (UI actual en español)

---

## 6. Requisitos funcionales

### 6.1 Autenticación y sesión

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| AUTH-01 | Login con username/password | P0 |
| AUTH-02 | Sesión vía cookie httpOnly firmada | P0 |
| AUTH-03 | APIs protegidas con `checkAuth` (401 sin cookie) | P0 |
| AUTH-04 | Logout limpia cookie y estado local | P0 |
| AUTH-05 | Excepción: push de entitlements con Bearer del gestor | P0 |

### 6.2 Dashboard

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| DASH-01 | KPIs de actividad (turnos, clientes, etc.) | P0 |
| DASH-02 | KPI de ingresos visible solo para roles con permiso financiero | P0 |
| DASH-03 | Filtro por período | P0 |
| DASH-04 | Lista de últimos turnos con navegación a agenda + highlight | P1 |
| DASH-05 | Invalidación/actualización en tiempo real vía socket | P1 |
| DASH-06 | Layout usable en tablet | P1 |

### 6.3 Agenda / turnos

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| AGE-01 | Calendario día/semana con eventos de turnos | P0 |
| AGE-02 | Crear/editar turno con cliente, servicios, productos, estado | P0 |
| AGE-03 | Reprogramar por drag & drop (PATCH) | P0 |
| AGE-04 | Registrar pago de turno | P0 |
| AGE-05 | Descuento de stock al completar flujo de pago cuando aplique | P0 |
| AGE-06 | Sync en tiempo real entre clientes conectados | P0 |
| AGE-07 | Spotlight de turno desde deep-link / dashboard | P1 |

### 6.4 Tareas

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| TASK-01 | Tablero Kanban (todo / in_progress / done) | P0 |
| TASK-02 | CRUD de tareas; admin ve todas, empleado las suyas | P0 |
| TASK-03 | Movimiento de columnas en tiempo real | P0 |
| TASK-04 | Empleado no elimina; alta limitada a asignación propia | P1 |

### 6.5 Inventario y clientes

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| INV-01 | CRUD productos, categorías, unidades | P0 |
| INV-02 | Alertas de stock bajo a admins + notificación con link | P0 |
| INV-03 | Empleado no ve botón eliminar | P0 |
| CUS-01 | CRUD clientes | P0 |
| CUS-02 | Empleado no elimina clientes | P0 |

### 6.6 Ventas

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| SALE-01 | Historial de ventas/pagos (admin) | P0 |
| SALE-02 | Empleado sin acceso a historial financiero | P0 |

### 6.7 Notificaciones

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| NOT-01 | Listado y estado leído/no leído | P0 |
| NOT-02 | Marcar una / todas como leídas | P0 |
| NOT-03 | Deep-link a producto con highlight | P1 |
| NOT-04 | Sonido al recibir notificación nueva | P2 |

### 6.8 Suscripción y entitlements

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| SUB-01 | Gate global: sin suscripción activa no entra a módulos (salvo Planes/Módulos) | P0 |
| SUB-02 | Gate por módulo/sección según status (`active`, `maintenance`, `planned`, `development`, `developer`) | P0 |
| SUB-03 | Si `expires_at` / `expiresAt` ya pasó → pantalla “Suscripción expirada / contacta con soporte” | P0 |
| SUB-04 | Pull/push de entitlements contra gestor | P0 |
| SUB-05 | Listado de planes desde API gestor | P1 |
| SUB-06 | Listado de módulos desde API gestor | P1 |
| SUB-07 | Polling silencioso de entitlements para reflejar cambios del gestor | P2 |

### 6.9 Administración y sistema

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| ADM-01 | Gestión de usuarios y roles (admin) | P0 |
| SYS-01 | Perfil de usuario | P1 |
| SYS-02 | Configuración del sistema | P1 |
| SYS-03 | Módulo documentos electrónicos (UI/navegación; emisión completa según roadmap) | P2 |

### 6.10 Tiempo real (Socket.io)

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RT-01 | Custom server HTTP + Socket.io en el mismo puerto que la app | P0 |
| RT-02 | Path: `{NEXT_PUBLIC_BASE_PATH}/socket.io` | P0 |
| RT-03 | Eventos: tareas, citas, invalidación dashboard, clientes | P0 |
| RT-04 | Funciona detrás de reverse proxy (Apache) con WebSocket + polling | P0 |

---

## 7. Requisitos no funcionales

| ID | Área | Requisito |
|----|------|-----------|
| NFR-01 | Seguridad | APIs autenticadas; secretos en env; cookie httpOnly |
| NFR-02 | Performance | Respuesta API típica < 500 ms en operaciones CRUD locales |
| NFR-03 | Disponibilidad | Proceso gestionado por PM2 con autorestart |
| NFR-04 | UX | UI en español; responsive (desktop + tablet) |
| NFR-05 | Observabilidad | Logs de proceso (PM2) y errores API en consola servidor |
| NFR-06 | Deploy | Soporte `NEXT_PUBLIC_BASE_PATH` (ej. `/scheduly`) detrás de Apache |
| NFR-07 | Stack | Next.js App Router, Prisma/MariaDB, HeroUI, Tailwind, Socket.io |

---

## 8. Arquitectura (vista producto)

```
Usuario (browser)
    │
    ▼
Apache (HTTPS, reverse proxy + WebSocket)
    │
    ▼
PM2 → custom server (server.ts)
    ├── Next.js (páginas + API routes)
    └── Socket.io (mismo puerto)
            │
            ├── MariaDB (Prisma)
            └── Gestor de suscripciones (HTTP + Bearer)
```

**Implicación de producto:** el realtime no es opcional en el diseño actual; el despliegue debe incluir custom server (no solo `next start`) y proxy WS correcto.

---

## 9. Mapa de módulos (entitlements)

| Key | Módulo | Contenido principal |
|-----|--------|---------------------|
| `operation` | Operación / Dashboard | Panel, agenda, tareas |
| `sales` | Ventas | Clientes, historial |
| `inventory` | Inventario | Productos, unidades, categorías |
| `admin` | Administración | Usuarios, roles |
| `system` | Sistema | Config, planes, módulos, perfil, notificaciones |
| `electronicDocs` | Documentos electrónicos | Facturación / SRI (roadmap) |

Estados de acceso por módulo/sección: `active`, `development`, `maintenance`, `developer`, `planned`.

---

## 10. Flujos clave

### 10.1 Primer uso (admin)

1. Login  
2. Si no hay suscripción / expiró → pantalla de bloqueo (Planes/Módulos accesibles)  
3. Sync de entitlement / activación de plan  
4. Onboarding opcional  
5. Crear cliente → producto → turno en agenda  

### 10.2 Día a día (empleado)

1. Login → dashboard sin ingresos  
2. Ver/mover tareas asignadas  
3. Atender agenda  
4. Consultar productos/clientes sin eliminar  

### 10.3 Stock bajo

1. Operación reduce stock  
2. Sistema notifica a admins  
3. Admin abre notificación → producto resaltado  

---

## 11. Criterios de aceptación globales

- [ ] Sin cookie de sesión, las APIs responden 401  
- [ ] Empleado no ve ingresos ni módulo Sistema ni botones eliminar  
- [ ] Dos navegadores en agenda: drag de un turno se refleja en el otro sin refresh  
- [ ] Dos navegadores en Kanban: mover tarjeta se refleja en el otro  
- [ ] Suscripción expirada muestra mensaje de contacto a soporte  
- [ ] Planes y Módulos accesibles aunque no haya suscripción activa  
- [ ] Deploy con `PORT` (PM2) + `NEXT_PUBLIC_BASE_PATH` sirve app y socket bajo el mismo origen  

---

## 12. Riesgos y dependencias

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Apache sin `proxy_wstunnel` | Realtime roto en producción | Documentar proxy WS + polling; validar Network |
| PM2 ejecutando `.ts` sin `tsx`/`npm run start` | App o socket no levantan | Ecosystem con `npm run start` |
| Gestor de suscripciones caído | No sync de planes/entitlements | Cache local de entitlements; mensaje claro |
| `NEXT_PUBLIC_BASE_PATH` mal en build | Assets/socket con path incorrecto | Build con `.env` correcto en servidor |
| Divergencia seed vs gestor | Entitlements inconsistentes | Pull explícito + UI de reintento |

---

## 13. Roadmap sugerido

### Fase A — Estabilización producción (ahora)

- Proxy Apache WS validado en HTTPS  
- PM2 + custom server documentado  
- Hardening auth en todas las APIs  

### Fase B — Operación comercial

- Caja / turnos de caja  
- Historial y reportes de ventas más ricos  

### Fase C — Inventario avanzado

- Bodegas, lotes, movimientos  

### Fase D — Documentos electrónicos SRI

- Emisión real de facturas y documentos asociados  

### Fase E — Experiencia

- Notificaciones push / email  
- Mejoras mobile  
- Activación self-serve de módulos desde UI  

---

## 14. Decisiones de producto abiertas

1. ¿La suscripción expirada debe permitir solo “contactar soporte” o también renovar desde Planes?  
2. ¿El empleado debe poder crear turnos para otros usuarios o solo los propios?  
3. Prioridad exacta de documentos electrónicos vs caja  
4. Modelo multi-empresa (un deploy = un tenant vs multi-tenant nativo)

---

## 15. Anexos técnicos (referencia)

- Entry server: `server.ts`  
- Proceso: `ecosystem.config.cjs` → `npm run start` (`tsx server.ts`)  
- Auth API: `shared/utils/check-auth.ts`  
- Gate suscripción: `src/features/subscription/`  
- Socket server/client: `shared/utils/socket.ts`, `shared/utils/socket-client.ts`  
- Rutas de producto: `shared/utils/app-routes.ts`  

---

## 16. Historial del documento

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-07-25 | PRD inicial alineado al estado del código (agenda, tareas RT, roles, suscripción, deploy) |
