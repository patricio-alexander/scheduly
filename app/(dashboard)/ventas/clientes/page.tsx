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
import * as customerAccountService from "@/src/features/customers/services/customer-account-service";
import { PageHeader } from "@/shared/components/ui";
import {
  canDeleteRecords,
  isEmployeeRole,
  isManagementRole,
} from "@/shared/utils/roles";
import Plus from "@gravity-ui/icons/Plus";
import Person from "@gravity-ui/icons/Person";

export default function CustomersPage() {
  const { user } = useAuth();
  const canDelete = canDeleteRecords(user?.role);
  const canManagePortal = isManagementRole(user?.role);
  /** Dueño, admin y empleados pueden agregar/editar clientes. */
  const canEditCustomers =
    isManagementRole(user?.role) || isEmployeeRole(user?.role);
  const { customers, loading, refetch } = useCustomers();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [portalCustomer, setPortalCustomer] = useState<Customer | null>(null);
  const [portalPassword, setPortalPassword] = useState("");
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();
  const portalModal = useOverlayState();

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

  const openPortalModal = useCallback(
    (customer: Customer) => {
      setPortalCustomer(customer);
      setPortalPassword("");
      portalModal.open();
    },
    [portalModal],
  );

  const handleActivatePortal = useCallback(async () => {
    if (!portalCustomer) return;
    setPending(true);
    try {
      await customerAccountService.activateCustomerPortal(
        portalCustomer.id,
        portalPassword,
      );
      toast.success("Cuenta de cliente activada");
      portalModal.close();
      refetch();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al activar");
    } finally {
      setPending(false);
    }
  }, [portalCustomer, portalPassword, portalModal, refetch]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Person width={24} height={24} />}
        title="Clientes"
        description="Gestiona tu base de clientes y sus datos de contacto"
        action={
          canEditCustomers ? (
            <div data-onboarding="customers-create">
              <Button variant="primary" onPress={openCreate}>
                <Plus width={16} height={16} />
                Agregar cliente
              </Button>
            </div>
          ) : undefined
        }
      />

      <div data-onboarding="customers-list">
        <CustomerList
          customers={customers}
          onEdit={openEdit}
          onDelete={handleDelete}
          onAdd={canEditCustomers ? openCreate : undefined}
          loading={loading}
          canDelete={canDelete}
          readOnly={!canEditCustomers}
          canManagePortal={canManagePortal}
          onActivatePortal={openPortalModal}
        />
      </div>

      {canManagePortal ? (
      <Modal state={portalModal}>
        <Modal.Backdrop>
          <Modal.Container placement="center">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>
                  {portalCustomer?.hasPortalAccess
                    ? "Actualizar acceso al portal"
                    : "Activar cuenta de cliente"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  {portalCustomer
                    ? `${portalCustomer.name} · ${portalCustomer.email}`
                    : ""}
                </p>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Contraseña</span>
                  <input
                    type="password"
                    className="rounded-xl border border-separator bg-field-background px-3 py-2 text-field-foreground placeholder:text-field-placeholder"
                    value={portalPassword}
                    onChange={(e) => setPortalPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </label>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => portalModal.close()}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  isDisabled={pending || portalPassword.length < 6}
                  onPress={() => void handleActivatePortal()}
                >
                  {pending ? "Guardando..." : "Guardar contraseña"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
      ) : null}

      {canEditCustomers ? (
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
      ) : null}
    </div>
  );
}
