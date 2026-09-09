"use client";

import { useState, useCallback } from "react";
import { Button, Modal, useOverlayState, toast } from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import {
  SupplierList,
  SupplierForm,
  useSuppliers,
} from "@/src/features/purchases";
import type { Supplier } from "@/src/features/purchases";
import type { SupplierFormData } from "@/src/features/purchases/lib/purchase-schema";
import * as purchaseService from "@/src/features/purchases/services/purchase-service";
import { PageHeader } from "@/shared/components/ui";
import { canDeleteRecords } from "@/shared/utils/roles";
import Plus from "@gravity-ui/icons/Plus";
import Person from "@gravity-ui/icons/Person";
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

export default function SuppliersPage() {
  const { user } = useAuth();
  const canDelete = canDeleteRecords(user?.role);
  const { suppliers, loading, refetch } = useSuppliers();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();

  const openCreate = useCallback(() => {
    setEditing(null);
    modal.open();
  }, [modal]);

  const openEdit = useCallback(
    (supplier: Supplier) => {
      setEditing(supplier);
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
  } = useEntityCreateTourDemo<Supplier>({
    moduleId: "suppliers",
    items: suppliers,
    openCreate,
    closeModal,
    buildDemoItem: () => ({
      id: -9001,
      name: ENTITY_CREATE_DEMOS.suppliers.name,
      phone: ENTITY_CREATE_DEMOS.suppliers.phone,
      email: ENTITY_CREATE_DEMOS.suppliers.email,
      taxId: null,
      address: "",
    }),
  });

  const handleSubmit = useCallback(
    async (data: SupplierFormData) => {
      if (isTourDemo() && commitDemoCreate()) return;
      setPending(true);
      try {
        if (editing) {
          await purchaseService.updateSupplier(editing.id, data);
          toast.success("Proveedor actualizado");
        } else {
          await purchaseService.createSupplier(data);
          toast.success("Proveedor creado");
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
      if (!confirm("¿Eliminar este proveedor?")) return;
      try {
        await purchaseService.deleteSupplier(id);
        toast.success("Proveedor eliminado");
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
      moduleId="suppliers"
      prepareTour={prepareTour}
      cleanupTour={cleanupTour}
      openCreateForm={openCreate}
      resetFormTour={closeModal}
    >
      <div className="flex flex-col gap-6">
        <PageHeader
          icon={<Person width={24} height={24} />}
          title="Proveedores"
          description="Gestiona los proveedores de tu inventario"
          action={
            <div className="flex items-center gap-2">
              <EntityCreateHelpButton title="Tutorial: Proveedores" />
              <Button
                variant="primary"
                onPress={openCreate}
                data-tour="suppliers-create"
              >
                <Plus width={16} height={16} />
                Agregar proveedor
              </Button>
            </div>
          }
        />

        <div
          data-tour={
            displayItems.length === 0 ? "suppliers-empty" : "suppliers-list"
          }
        >
          <SupplierList
            suppliers={displayItems}
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
                    <Person width={20} height={20} />
                  </Modal.Icon>
                  <Modal.Heading>
                    {editing ? "Editar proveedor" : "Nuevo proveedor"}
                  </Modal.Heading>
                  <div className="ml-auto">
                    <EntityCreateHelpButton
                      inModal
                      title="Tutorial: cómo registrar un proveedor"
                    />
                  </div>
                </Modal.Header>
                <Modal.Body className={ENTITY_MODAL_BODY_CLASS}>
                  <SupplierForm
                    key={editing?.id ?? "new"}
                    defaultValues={editing ?? undefined}
                    onSubmit={handleSubmit}
                    formId="supplier-form"
                  />
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onPress={closeModal}>
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={pending}
                    form="supplier-form"
                    type="submit"
                    data-tour="suppliers-form-submit"
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
