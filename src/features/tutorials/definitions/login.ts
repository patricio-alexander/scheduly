import type { SchedulyTourStep } from "../core/run-tour";

export const LOGIN_TOUR_ID = "login";

const DEMO_USER = "admin_demo";
const DEMO_PASS = "prueba123";

/** Pasos driver.js + demo de llenado sobre el login real. */
export function getLoginTourSteps(): SchedulyTourStep[] {
  return [
    {
      element: "[data-tour='login-help']",
      dwellMs: 2400,
      popover: {
        title: "Tutorial de inicio de sesión",
        description:
          "Te guiamos en este formulario con datos de prueba. Puedes pausar o ir a Siguiente cuando quieras.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='login-username']",
      dwellMs: 1600,
      demo: {
        kind: "type",
        selector: "#username",
        value: DEMO_USER,
        msPerChar: 75,
      },
      popover: {
        title: "Usuario",
        description: `Aquí va el usuario. Ejemplo de prueba: ${DEMO_USER}`,
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='login-password']",
      dwellMs: 1600,
      demo: {
        kind: "type",
        selector: "#password",
        value: DEMO_PASS,
        msPerChar: 70,
      },
      popover: {
        title: "Contraseña",
        description: `Aquí va la clave. Ejemplo de prueba: ${DEMO_PASS}`,
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='login-show-password']",
      dwellMs: 2200,
      demo: {
        kind: "click",
        selector: "[data-tour='login-show-password']",
      },
      popover: {
        title: "Ver / Ocultar",
        description:
          "Así puedes revisar lo escrito. Pulsa de nuevo para ocultar.",
        side: "left",
        align: "center",
      },
    },
    {
      element: "[data-tour='login-submit']",
      dwellMs: 2800,
      popover: {
        title: "Iniciar sesión",
        description:
          "Con tus datos reales, pulsa aquí para entrar. (Este tutorial no inicia sesión.)",
        side: "top",
        align: "center",
      },
    },
  ];
}

export const TUTORIAL_CATALOG = [
  {
    id: LOGIN_TOUR_ID,
    title: "Iniciar sesión",
    description:
      "Tour guiado: llena datos de prueba, pausa o avanza con Siguiente.",
  },
];
