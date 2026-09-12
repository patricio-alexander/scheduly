# Módulos retirados · 2026-09-11

Registro de lo que quitó el compañero (**patricio-alexander**) al compactar supervisión de caja.

| Campo | Valor |
|-------|--------|
| Commit | `8a814f5` — `feat: compactar supervision de caja` |
| Padre (nuestro) | `4e5523a` — seed 4 locales + mandatos |
| Rango git | `4e5523a..8a814f5` |
| Fecha | 2026-09-11 ~01:23 −05 |
| Diff aprox. | 96 archivos · +1828 / −8723 |

**Cómo recuperar un módulo en el futuro**

```bash
git show 4e5523a:ruta/al/archivo > ruta/al/archivo
# o checkout selectivo:
git checkout 4e5523a -- ruta/al/archivo
```

Decidir por módulo: **keep out** (dejar fuera) · **restore** (traer tal cual) · **replace** (rehacer más simple).

---

## Qué se reforzó (no quitar)

Foco del commit; conviene mantenerlo:

- `src/features/shifts/components/CashSupervision.tsx` — reestructura
- `shared/utils/shift-reports.ts` — reportes de turno ampliados
- **Nuevo** `src/features/shifts/components/EmployeeProductionPanel.tsx`
- **Nuevo** `shared/utils/staff-scope.server.ts` (+ cambios en `staff-scope.ts`)
- Ruta viva: `/operacion/supervision-caja`

---

## 1. Tareas (`tasks`)

| | |
|--|--|
| Página | `/operacion/tareas` |
| API | `/api/tasks`, `/api/tasks/[id]`, `/api/tasks/[id]/confirm` |
| Código | Todo `src/features/tasks/**` · `shared/utils/tasks.ts` |
| Nav | Entrada eliminada (`nav-tasks`) |
| Relacionado | Steps de onboarding / tutorials de tareas |

**Decisión sugerida:** **keep out** salvo que el negocio vuelva a pedir checklist/Kanban de equipo → entonces **restore** completo (UI + API + nav + onboarding).

**Nota simulador (2026-09-11):** el simulador ya **no** llama `/api/tasks`. Checklist local + review Dueña sin proveedores/pedidos (`bot-owner`, `duena.json`, `fetchTasksBoard`).

---

## 2. Pedidos / órdenes de cliente (`orders`)

| | |
|--|--|
| Página | `/ventas/pedidos` |
| API quitadas | `/api/orders`, `/api/orders/calendar`, workbench (`/api/orders/workbench/**`), supplier-payables (`/api/orders/supplier-payables/**`) |
| Código | `CustomerOrderDialog`, `OrdersCalendar`, `order-pack-breakdown`, `OrderItemsPackBreakdown` |
| Nav | Entrada eliminada |

**Siguen vivos (no tocar al “restaurar ciego”):** APIs POS / compras usadas por caja, p. ej. rutas de ventas que no estaban en este borrado.

**Decisión sugerida:** **keep out** del menú. Si vuelve B2B/calendario de pedidos → **restore** selectivo (calendario + dialog), no todo el workbench de payables.

---

## 3. Cobranzas (`cobranzas`)

| | |
|--|--|
| Página | `/finanzas/cobranzas` |
| Código | `src/features/finance/components/CollectionsPage.tsx` (~2100 líneas) |
| Nav | Entrada eliminada |

**Decisión sugerida:** **replace** dentro del hub de finanzas (más liviano) o **keep out** si se absorbe en movimientos/cuentas por cobrar.

---

## 4. Proveedores (`proveedores`)

| | |
|--|--|
| Página | `/compras/proveedores` |
| Código | `SupplierForm`, `SupplierList` |
| Nav | Entrada eliminada |
| Nota | Diálogos de orden de proveedor se reubicaron hacia `purchases` / sales en el mismo commit |

**Decisión sugerida:** **replace** como sección del hub de compras (CRUD corto), no restaurar página top-level suelta.

---

## 5. Tramos / precios por tramo (`tramos`)

| | |
|--|--|
| Página | `/inventario/tramos` |
| Estado previo | Módulo “planned” en catálogo |
| Nav | Entrada eliminada |

**Decisión sugerida:** **keep out** hasta que pricing por cantidad sea prioridad; entonces implementar de nuevo (**replace**), no restore ciego de un stub.

---

## 6. Theme dinámico

| | |
|--|--|
| API | `/api/settings/theme` |
| Código | `ThemeColorsProvider.tsx` + wiring en providers / layout / CSS |

**Decisión sugerida:** **keep out** si basta el accent fijo de marca. **restore** solo si multi-negocio necesita colores por tenant.

---

## 7. Onboarding / tutorials (limpieza)

Se alinearon con los módulos quitados:

- Steps / shell-tour (grupo tareas)
- Tutorials: tasks, orders, suppliers, etc.

Si se restaura un módulo, **reintroducir** steps/tutorials en el mismo PR.

---

## Páginas UI eliminadas (checklist)

1. `/operacion/tareas`
2. `/ventas/pedidos`
3. `/finanzas/cobranzas`
4. `/compras/proveedores`
5. `/inventario/tramos`

Nav y `app-modules-catalog` / `app-routes` ya no apuntan a esas rutas en `8a814f5`.

---

## Historial de decisión (llenar en el futuro)

| Módulo | ¿Volver? | Fecha | Quién | Motivo |
|--------|----------|-------|-------|--------|
| Tareas | | | | |
| Pedidos | | | | |
| Cobranzas | | | | |
| Proveedores | | | | |
| Tramos | | | | |
| Theme | | | | |
