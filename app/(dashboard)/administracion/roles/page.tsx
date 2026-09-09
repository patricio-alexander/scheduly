"use client";

import { useCallback, useState } from "react";
import { Button, Modal, useOverlayState, toast } from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import { RoleForm, RoleList, useRoles } from "@/src/features/roles";
import type { Role, RoleFormData } from "@/src/features/roles";
import * as roleService from "@/src/features/roles/services/role-service";
import { PageHeader } from "@/shared/components/ui";
import {
  canDeleteRecords,
  canEditRoles,
  canManageUsers,
} from "@/shared/utils/roles";
import Plus from "@gravity-ui/icons/Plus";
import Shield from "@gravity-ui/icons/Shield";
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

export default function RolesPage() {
  const { user } = useAuth();
  const canDelete = canDeleteRecords(user?.role);
  const canCreateRole = canEditRoles(user?.role);
  const { roles, loading, refetch } = useRoles();
  const [editing, setEditing] = useState<Role | null>(null);
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();

  const openCreate = useCallback(() => {
    setEditing(null);
    modal.open();
  }, [modal]);

  const openEdit = useCallback(
    (role: Role) => {
      setEditing(role);
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
  } = useEntityCreateTourDemo<Role>({
    moduleId: "roles",
    items: roles,
    openCreate,
    closeModal,
    buildDemoItem: () => ({
      id: -9001,
      name: ENTITY_CREATE_DEMOS.roles.name,
      usersCount: 0,
    }),
  });

  const handleSubmit = useCallback(
    async (data: RoleFormData) => {
      if (isTourDemo() && commitDemoCreate()) return;
      setPending(true);
      try {
        if (editing) {
          await roleService.updateRole(editing.id, data);
          toast.success("Rol actualizado");
        } else {
          await roleService.createRole(data);
          toast.success("Rol creado");
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
      if (!confirm("¿Eliminar este rol?")) return;
      try {
        await roleService.deleteRole(id);
        toast.success("Rol eliminado");
        refetch();
      } catch (e) {
        toast.danger(e instanceof Error ? e.message : "Error al eliminar");
      }
    },
    [refetch],
  );

  if (!user || !canManageUsers(user.role)) return null;

  return (
    <EntityCreateTutorialProvider
      moduleId="roles"
      prepareTour={prepareTour}
      cleanupTour={cleanupTour}
      openCreateForm={openCreate}
      resetFormTour={closeModal}
    >
      <div className="flex flex-col gap-6">
        <PageHeader
          icon={<Shield width={24} height={24} />}
          title="Roles"
          description="Administra permisos y roles de acceso del sistema"
          action={
            <div className="flex items-center gap-2">
              <EntityCreateHelpButton title="Tutorial: Roles" />
              {canCreateRole ? (
                <Button
                  variant="primary"
                  onPress={openCreate}
                  data-tour="roles-create"
                >
                  <Plus width={16} height={16} />
                  Agregar rol
                </Button>
              ) : null}
            </div>
          }
        />

        <div
          data-tour={
            displayItems.length === 0 ? "roles-empty" : "roles-list"
          }
        >
          <RoleList
            roles={displayItems}
            onEdit={canCreateRole ? openEdit : () => undefined}
            onDelete={canCreateRole ? handleDelete : () => undefined}
            onAdd={canCreateRole ? openCreate : undefined}
            loading={loading && !tourActive}
            canDelete={canDelete && canCreateRole}
            canEdit={canCreateRole}
          />
        </div>

        <Modal state={modal}>
          <Modal.Backdrop>
            <Modal.Container placement="center">
              <Modal.Dialog className={ENTITY_MODAL_DIALOG_CLASS}>
                <Modal.CloseTrigger />
                <Modal.Header className={ENTITY_MODAL_HEADER_CLASS}>
                  <Modal.Icon>
                    <Shield width={20} height={20} />
                  </Modal.Icon>
                  <Modal.Heading>
                    {editing ? "Editar rol" : "Nuevo rol"}
                  </Modal.Heading>
                  <div className="ml-auto">
                    <EntityCreateHelpButton
                      inModal
                      title="Tutorial: cómo registrar un rol"
                    />
                  </div>
                </Modal.Header>
                <Modal.Body className={ENTITY_MODAL_BODY_CLASS}>
                  <RoleForm
                    key={editing?.id ?? "new"}
                    defaultValues={editing ?? undefined}
                    onSubmit={handleSubmit}
                    formId="role-form"
                  />
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onPress={closeModal}>
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={pending}
                    form="role-form"
                    type="submit"
                    data-tour="roles-form-submit"
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
