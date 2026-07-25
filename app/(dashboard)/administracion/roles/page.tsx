"use client";

import { useCallback, useState } from "react";
import { Button, Modal, useOverlayState, toast } from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import { RoleForm, RoleList, useRoles } from "@/src/features/roles";
import type { Role, RoleFormData } from "@/src/features/roles";
import * as roleService from "@/src/features/roles/services/role-service";
import { PageHeader } from "@/shared/components/ui";
import { canDeleteRecords, isAdminRole } from "@/shared/utils/roles";
import Plus from "@gravity-ui/icons/Plus";
import Shield from "@gravity-ui/icons/Shield";

export default function RolesPage() {
  const { user } = useAuth();
  const canDelete = canDeleteRecords(user?.role);
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

  const handleSubmit = useCallback(
    async (data: RoleFormData) => {
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
    [editing, closeModal, refetch],
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

  if (!user || !isAdminRole(user.role)) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Shield width={24} height={24} />}
        title="Roles"
        description="Administra permisos y roles de acceso del sistema"
        action={
          <Button variant="primary" onPress={openCreate}>
            <Plus width={16} height={16} />
            Agregar rol
          </Button>
        }
      />

      <RoleList
        roles={roles}
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
                  <Shield width={20} height={20} />
                </Modal.Icon>
                <Modal.Heading>
                  {editing ? "Editar rol" : "Nuevo rol"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
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
