"use client";

import { Button, Modal, useOverlayState } from "@heroui/react";
import { useEffect, useRef } from "react";
import Rocket from "@gravity-ui/icons/Rocket";
import LayoutHeaderCells from "@gravity-ui/icons/LayoutHeaderCells";
import Bell from "@gravity-ui/icons/Bell";
import Person from "@gravity-ui/icons/Person";
import { useOnboarding } from "../hooks/useOnboarding";
import { useAuth } from "@/src/features/auth";
import { APP_BRAND_NAME } from "@/shared/utils/business-profile";
import { roleLabel } from "@/shared/utils/roles";

/** Arranque automático del tour si el usuario no cancela (como login). */
const AUTO_START_MS = 1100;

export function OnboardingWelcome() {
  const { user } = useAuth();
  const { phase, startTour, skip } = useOnboarding();
  const modal = useOverlayState();
  const who = roleLabel(user?.role);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (phase === "welcome") {
      cancelledRef.current = false;
      modal.open();
    } else {
      modal.close();
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "welcome") return;
    const t = window.setTimeout(() => {
      if (!cancelledRef.current) startTour();
    }, AUTO_START_MS);
    return () => window.clearTimeout(t);
  }, [phase, startTour]);

  const decline = () => {
    cancelledRef.current = true;
    skip();
  };

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
              <p className="text-sm text-muted leading-relaxed">
                En un momento empieza la orientación automática para{" "}
                <span className="font-semibold text-foreground">{who}</span>
                : un puntero muestra el menú, notificaciones y tu perfil. Puedes
                pausarla cuando quieras.
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                <li className="flex items-start gap-3 rounded-xl bg-surface-secondary/70 px-3 py-2.5">
                  <span className="mt-0.5 rounded-lg bg-accent/10 p-1.5 text-accent">
                    <LayoutHeaderCells width={16} height={16} />
                  </span>
                  <span className="text-sm">
                    <span className="font-semibold">Menú lateral</span>
                    <span className="text-muted">
                      {" "}
                      — el puntero abre cada bloque
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3 rounded-xl bg-surface-secondary/70 px-3 py-2.5">
                  <span className="mt-0.5 rounded-lg bg-accent/10 p-1.5 text-accent">
                    <Bell width={16} height={16} />
                  </span>
                  <span className="text-sm">
                    <span className="font-semibold">Notificaciones</span>
                    <span className="text-muted">
                      {" "}
                      — avisos arriba a la derecha
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3 rounded-xl bg-surface-secondary/70 px-3 py-2.5">
                  <span className="mt-0.5 rounded-lg bg-accent/10 p-1.5 text-accent">
                    <Person width={16} height={16} />
                  </span>
                  <span className="text-sm">
                    <span className="font-semibold">Perfil</span>
                    <span className="text-muted">
                      {" "}
                      — tu cuenta, rol y salida
                    </span>
                  </span>
                </li>
              </ul>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={decline}>
                Ahora no
              </Button>
              <Button
                variant="primary"
                onPress={() => {
                  cancelledRef.current = true;
                  startTour();
                }}
              >
                Empezar ya
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
