import type { OnboardingStep } from "./steps";
import {
  getVisibleNavModules,
  navItemLabelForRole,
  roleTitle,
} from "@/shared/utils/nav-visibility";

/** Texto corto de para qué sirve cada módulo del menú. */
const MODULE_PURPOSE: Record<string, string> = {
  home: "Acceso directo a la portada del negocio y al resumen operativo.",
  operation:
    "El día a día del salón: agenda, servicios, caja, turnos y tareas del equipo.",
  sales: "Clientes, pedidos, ventas y compras relacionadas con la operación.",
  finance: "Dinero del negocio: gastos, sueldos, liquidaciones y cuadre.",
  inventory: "Productos, stock, movimientos y locales.",
  marketing: "Promociones, canal público y publicidad.",
  admin: "Usuarios, roles, sucursales y control del sistema.",
  system: "Perfil, configuración, tutoriales y herramientas de la cuenta.",
  dev: "Herramientas técnicas: logs, tutoriales y pruebas del sistema.",
};

/** Para qué sirve cada ítem (si aparece en el menú del rol). */
const ITEM_PURPOSE: Record<string, string> = {
  "nav-inicio": "Portada del negocio: marca, bienvenida y acceso a reservar.",
  "nav-dashboard":
    "Resumen con indicadores, actividad y atajos según tu rol.",
  "nav-agenda": "Calendario de turnos y citas del local o de tu agenda.",
  "nav-services": "Catálogo de servicios que se agendan a los clientes.",
  "nav-cash": "Caja del día: cobros y movimientos de efectivo.",
  "nav-shift": "Apertura y control del turno de caja.",
  "nav-tasks": "Tablero de tareas del equipo.",
  "nav-customers": "Ficha y búsqueda de clientes.",
  "nav-register-sale": "Registrar una venta de productos o servicios.",
  "nav-inventory": "Productos y existencias del inventario.",
  "nav-stores": "Locales o sucursales del negocio.",
  "nav-catalog": "Catálogo público o destacado del canal.",
  "nav-dev-profile": "Tu cuenta de programador.",
  "nav-dev-logs": "Registro técnico de errores y actividad del sistema.",
  "nav-dev-tutorials": "Tutoriales de cada módulo del sistema.",
  "nav-system-tutorials": "Tutoriales de cada módulo del sistema.",
  "nav-dev-settings": "Ajustes técnicos y de entorno.",
};

function listItems(
  labels: string[],
  purposes: Array<string | undefined>,
): string {
  if (!labels.length) return "";
  return labels
    .map((label, i) => {
      const purpose = purposes[i];
      return purpose ? `· ${label}: ${purpose}` : `· ${label}`;
    })
    .join("\n");
}

/**
 * Tour del shell en Inicio: auto-avanza, pausable, con puntero que
 * simula abrir el menú lateral (según rol).
 */
export function getShellTourSteps(
  role: string | null | undefined,
): OnboardingStep[] {
  const modules = getVisibleNavModules(role);
  const who = roleTitle(role);
  const steps: OnboardingStep[] = [
    {
      id: "shell-inicio",
      title: "Inicio",
      description: `Como ${who}, esta es tu portada al entrar: el nombre del negocio, la bienvenida y lo esencial de la marca. Aquí no hay que operar; es el punto de partida.`,
      target: "inicio-hero",
      dwellMs: 3200,
    },
    {
      id: "shell-inicio-actions",
      title: "Reservar y destacados",
      description:
        "Desde aquí también se ve la acción de reservar (vista cliente) y los puntos clave del servicio. Es la misma portada pública, ya con tu sesión abierta.",
      target: "inicio-highlights",
      dwellMs: 2800,
    },
    {
      id: "shell-sidebar",
      title: "Menú lateral",
      description: `A la izquierda está tu menú. Solo ves las secciones de ${who}. El puntero irá abriendo cada bloque para mostrártelo.`,
      target: "nav-sidebar",
      dwellMs: 2600,
    },
  ];

  for (const mod of modules) {
    if (mod.flat) {
      for (const item of mod.items) {
        const label = navItemLabelForRole(item, role);
        const purpose =
          (item.tourId && ITEM_PURPOSE[item.tourId]) ||
          "Acceso rápido desde el menú.";
        steps.push({
          id: `shell-item-${item.tourId ?? item.href}`,
          title: label,
          description: purpose,
          target: item.tourId,
          dwellMs: 2400,
          pointerClick: false,
        });
      }
      continue;
    }

    const labels = mod.items.map((item) => navItemLabelForRole(item, role));
    const purposes = mod.items.map((item) =>
      item.tourId ? ITEM_PURPOSE[item.tourId] : undefined,
    );
    const purpose =
      MODULE_PURPOSE[mod.id] ?? "Grupo de funciones de este menú.";
    steps.push({
      id: `shell-mod-${mod.id}`,
      title: mod.label,
      description: `${purpose}\n\nIncluye:\n${listItems(labels, purposes)}`,
      target: `nav-mod-${mod.id}`,
      dwellMs: 3800,
      /** El puntero “abre” el acordeón como en una simulación. */
      pointerClick: true,
    });
  }

  steps.push(
    {
      id: "shell-notifications",
      title: "Notificaciones",
      description:
        "Arriba a la derecha: avisos del sistema y del equipo. El punto indica si hay mensajes sin leer.",
      target: "nav-notifications",
      dwellMs: 2600,
    },
    {
      id: "shell-help",
      title: "Guía de uso",
      description:
        "El ícono de interrogación vuelve a abrir esta orientación o la guía de la pantalla en la que estés.",
      target: "onboarding-help",
      dwellMs: 2400,
    },
    {
      id: "shell-profile",
      title: "Tu perfil",
      description:
        "Arriba a la derecha está tu cuenta: nombre, rol, acceso al perfil, configuración (si aplica) y cierre de sesión.",
      target: "nav-user-menu",
      dwellMs: 2800,
    },
  );

  return steps.filter((s) => Boolean(s.target));
}
