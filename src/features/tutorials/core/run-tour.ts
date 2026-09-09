import { driver, type DriveStep, type Driver, type PopoverDOM } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour-theme.css";
import {
  requestTourCloseOverlays,
  requestTourOpenOverlay,
  requestTourBranchesAction,
  requestTourEntityAction,
  type TourBranchesAction,
  type TourEntityAction,
} from "./overlays";
import { notifyTourDestroyed } from "../simulation/launch";

/**
 * Acciones de demo del tour.
 *
 * Convención para futuros tutoriales (no omitir):
 * - Todo clic real o simulado debe pasar por `pointer.moveTo` + `pointer.press`
 *   para que se vea la onda/ripple (`.scheduly-tour-pointer__ping`).
 * - Botones / links: `kind: "click"` (ya incluye moveTo + press + click DOM).
 * - Campos de texto: `kind: "type"` o `type-create-form` (también hacen press
 *   antes de escribir; una sola pasada de tipeo, sin duplicar).
 * - Alta de entidad en modal: `kind: "entity"` (open-create / submit-create) +
 *   `kind: "type"` en campos; ver definitions/entity-create/builder.ts.
 * - No actualizar solo el estado React sin mover el puntero: el usuario debe
 *   ver el cursor llegar, la onda de click y luego la escritura.
 */
export type TourDemoAction =
  | { kind: "type"; selector: string; value: string; msPerChar?: number }
  | { kind: "click"; selector: string }
  | { kind: "clear"; selectors: string[] }
  | {
      kind: "pickFirst";
      openSelector: string;
      /** Abre/cierra el ComboBox vía React (evita reopen por focus). */
      overlayId?: "customer" | "status" | "service" | "product";
    }
  | { kind: "waitFor"; selector: string; timeoutMs?: number }
  | { kind: "branches"; action: TourBranchesAction }
  | { kind: "entity"; action: TourEntityAction }
  | { kind: "sequence"; steps: TourDemoAction[] };

