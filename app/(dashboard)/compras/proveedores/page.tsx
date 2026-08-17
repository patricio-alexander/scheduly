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

export default function SuppliersPage() {
  const { user } = useAuth();
  const canDelete = canDeleteRecords(user?.role);
  const { suppliers, loading, refetch } = useSuppliers();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();

  if (!user) return null;

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

  const handleSubmit = useCallback(
    async (data: SupplierFormData) => {
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
    [editing, closeModal, refetch],
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Person width={24} height={24} />}
        title="Proveedores"
        description="Gestiona los proveedores de tu inventario"
        action={
          <Button variant="primary" onPress={openCreate}>
            <Plus width={16} height={16} />
            Agregar proveedor
          </Button>
        }
      />

      <SupplierList
        suppliers={suppliers}
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
                  <Person width={20} height={20} />
                </Modal.Icon>
                <Modal.Heading>
                  {editing ? "Editar proveedor" : "Nuevo proveedor"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
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
                >
                  {pending ? "Guardando..." : editing ? "Actualizar" : "Guardar"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
