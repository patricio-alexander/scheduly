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
import { canDeleteRecords } from "@/shared/utils/roles";
import Plus from "@gravity-ui/icons/Plus";
import Tag from "@gravity-ui/icons/Tag";
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

export default function InventoryCategoriesPage() {
  const { user } = useAuth();
  const canDelete = canDeleteRecords(user?.role);
  const { categories, loading, refetch } = useCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();

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

  const {
    displayItems,
    isTourDemo,
    prepareTour,
    cleanupTour,
    commitDemoCreate,
    tourActive,
  } = useEntityCreateTourDemo<Category>({
    moduleId: "categories",
    items: categories,
    openCreate,
    closeModal,
    buildDemoItem: () => ({
      id: -9001,
      name: ENTITY_CREATE_DEMOS.categories.name,
      description: ENTITY_CREATE_DEMOS.categories.description,
      commissionPct: 0,
      productsCount: 0,
    }),
  });

  const handleSubmit = useCallback(
    async (data: CategoryFormData) => {
      if (isTourDemo() && commitDemoCreate()) return;
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
    [editing, closeModal, refetch, isTourDemo, commitDemoCreate],
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

  if (!user) return null;

  return (
    <EntityCreateTutorialProvider
      moduleId="categories"
      prepareTour={prepareTour}
      cleanupTour={cleanupTour}
      openCreateForm={openCreate}
      resetFormTour={closeModal}
    >
      <div className="flex flex-col gap-6">
        <PageHeader
          icon={<Tag width={24} height={24} />}
          title="Categorías"
          description="Organiza tus productos en categorías"
          action={
            <div className="flex items-center gap-2">
              <EntityCreateHelpButton title="Tutorial: Categorías" />
              <Button
                variant="primary"
                onPress={openCreate}
                data-tour="categories-create"
              >
                <Plus width={16} height={16} />
                Agregar categoría
              </Button>
            </div>
          }
        />

        <div
          data-tour={
            displayItems.length === 0 ? "categories-empty" : "categories-list"
          }
        >
          <CategoryList
            categories={displayItems}
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
                    <Tag width={20} height={20} />
                  </Modal.Icon>
                  <Modal.Heading>
                    {editing ? "Editar categoría" : "Nueva categoría"}
                  </Modal.Heading>
                  <div className="ml-auto">
                    <EntityCreateHelpButton
                      inModal
                      title="Tutorial: cómo registrar una categoría"
                    />
                  </div>
                </Modal.Header>
                <Modal.Body className={ENTITY_MODAL_BODY_CLASS}>
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
                    data-tour="categories-form-submit"
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
