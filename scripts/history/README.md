# Historial de testers y aprendizaje de bots

Cada corrida deja registro aquí.

| Archivo / carpeta | Uso |
|-------------------|-----|
| `log.jsonl` | Una línea JSON por corrida (resumen). |
| `runs/<id>.json` | Detalle completo: escenas, fallos, actor, modo. |
| `memory/<rol>.json` | **Memoria de aprendizaje** por rol (`owner` / `admin` / `employee`): stats por ruta, confianza, comentarios, pantallas visitadas. |
| `diary/YYYY-MM-DD.md` | **Bitácora del día** con comentarios (“abrí X”, “falló Y”). Legible por humano o IA. |
| `LEARNING.md` | **Digest** actualizado: qué confía el bot, qué está flojo, últimos insights. Léelo para ver cómo va el sistema. |

## Cómo aprenden

1. Al despertar cargan `memory/<rol>.json`.
2. Priorizan rutas/pantallas **poco vistas o con fallos**.
3. “Cliclean” pantallas del mapa UI → APIs (`scripts/bots/mind/ui-tour.ts`).
4. Comentan observaciones / fallos / aprendizajes.
5. Al terminar escriben diario + actualizan `LEARNING.md`.

Mutaciones de configuración (tacto reversible): solo con `BOT_ALLOW_WRITES=1` y rol dueña.

## Tour Dueña (`tester: owner-tour`)

| `mode` | Script |
|--------|--------|
| `review` | Solo revisión |
| `create-branch-account` | Crear local + cuenta + vínculo |
| `link-employees` | Vincular empleados a sucursales |
| `catalog` | Productos y servicios (crear/editar/precios) |
| `settings` | Nombre, colores, flags (restaura al final) |
| `owner-mind` | Conciencia + aprendizaje |

## Tour Administrador (`tester: admin-tour`)

| `mode` | Script |
|--------|--------|
| `review` / `review-all-parallel` | Solo revisión (uno o todos) |
| `edit-employee` | Editar datos de empleado del local |
| `toggle-accounts` | Desactivar y reactivar cuenta |
| `catalog` / `catalog-all-parallel` | Productos/servicios (uno o todos, cada local) |

## Mind admins / empleados

| `tester` | Notas |
|----------|--------|
| `admin-mind` | Conciencia + memoria `admin` |
| `employee-mind` | Conciencia + memoria `employee` |

## Tour Empleado (`tester: employee-tour`)

| `mode` | Script |
|--------|--------|
| `review` / `review-all-parallel` | Solo revisión (uno o todos) |
| `edit-profile` | Editar su propio perfil |
| `customers` | Ver / registrar clientes |
| `schedule` | Agendar turno + servicios |