export type SchedulyTourStep = DriveStep & {
  allowMissing?: boolean;
  dwellMs?: number;
  demo?: TourDemoAction;
};

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(() => resolve(), ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(t);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function setNativeInputValue(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const proto =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  const prev = input.value;
  desc?.set?.call(input, value);
  const tracker = (
    input as HTMLInputElement & {
      _valueTracker?: { setValue: (v: string) => void };
    }
  )._valueTracker;
  tracker?.setValue(prev);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const ICON_PREV = `<svg class="scheduly-tour-btn-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6L9 12L15 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_NEXT = `<svg class="scheduly-tour-btn-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_PAUSE = `<svg class="scheduly-tour-btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`;
const ICON_PLAY = `<svg class="scheduly-tour-btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5V18.5L18 12L8 5.5Z"/></svg>`;
const ICON_DONE = `<svg class="scheduly-tour-btn-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5L10 17.5L19 7.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function setIconButton(
  btn: HTMLButtonElement | null | undefined,
  icon: string,
  label: string,
) {
  if (!btn) return;
  btn.setAttribute("aria-label", label);
  btn.setAttribute("title", label);
  btn.innerHTML = icon;
}

/**
 * HeroUI/React Aria pone `inert` en todo lo que está fuera del modal.
 * El popover de driver.js vive en body → queda inert y no recibe clics (Pausa/X).
 */
function unlockDriverControls() {
  document.querySelectorAll<HTMLElement>(".driver-popover").forEach((node) => {
    node.inert = false;
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
    node.style.pointerEvents = "auto";
    node.querySelectorAll<HTMLElement>("button, a, [tabindex]").forEach((btn) => {
      btn.inert = false;
      btn.removeAttribute("inert");
      btn.style.pointerEvents = "auto";
    });
  });
}

/** Popovers/listbox del form quedan fuera del highlight → hay que marcarlos clicables. */
function markFloatingOpen() {
  document.querySelectorAll<HTMLElement>('[role="listbox"]').forEach((lb) => {
    const root =
      (lb.closest("[data-slot='popover'], [role='dialog']") as HTMLElement | null) ??
      (lb.parentElement as HTMLElement | null);
    root?.classList.add("scheduly-tour-float-open");
    lb.classList.add("scheduly-tour-float-open");
  });
}

function clearFloatingMarks() {
  document
    .querySelectorAll(".scheduly-tour-float-open")
    .forEach((el) => el.classList.remove("scheduly-tour-float-open"));
}

/**
 * Cierra selects/ComboBox abiertos.
 * Nunca hace toggle del chevron (eso reabre el menú si ya estaba cerrando).
 * Pide a React cerrar vía evento + blur.
 */
function closeOpenSelects() {
  clearFloatingMarks();
  requestTourCloseOverlays();

  document
    .querySelectorAll<HTMLElement>(
      'input[aria-expanded="true"], button[aria-expanded="true"], [aria-expanded="true"][role="combobox"]',
    )
    .forEach((el) => {
      if (el.closest(".driver-popover")) return;
      el.blur();
    });

  const ae = document.activeElement;
  if (
    ae instanceof HTMLElement &&
    !ae.closest(".driver-popover") &&
    (ae.matches("input, textarea, [role='combobox']") ||
      ae.getAttribute("aria-expanded") === "true")
  ) {
    ae.blur();
  }
}

async function ensureSelectsClosed(signal: AbortSignal) {
  closeOpenSelects();
  await sleep(150, signal);
  closeOpenSelects();
  await sleep(120, signal);
}

function watchDriverUnlock(signal: AbortSignal) {
  unlockDriverControls();
  const obs = new MutationObserver(() => unlockDriverControls());
  obs.observe(document.body, {
    attributes: true,
    attributeFilter: ["inert", "aria-hidden"],
    childList: true,
    subtree: true,
  });
  const iv = window.setInterval(unlockDriverControls, 400);
  const stop = () => {
    obs.disconnect();
    window.clearInterval(iv);
  };
  signal.addEventListener("abort", stop, { once: true });
  return stop;
}

type TourPointerApi = {
  moveTo: (el: Element | null, signal: AbortSignal) => Promise<void>;
  /** Simula el click visual (onda/ripple). Obligatorio antes de click DOM o tipeo. */
  press: (signal: AbortSignal) => Promise<void>;
  destroy: () => void;
};

/**
 * Puntero del tour. La onda de click vive en `__ping` + clase `is-pressing`
 * (ver tour-theme.css). Futuros tours: siempre llamar `press()` en cada
 * interacción; no dispares `el.click()` ni escribas sin esa onda.
 */
function createTourPointer(): TourPointerApi {
  const root = document.createElement("div");
  root.className = "scheduly-tour-pointer";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M5.5 3.5L5.5 18.5L9.2 14.9L12.1 21.2L14.4 20.1L11.5 13.9L16.5 13.9L5.5 3.5Z"
        fill="#F5E6A3" stroke="#0A0804" stroke-width="1.2" stroke-linejoin="round"/>
    </svg>
    <span class="scheduly-tour-pointer__ping"></span>
  `;
  document.body.appendChild(root);

  let x = window.innerWidth * 0.55;
  let y = window.innerHeight * 0.35;
  let pressing = false;

  const paint = () => {
    root.style.transform = `translate(${x}px, ${y}px) scale(${pressing ? 0.88 : 1})`;
  };
  paint();

  return {
    async moveTo(el, signal) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      x = rect.left + Math.min(rect.width * 0.55, 40);
      y = rect.top + Math.min(rect.height * 0.55, 28);
      root.classList.add("is-visible");
      pressing = false;
      root.classList.remove("is-pressing");
      paint();
      await sleep(420, signal);
    },
    // Activa la onda (ripple) de click: clase is-pressing → animación CSS.
    async press(signal) {
      pressing = true;
      root.classList.add("is-pressing");
      paint();
      await sleep(160, signal);
      pressing = false;
      root.classList.remove("is-pressing");
      paint();
      await sleep(100, signal);
    },
    destroy() {
      root.remove();
    },
  };
}

async function runDemo(
  action: TourDemoAction,
  signal: AbortSignal,
  pointer: TourPointerApi | null,
) {
  if (action.kind === "sequence") {
    for (const step of action.steps) {
      if (signal.aborted) return;
      await runDemo(step, signal, pointer);
    }
    return;
  }

  if (action.kind === "waitFor") {
    const timeout = action.timeoutMs ?? 4000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (signal.aborted) return;
      if (document.querySelector(action.selector)) {
        await sleep(120, signal);
        return;
      }
      await sleep(60, signal);
    }
    return;
  }

  // Alta genérica: open/submit vía React (onda ya va en el click del catálogo).
  if (action.kind === "entity") {
    requestTourEntityAction(action.action);
    await sleep(action.action.type === "open-create" ? 280 : 350, signal);
    return;
  }

  if (action.kind === "branches") {
    // Escritura en el form de crear local: puntero → onda de click → tipeo 1 vez.
    if (action.action.type === "type-create-form") {
      const fieldSelectors: Record<"name" | "address" | "phone", string> = {
        name: "[data-tour='branches-form-name'] input",
        address: "[data-tour='branches-form-address'] input",
        phone: "[data-tour='branches-form-phone'] input",
      };
      const selector =
        action.action.selector ?? fieldSelectors[action.action.field];
      const inputEl = document.querySelector(selector);

      // Mismo patrón que `kind: "click"` / `kind: "type"`: moveTo + press (onda).
      await pointer?.moveTo(inputEl, signal);
      await pointer?.press(signal);
      if (inputEl instanceof HTMLInputElement) {
        inputEl.focus();
        inputEl.click();
      }

      requestTourBranchesAction({
        type: "set-create-form",
        [action.action.field]: "",
      });
      await sleep(120, signal);

      let acc = "";
      for (const ch of action.action.value) {
        if (signal.aborted) return;
        acc += ch;
        requestTourBranchesAction({
          type: "set-create-form",
          [action.action.field]: acc,
        });
        await sleep(
          Math.max(
            36,
            (action.action.msPerChar ?? 70) + (Math.random() - 0.5) * 20,
          ),
          signal,
        );
      }
      await sleep(140, signal);
      return;
    }

    requestTourBranchesAction(action.action);
    if (action.action.type === "open-create") {
      await sleep(200, signal);
      const start = Date.now();
      while (Date.now() - start < 4000) {
        if (signal.aborted) return;
        if (document.querySelector("[data-tour='branches-form-name'] input")) {
          await sleep(200, signal);
          return;
        }
        await sleep(60, signal);
      }
    } else {
      await sleep(350, signal);
    }
    return;
  }

  if (action.kind === "clear") {
    for (const sel of action.selectors) {
      const el = document.querySelector(sel);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        setNativeInputValue(el, "");
      }
    }
    return;
  }

  // Botones: mover puntero → onda (press) → click DOM. Usar esto en catálogos nuevos.
  if (action.kind === "click") {
    const el = document.querySelector<HTMLElement>(action.selector);
    await pointer?.moveTo(el, signal);
    await pointer?.press(signal);
    el?.click();
    el?.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, cancelable: true }),
    );
    await sleep(300, signal);
    return;
  }

  // Inputs nativos: misma onda de click y luego una sola pasada de escritura.
  if (action.kind === "type") {
    const el = document.querySelector(action.selector);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      return;
    }
    await pointer?.moveTo(el, signal);
    await pointer?.press(signal);
    el.focus();
    setNativeInputValue(el, "");
    let acc = "";
    for (const ch of action.value) {
      if (signal.aborted) return;
      acc += ch;
      setNativeInputValue(el, acc);
      await sleep(Math.max(36, (action.msPerChar ?? 70) + (Math.random() - 0.5) * 20), signal);
    }
    await sleep(220, signal);
    return;
  }

  if (action.kind === "pickFirst") {
    // Cierra otros menús, luego abre este
    requestTourCloseOverlays();
    await sleep(100, signal);

    const openEl = document.querySelector<HTMLElement>(action.openSelector);
    const root =
      openEl?.closest<HTMLElement>(
        "[data-slot='combo-box'], [data-slot='select'], [data-tour]",
      ) ?? null;
    const trigger =
      root?.querySelector<HTMLElement>(
        "[data-slot='combo-box-trigger'], [data-slot='select-trigger'], button",
      ) ??
      (openEl?.matches("button, [data-slot='select-trigger'], [data-slot='combo-box-trigger']")
        ? openEl
        : null);

    await pointer?.moveTo(openEl ?? trigger, signal);
    await pointer?.press(signal);

    if (action.overlayId) {
      requestTourOpenOverlay(action.overlayId);
    } else {
      trigger?.click();
    }

    // Esperar a que el listbox exista de verdad
    let listbox: Element | null = null;
    for (let i = 0; i < 25; i++) {
      listbox = document.querySelector('[role="listbox"]');
      if (listbox) break;
      // reintento de apertura si React aún no montó el portal
      if (i === 8 && action.overlayId) requestTourOpenOverlay(action.overlayId);
      if (i === 12) trigger?.click();
      await sleep(60, signal);
    }

    markFloatingOpen();
    await sleep(120, signal);

    const option =
      Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
        (opt) => {
          const id = String(opt.id || opt.dataset.key || "").toLowerCase();
          const text = (opt.textContent ?? "").trim().toLowerCase();
          if (opt.getAttribute("aria-disabled") === "true") return false;
          if (
            id === "__none" ||
            id === "none" ||
            id === "" ||
            text === "sin categoría" ||
            text === "por defecto" ||
            text === "sin asignar"
          ) {
            return false;
          }
          return true;
        },
      ) ??
      document.querySelectorAll<HTMLElement>('[role="option"]')[1] ??
      null;

    if (option) {
      await pointer?.moveTo(option, signal);
      await pointer?.press(signal);
      option.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
      );
      option.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      );
      option.click();
      await sleep(300, signal);
    }

    // Cerrar y dejar el cliente elegido (sin reabrir)
    requestTourCloseOverlays();
    await sleep(100, signal);
    requestTourCloseOverlays();
    openEl?.blur();
    (document.activeElement as HTMLElement | null)?.blur?.();
  }
}

/**
 * Tour driver.js con controles estables:
 * - Pausa / Reanudar
 * - Siguiente / Atrás
 * - X para cerrar
 */
export function runSchedulyTour({
  steps,
  onDestroyed,
  autoPlay = true,
  autoPlayMs = 2200,
  showPointer = true,
  popoverOffset = 14,
}: {
  steps: SchedulyTourStep[];
  onDestroyed?: () => void;
  autoPlay?: boolean;
  autoPlayMs?: number;
  showPointer?: boolean;
  popoverOffset?: number;
}): Driver | null {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  const safeSteps = steps.filter((s) => {
    if (!s?.element) return true;
    try {
      const exists = Boolean(document.querySelector(String(s.element)));
      return exists || Boolean(s.allowMissing);
    } catch {
      return Boolean(s.allowMissing);
    }
  });
  if (!safeSteps.length) return null;

  let advanceTimer: number | null = null;
  let paused = false;
  let stepAbort: AbortController | null = null;
  let pauseBtn: HTMLButtonElement | null = null;
  let closed = false;
  const pointer = showPointer ? createTourPointer() : null;
  const life = new AbortController();
  const stopUnlockWatch = watchDriverUnlock(life.signal);

  const clearAdvance = () => {
    if (advanceTimer != null) {
      window.clearTimeout(advanceTimer);
      advanceTimer = null;
    }
  };

  const abortStepWork = () => {
    stepAbort?.abort();
    stepAbort = null;
  };

  const syncPauseBtn = () => {
    if (!pauseBtn) return;
    setIconButton(pauseBtn, paused ? ICON_PLAY : ICON_PAUSE, paused ? "Reanudar" : "Pausa");
    pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
  };

  const scheduleAdvance = (drv: Driver, step: SchedulyTourStep, wait: number) => {
    clearAdvance();
    if (!autoPlay || paused || closed) return;
    const isLast = drv.isLastStep();
    advanceTimer = window.setTimeout(() => {
      advanceTimer = null;
      if (paused || closed || !drv.isActive()) return;
      if (isLast) drv.destroy();
      else drv.moveNext();
    }, wait);
  };

  const instance = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    allowKeyboardControl: true,
    overlayClickBehavior: () => {
      /* no cerrar al clic en overlay */
    },
    smoothScroll: true,
    overlayColor: "#0a0804",
    overlayOpacity: 0.68,
    stagePadding: 8,
    stageRadius: 12,
    popoverOffset,
    popoverClass: "scheduly-tour-popover scheduly-tour-guided",
    showButtons: ["previous", "next", "close"],
    nextBtnText: "Siguiente",
    prevBtnText: "Atrás",
    doneBtnText: "Listo",
    progressText: "{{current}}/{{total}}",
    steps: safeSteps,

    onPopoverRender: (popover: PopoverDOM, { driver: drv }) => {
      unlockDriverControls();

      setIconButton(popover.previousButton, ICON_PREV, "Atrás");
      if (drv.isLastStep()) {
        setIconButton(popover.nextButton, ICON_DONE, "Listo");
      } else {
        setIconButton(popover.nextButton, ICON_NEXT, "Siguiente");
      }

      popover.footerButtons
        .querySelectorAll("[data-tour-pause]")
        .forEach((el) => el.remove());

      const btn = document.createElement("button");
      btn.type = "button";
      // clase propia: NO usar driver-popover-prev-btn
      btn.className = "scheduly-tour-pause-btn";
      btn.setAttribute("data-tour-pause", "1");
      setIconButton(btn, paused ? ICON_PLAY : ICON_PAUSE, paused ? "Reanudar" : "Pausa");
      btn.setAttribute("aria-pressed", paused ? "true" : "false");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        paused = !paused;
        syncPauseBtn();
        if (paused) {
          clearAdvance();
          abortStepWork();
        } else if (!closed && instance.isActive()) {
          scheduleAdvance(
            instance,
            (instance.getActiveStep() || {}) as SchedulyTourStep,
            500,
          );
        }
      });
      popover.footerButtons.insertBefore(btn, popover.nextButton);
      pauseBtn = btn;
      unlockDriverControls();
    },

    onNextClick: (_el, _step, opts) => {
      clearAdvance();
      abortStepWork();
      closeOpenSelects();
      paused = false;
      syncPauseBtn();
      if (opts.driver.isLastStep()) opts.driver.destroy();
      else opts.driver.moveNext();
    },

    onPrevClick: (_el, _step, opts) => {
      clearAdvance();
      abortStepWork();
      closeOpenSelects();
      paused = false;
      syncPauseBtn();
      opts.driver.movePrevious();
    },

    // Sin onDestroyStarted: el cierre por defecto (X / Escape) destruye bien.
    // onCloseClick asegura destroy() explícito = p(false).
    onCloseClick: (_el, _step, opts) => {
      clearAdvance();
      abortStepWork();
      closed = true;
      closeOpenSelects();
      opts.driver.destroy();
    },

    onHighlighted: async (el, step, opts) => {
      unlockDriverControls();
      clearAdvance();
      abortStepWork();
      const s = step as SchedulyTourStep;
      const ac = new AbortController();
      stepAbort = ac;

      try {
        // Si el paso no abre un select, asegúrate de que no quede uno colgado
        if (s.demo?.kind !== "pickFirst") {
          await ensureSelectsClosed(ac.signal);
        }
        if (el && !s.demo) await pointer?.moveTo(el, ac.signal);
        if (s.demo) await runDemo(s.demo, ac.signal, pointer);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          /* ignore */
        }
      }

      if (ac.signal.aborted || closed || !opts.driver.isActive()) return;
      if (paused) return;

      scheduleAdvance(
        opts.driver,
        s,
        (s.dwellMs ?? autoPlayMs) + (s.demo ? 400 : 0),
      );
    },

    onDeselected: () => {
      clearAdvance();
      abortStepWork();
      closeOpenSelects();
    },

    onDestroyed: () => {
      closed = true;
      clearAdvance();
      abortStepWork();
      closeOpenSelects();
      life.abort();
      stopUnlockWatch();
      pointer?.destroy();
      for (const sel of ["#username", "#password", "#apt-title", "#apt-description"]) {
        const el = document.querySelector(sel);
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          setNativeInputValue(el, "");
        }
      }
      onDestroyed?.();
      notifyTourDestroyed();
    },
  });

  instance.drive();
  unlockDriverControls();
  return instance;
}
