"use client";

import { useState, useCallback } from "react";
import { Button, Modal, useOverlayState, toast } from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import { ServiceList, ServiceForm, useServices } from "@/src/features/services";
import type { Service } from "@/src/features/services";
import type { ServiceFormData } from "@/src/features/services";
import * as serviceService from "@/src/features/services/services/service-service";
import { PageHeader } from "@/shared/components/ui";
import Plus from "@gravity-ui/icons/Plus";
import Gear from "@gravity-ui/icons/Gear";

export default function ServicesPage() {
  const { user } = useAuth();
  const { services, loading, refetch } = useServices();
  const [editing, setEditing] = useState<Service | null>(null);
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();

  if (!user) return null;

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

  const handleSubmit = useCallback(
    async (data: ServiceFormData) => {
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
    [editing, closeModal, refetch],
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Gear width={24} height={24} />}
        title="Servicios"
        description="Define los servicios y precios de tu negocio"
        action={
          <Button variant="primary" onPress={openCreate}>
            <Plus width={16} height={16} />
            Agregar servicio
          </Button>
        }
      />

      <ServiceList
        services={services}
        onEdit={openEdit}
        onDelete={handleDelete}
        onAdd={openCreate}
        loading={loading}
      />

      <Modal state={modal}>
        <Modal.Backdrop>
          <Modal.Container placement="center">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon>
                  <Gear width={20} height={20} />
                </Modal.Icon>
                <Modal.Heading>
                  {editing ? "Editar servicio" : "Nuevo servicio"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <ServiceForm
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
