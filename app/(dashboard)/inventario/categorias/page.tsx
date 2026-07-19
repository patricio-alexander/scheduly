"use client";

import { useState, useCallback } from "react";
import { Button, Modal, useOverlayState, toast } from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import {
  CategoryList,
  CategoryForm,
  useCategories,
} from "@/src/features/categories";
import type { Category } from "@/src/features/categories";
import type { CategoryFormData } from "@/src/features/categories";
import * as categoryService from "@/src/features/categories/services/category-service";
import { PageHeader } from "@/shared/components/ui";
import Plus from "@gravity-ui/icons/Plus";
import Tag from "@gravity-ui/icons/Tag";

export default function InventoryCategoriesPage() {
  const { user } = useAuth();
  const { categories, loading, refetch } = useCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();

  if (!user) return null;

  const openCreate = useCallback(() => {
    setEditing(null);
    modal.open();
  }, [modal]);

  const openEdit = useCallback(
    (category: Category) => {
      setEditing(category);
      modal.open();
    },
    [modal],
  );

  const closeModal = useCallback(() => {
    modal.close();
    setEditing(null);
  }, [modal]);

  const handleSubmit = useCallback(
    async (data: CategoryFormData) => {
      setPending(true);
      try {
        if (editing) {
          await categoryService.updateCategory(editing.id, data);
          toast.success("Categoría actualizada");
        } else {
          await categoryService.createCategory(data);
          toast.success("Categoría creada");
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
      if (!confirm("¿Eliminar esta categoría?")) return;
      try {
        await categoryService.deleteCategory(id);
        toast.success("Categoría eliminada");
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
        icon={<Tag width={24} height={24} />}
        title="Categorías"
        description="Organiza tus productos en categorías"
        action={
          <Button variant="primary" onPress={openCreate}>
            <Plus width={16} height={16} />
            Agregar categoría
          </Button>
        }
      />

      <CategoryList
        categories={categories}
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
                  <Tag width={20} height={20} />
                </Modal.Icon>
                <Modal.Heading>
                  {editing ? "Editar categoría" : "Nueva categoría"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <CategoryForm
                  defaultValues={editing ?? undefined}
                  onSubmit={handleSubmit}
                  formId="category-form"
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={closeModal}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  isDisabled={pending}
                  form="category-form"
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
