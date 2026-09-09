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

  const {
    displayItems,
    isTourDemo,
    prepareTour,
    cleanupTour,
    commitDemoCreate,
    tourActive,
  } = useEntityCreateTourDemo<Customer>({
    moduleId: "customers",
    items: customers,
    openCreate,
    closeModal,
    buildDemoItem: () => ({
      id: -9001,
      name: ENTITY_CREATE_DEMOS.customers.name,
      lastnames: ENTITY_CREATE_DEMOS.customers.lastnames,
      phone: ENTITY_CREATE_DEMOS.customers.phone,
      email: ENTITY_CREATE_DEMOS.customers.email,
      identificationType: null,
      identification: null,
      address: "",
    }),
  });

  const handleSubmit = useCallback(
    async (data: CustomerFormData) => {
      if (isTourDemo() && commitDemoCreate()) return;
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
    [editing, closeModal, refetch, isTourDemo, commitDemoCreate],
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

  if (!user) return null;

  return (
    <EntityCreateTutorialProvider
      moduleId="customers"
      prepareTour={prepareTour}
      cleanupTour={cleanupTour}
      openCreateForm={openCreate}
      resetFormTour={closeModal}
      enabled={canEditCustomers}
    >
      <div className="flex flex-col gap-6">
        <PageHeader
          icon={<Person width={24} height={24} />}
          title="Clientes"
          description="Gestiona tu base de clientes y sus datos de contacto"
          action={
            canEditCustomers ? (
              <div className="flex items-center gap-2">
                <EntityCreateHelpButton title="Tutorial: Clientes" />
                <Button
                  variant="primary"
                  onPress={openCreate}
                  data-tour="customers-create"
                >
                  <Plus width={16} height={16} />
                  Agregar cliente
                </Button>
              </div>
            ) : undefined
          }
        />

        <div
          data-tour={
            displayItems.length === 0 ? "customers-empty" : "customers-list"
          }
        >
          <CustomerList
            customers={displayItems}
            onEdit={openEdit}
            onDelete={handleDelete}
            onAdd={canEditCustomers ? openCreate : undefined}
            loading={loading && !tourActive}
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
                    <Button
                      variant="secondary"
                      onPress={() => portalModal.close()}
                    >
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
                <Modal.Dialog className={ENTITY_MODAL_DIALOG_CLASS}>
                  <Modal.CloseTrigger />
                  <Modal.Header className={ENTITY_MODAL_HEADER_CLASS}>
                    <Modal.Icon>
                      <Person width={20} height={20} />
                    </Modal.Icon>
                    <Modal.Heading>
                      {editing ? "Editar cliente" : "Nuevo cliente"}
                    </Modal.Heading>
                    <div className="ml-auto">
                      <EntityCreateHelpButton
                        inModal
                        title="Tutorial: cómo registrar un cliente"
                      />
                    </div>
                  </Modal.Header>
                  <Modal.Body className={ENTITY_MODAL_BODY_CLASS}>
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
                      data-tour="customers-form-submit"
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
