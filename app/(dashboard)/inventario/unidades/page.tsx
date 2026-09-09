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
import {
  EntityCreateHelpButton,
  EntityCreateTutorialProvider,
  useEntityCreateTourDemo,
  ENTITY_CREATE_DEMOS,
} from "@/src/features/tutorials";
import {
  ENTITY_MODAL_DIALOG_CLASS,
  ENTITY_MODAL_BODY_CLASS,
  ENTITY_MODAL_HEADER_CLASS,
} from "@/shared/components/entity-modal";

export default function InventoryUnitsPage() {
  const { user } = useAuth();
  const canDelete = canDeleteRecords(user?.role);
  const { units, loading, refetch } = useUnits();
  const [editing, setEditing] = useState<Unit | null>(null);
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();

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

  const {
    displayItems,
    isTourDemo,
    prepareTour,
    cleanupTour,
    commitDemoCreate,
    tourActive,
  } = useEntityCreateTourDemo<Unit>({
    moduleId: "units",
    items: units,
    openCreate,
    closeModal,
    buildDemoItem: () => ({
      id: -9001,
      name: ENTITY_CREATE_DEMOS.units.name,
      abbreviation: ENTITY_CREATE_DEMOS.units.abbreviation,
      description: ENTITY_CREATE_DEMOS.units.description,
      factor: 1,
      productsCount: 0,
    }),
  });

  const handleSubmit = useCallback(
    async (data: UnitFormData) => {
      if (isTourDemo() && commitDemoCreate()) return;
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
    [editing, closeModal, refetch, isTourDemo, commitDemoCreate],
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

  if (!user) return null;

  return (
    <EntityCreateTutorialProvider
      moduleId="units"
      prepareTour={prepareTour}
      cleanupTour={cleanupTour}
      openCreateForm={openCreate}
      resetFormTour={closeModal}
    >
      <div className="flex flex-col gap-6">
        <PageHeader
          icon={<Cube width={24} height={24} />}
          title="Unidades"
          description="Unidades de medida del inventario (ml, L, und, g…)"
          action={
            <div className="flex items-center gap-2">
              <EntityCreateHelpButton title="Tutorial: Unidades" />
              <Button
                variant="primary"
                onPress={openCreate}
                data-tour="units-create"
              >
                <Plus width={16} height={16} />
                Agregar unidad
              </Button>
            </div>
          }
        />

        <div
          data-tour={displayItems.length === 0 ? "units-empty" : "units-list"}
        >
          <UnitList
            units={displayItems}
            onEdit={openEdit}
            onDelete={handleDelete}
            onAdd={openCreate}
            loading={loading && !tourActive}
            canDelete={canDelete}
          />
        </div>

        <Modal state={modal}>
          <Modal.Backdrop>
            <Modal.Container placement="center">
              <Modal.Dialog className={ENTITY_MODAL_DIALOG_CLASS}>
                <Modal.CloseTrigger />
                <Modal.Header className={ENTITY_MODAL_HEADER_CLASS}>
                  <Modal.Icon>
                    <Cube width={20} height={20} />
                  </Modal.Icon>
                  <Modal.Heading>
                    {editing ? "Editar unidad" : "Nueva unidad"}
                  </Modal.Heading>
                  <div className="ml-auto">
                    <EntityCreateHelpButton
                      inModal
                      title="Tutorial: cómo registrar una unidad"
                    />
                  </div>
                </Modal.Header>
                <Modal.Body className={ENTITY_MODAL_BODY_CLASS}>
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
                    data-tour="units-form-submit"
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
    </EntityCreateTutorialProvider>
  );
}
