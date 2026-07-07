"use client";

import { useState, useCallback } from "react";
import { Button, Modal, useOverlayState, toast } from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import {
  CustomerList,
  CustomerForm,
  useCustomers,
} from "@/src/features/customers";
import type { Customer } from "@/src/features/customers";
import type { CustomerFormData } from "@/src/features/customers";
import * as customerService from "@/src/features/customers/services/customer-service";
import Plus from "@gravity-ui/icons/Plus";
import Person from "@gravity-ui/icons/Person";

export default function CustomersPage() {
  const { user } = useAuth();
  const { customers, loading, refetch } = useCustomers();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();

  if (!user) return null;

  const openCreate = useCallback(() => {
    setEditing(null);
    modal.open();
  }, [modal]);

  const openEdit = useCallback(
    (customer: Customer) => {
      setEditing(customer);
      modal.open();
    },
    [modal],
  );

  const closeModal = useCallback(() => {
    modal.close();
    setEditing(null);
  }, [modal]);

  const handleSubmit = useCallback(
    async (data: CustomerFormData) => {
      setPending(true);
      try {
        if (editing) {
          await customerService.updateCustomer(editing.id, data);
          toast.success("Cliente actualizado");
        } else {
          await customerService.createCustomer(data);
          toast.success("Cliente creado");
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
      if (!confirm("¿Eliminar este cliente?")) return;
      try {
        await customerService.deleteCustomer(id);
        toast.success("Cliente eliminado");
        refetch();
      } catch (e) {
        toast.danger(e instanceof Error ? e.message : "Error al eliminar");
      }
    },
    [refetch],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button variant="primary" onPress={openCreate}>
          <Plus width={16} height={16} />
          Agregar cliente
        </Button>
      </div>

      <CustomerList
        customers={customers}
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
                  <Person width={20} height={20} />
                </Modal.Icon>
                <Modal.Heading>
                  {editing ? "Editar cliente" : "Nuevo cliente"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <CustomerForm
                  defaultValues={editing ?? undefined}
                  onSubmit={handleSubmit}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={closeModal}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  isDisabled={pending}
                  form="customer-form"
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
