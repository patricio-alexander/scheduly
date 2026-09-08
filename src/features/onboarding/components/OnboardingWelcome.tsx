"use client";

import { Button, Modal, useOverlayState } from "@heroui/react";
import { useEffect } from "react";
import Rocket from "@gravity-ui/icons/Rocket";
import Calendar from "@gravity-ui/icons/Calendar";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";
import ListCheck from "@gravity-ui/icons/ListCheck";
import { useOnboarding } from "../hooks/useOnboarding";
import { APP_BRAND_NAME } from "@/shared/utils/business-profile";

export function OnboardingWelcome() {
  const { phase, startTour, skip } = useOnboarding();
  const modal = useOverlayState();

  useEffect(() => {
    if (phase === "welcome") modal.open();
    else modal.close();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal state={modal}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container placement="center">
          <Modal.Dialog className="max-w-lg">
            <Modal.Header>
              <Modal.Icon>
                <Rocket width={20} height={20} />
              </Modal.Icon>
              <Modal.Heading>Bienvenido a {APP_BRAND_NAME}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">
                Primero un mapa rápido del menú. Después, al entrar a cada
                sección (Agenda, Tareas, Ventas…), te ofrecemos una guía de sus
                botones y partes.
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                <li className="flex items-start gap-3 rounded-xl bg-surface-secondary/70 px-3 py-2.5">
                  <span className="mt-0.5 rounded-lg bg-accent/10 p-1.5 text-accent">
                    <Calendar width={16} height={16} />
                  </span>
                  <span className="text-sm">
                    <span className="font-semibold">Por módulo</span>
                    <span className="text-muted">
                      {" "}
                      — qué hace cada botón en la pantalla actual
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3 rounded-xl bg-surface-secondary/70 px-3 py-2.5">
                  <span className="mt-0.5 rounded-lg bg-accent/10 p-1.5 text-accent">
                    <ListCheck width={16} height={16} />
                  </span>
                  <span className="text-sm">
                    <span className="font-semibold">Cuando quieras</span>
                    <span className="text-muted">
                      {" "}
                      — “Guía de esta pantalla” en el menú lateral
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3 rounded-xl bg-surface-secondary/70 px-3 py-2.5">
                  <span className="mt-0.5 rounded-lg bg-accent/10 p-1.5 text-accent">
                    <ShoppingCart width={16} height={16} />
                  </span>
                  <span className="text-sm">
                    <span className="font-semibold">Agenda, ventas e inventario</span>
                    <span className="text-muted">
                      {" "}
                      — el flujo completo del salón
                    </span>
                  </span>
                </li>
              </ul>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={skip}>
                Ahora no
              </Button>
              <Button variant="primary" onPress={startTour}>
                Ver mapa del menú
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
