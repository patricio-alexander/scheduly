"use client";

import type { ReactNode } from "react";
import { AlertDialog, Button, useOverlayState } from "@heroui/react";

type AlertDialogStatus = "default" | "accent" | "success" | "warning" | "danger";

export type ConfirmDialogProps = {
  state: ReturnType<typeof useOverlayState>;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  status?: AlertDialogStatus;
  confirmVariant?: "primary" | "danger" | "secondary";
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  state,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  status = "accent",
  confirmVariant = "primary",
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialog.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <AlertDialog.Container placement="center">
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status={status} />
              <AlertDialog.Heading>{title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>{description}</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="secondary" onPress={state.close} isDisabled={pending}>
                {cancelLabel}
              </Button>
              <Button
                variant={confirmVariant}
                isDisabled={pending}
                onPress={() => void onConfirm()}
              >
                {pending ? "Procesando..." : confirmLabel}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
