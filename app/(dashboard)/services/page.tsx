"use client";

import { useState, useCallback } from "react";
import { Button, Modal, useOverlayState, toast } from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import { ServiceList, ServiceForm, useServices } from "@/src/features/services";
import type { Service } from "@/src/features/services";
import type { ServiceFormData } from "@/src/features/services";
import * as serviceService from "@/src/features/services/services/service-service";
import { PageHeader } from "@/shared/components/ui";
import { isAdminRole } from "@/shared/utils/roles";
import Plus from "@gravity-ui/icons/Plus";
import Gear from "@gravity-ui/icons/Gear";
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

export default function ServicesPage() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const { services, loading, refetch } = useServices();
  const [editing, setEditing] = useState<Service | null>(null);
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();

  const openCreate = useCallback(() => {
    setEditing(null);
    modal.open();
  }, [modal]);

  const openEdit = useCallback(
    (service: Service) => {
      setEditing(service);
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
  } = useEntityCreateTourDemo<Service>({
    moduleId: "services",
    items: services,
    openCreate,
    closeModal,
    buildDemoItem: () => ({
      id: -9001,
      name: ENTITY_CREATE_DEMOS.services.name,
      price: ENTITY_CREATE_DEMOS.services.price,
      durationMinutes: ENTITY_CREATE_DEMOS.services.durationMinutes,
      commissionPct: ENTITY_CREATE_DEMOS.services.commissionPct,
    }),
  });

  const handleSubmit = useCallback(
    async (data: ServiceFormData) => {
      if (isTourDemo() && commitDemoCreate()) return;
      setPending(true);
      try {
        if (editing) {
          await serviceService.updateService(editing.id, data);
          toast.success("Servicio actualizado");
        } else {
          await serviceService.createService(data);
          toast.success("Servicio creado");
        }
        closeModal();
        refetch();
      } finally {
        setPending(false);
      }
    },
    [editing, closeModal, refetch, isTourDemo, commitDemoCreate],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm("¿Eliminar este servicio?")) return;
      try {
        await serviceService.deleteService(id);
        toast.success("Servicio eliminado");
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
      moduleId="services"
      prepareTour={prepareTour}
      cleanupTour={cleanupTour}
      openCreateForm={openCreate}
      resetFormTour={closeModal}
      enabled={isAdmin}
    >
      <div className="flex flex-col gap-6">
        <PageHeader
          icon={<Gear width={24} height={24} />}
          title="Servicios"
          description="Define nombre, precio, duración y comisión del empleado"
          action={
            isAdmin ? (
              <div className="flex items-center gap-2">
                <EntityCreateHelpButton title="Tutorial: Servicios" />
                <Button
                  variant="primary"
                  onPress={openCreate}
                  data-tour="services-create"
                >
                  <Plus width={16} height={16} />
                  Agregar servicio
                </Button>
              </div>
            ) : undefined
          }
        />

        <div
          data-tour={
            displayItems.length === 0 ? "services-empty" : "services-list"
          }
        >
          <ServiceList
            services={displayItems}
            onEdit={isAdmin ? openEdit : () => undefined}
            onDelete={isAdmin ? handleDelete : async () => undefined}
            onAdd={isAdmin ? openCreate : undefined}
            loading={loading && !tourActive}
            canEdit={isAdmin}
          />
        </div>

        {isAdmin ? (
          <Modal state={modal}>
            <Modal.Backdrop>
              <Modal.Container placement="center">
                <Modal.Dialog className={ENTITY_MODAL_DIALOG_CLASS}>
                  <Modal.CloseTrigger />
                  <Modal.Header className={ENTITY_MODAL_HEADER_CLASS}>
                    <Modal.Icon>
                      <Gear width={20} height={20} />
                    </Modal.Icon>
                    <Modal.Heading>
                      {editing ? "Editar servicio" : "Nuevo servicio"}
                    </Modal.Heading>
                    <div className="ml-auto">
                      <EntityCreateHelpButton
                        inModal
                        title="Tutorial: cómo registrar un servicio"
                      />
                    </div>
                  </Modal.Header>
                  <Modal.Body className={ENTITY_MODAL_BODY_CLASS}>
                    <ServiceForm
                      key={editing?.id ?? "new"}
                      defaultValues={editing ?? undefined}
                      onSubmit={handleSubmit}
                      formId="service-form"
                    />
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onPress={closeModal}>
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      isDisabled={pending}
                      form="service-form"
                      type="submit"
                      data-tour="services-form-submit"
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
        ) : null}
      </div>
    </EntityCreateTutorialProvider>
  );
}
