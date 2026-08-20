"use client";

import { Button, Modal, useOverlayState } from "@heroui/react";
import { useEffect, useState } from "react";
import CircleCheck from "@gravity-ui/icons/CircleCheck";
import { useAuth } from "../hooks/useAuth";

type ChangeRoleDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ChangeRoleDialog({ open, onClose }: ChangeRoleDialogProps) {
  const { user, changeRole } = useAuth();
  const modal = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) onClose();
    },
  });
  const [pending, setPending] = useState(false);
  const roles = user?.roles ?? [];
  const currentRolId = user?.rolId;

  useEffect(() => {
    if (open) modal.open();
    else modal.close();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = async (roleId: number) => {
    if (roleId === currentRolId) {
      onClose();
      return;
    }
    setPending(true);
    try {
      await changeRole(roleId);
      onClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
      setPending(false);
    }
  };

  return (
    <Modal state={modal}>
      <Modal.Backdrop>
        <Modal.Container placement="center">
          <Modal.Dialog className="max-w-sm">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Cambiar de rol</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {!roles.length ? (
                <p className="text-center text-sm text-muted">
                  No hay roles disponibles.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {roles.map((rol) => {
                    const isCurrent = rol.id === currentRolId;
                    return (
                      <Button
                        key={rol.id}
                        variant={isCurrent ? "primary" : "secondary"}
                        className="justify-center gap-2"
                        isDisabled={pending}
                        onPress={() => void handleSelect(rol.id)}
                      >
                        <span className="font-semibold">{rol.label}</span>
                        {isCurrent ? (
                          <CircleCheck width={18} height={18} />
                        ) : null}
                      </Button>
                    );
                  })}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" isDisabled={pending} onPress={onClose}>
                Cancelar
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
