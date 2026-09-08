"use client";

import { useState, useCallback } from "react";
import { Button, Modal, useOverlayState, toast } from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import { UnitList, UnitForm, useUnits } from "@/src/features/units";
import type { Unit } from "@/src/features/units";
import type { UnitFormData } from "@/src/features/units";
import * as unitService from "@/src/features/units/services/unit-service";
import { PageHeader } from "@/shared/components/ui";
import { canDeleteRecords } from "@/shared/utils/roles";
import Plus from "@gravity-ui/icons/Plus";
import Cube from "@gravity-ui/icons/Cube";

export default function InventoryUnitsPage() {
  const { user } = useAuth();
  const canDelete = canDeleteRecords(user?.role);
  const { units, loading, refetch } = useUnits();
  const [editing, setEditing] = useState<Unit | null>(null);
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();

  if (!user) return null;

  const openCreate = useCallback(() => {
    setEditing(null);
    modal.open();
  }, [modal]);

  const openEdit = useCallback(
    (unit: Unit) => {
      setEditing(unit);
      modal.open();
    },
    [modal],
  );

  const closeModal = useCallback(() => {
    modal.close();
    setEditing(null);
  }, [modal]);

  const handleSubmit = useCallback(
    async (data: UnitFormData) => {
      setPending(true);
      try {
        if (editing) {
          await unitService.updateUnit(editing.id, data);
          toast.success("Unidad actualizada");
        } else {
          await unitService.createUnit(data);
          toast.success("Unidad creada");
        }
        closeModal();
        refetch();
      } catch (e) {
        toast.danger(e instanceof Error ? e.message : "Error al guardar");
      } finally {
        setPending(false);
      }
    },
    [editing, closeModal, refetch],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm("¿Eliminar esta unidad de medida?")) return;
      try {
        await unitService.deleteUnit(id);
        toast.success("Unidad eliminada");
        refetch();
      } catch (e) {
        toast.danger(e instanceof Error ? e.message : "Error al eliminar");
      }
    },
    [refetch],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Cube width={24} height={24} />}
        title="Unidades"
        description="Unidades de medida del inventario (ml, L, und, g…)"
        action={
          <Button variant="primary" onPress={openCreate}>
            <Plus width={16} height={16} />
            Agregar unidad
          </Button>
        }
      />

      <UnitList
        units={units}
        onEdit={openEdit}
        onDelete={handleDelete}
        onAdd={openCreate}
        loading={loading}
        canDelete={canDelete}
      />

      <Modal state={modal}>
        <Modal.Backdrop>
          <Modal.Container placement="center">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon>
                  <Cube width={20} height={20} />
                </Modal.Icon>
                <Modal.Heading>
                  {editing ? "Editar unidad" : "Nueva unidad"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <UnitForm
                  defaultValues={editing ?? undefined}
                  onSubmit={handleSubmit}
                  formId="unit-form"
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={closeModal}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  isDisabled={pending}
                  form="unit-form"
                  type="submit"
                >
                  {pending
                    ? "Guardando..."
                    : editing
                      ? "Actualizar"
                      : "Guardar"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
