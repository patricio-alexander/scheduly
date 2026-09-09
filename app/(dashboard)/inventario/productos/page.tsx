"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Modal, useOverlayState, toast } from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import { ProductList, ProductForm, useProducts } from "@/src/features/products";
import type { Product } from "@/src/features/products";
import type { ProductFormData } from "@/src/features/products";
import * as productService from "@/src/features/products/services/product-service";
import { useCategories } from "@/src/features/categories";
import { useUnits } from "@/src/features/units";
import { PageHeader } from "@/shared/components/ui";
import { canDeleteRecords, isManagementRole } from "@/shared/utils/roles";
import Plus from "@gravity-ui/icons/Plus";
import Boxes3 from "@gravity-ui/icons/Boxes3";
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

export default function ProductsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const canDelete = canDeleteRecords(user?.role);
  const canManage = isManagementRole(user?.role);
  const { products, loading, refetch } = useProducts();
  const { categories } = useCategories();
  const { units } = useUnits();
  const [editing, setEditing] = useState<Product | null>(null);
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();

  const highlightProductId = useMemo(() => {
    const raw = searchParams.get("productId");
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  }, [searchParams]);

  const highlightQuery = searchParams.get("q");

  const openCreate = useCallback(() => {
    setEditing(null);
    modal.open();
  }, [modal]);

  const openEdit = useCallback(
    (product: Product) => {
      setEditing(product);
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
  } = useEntityCreateTourDemo<Product>({
    moduleId: "products",
    items: products,
    openCreate,
    closeModal,
    buildDemoItem: () => ({
      id: -9001,
      name: ENTITY_CREATE_DEMOS.products.name,
      price: ENTITY_CREATE_DEMOS.products.price,
      stock: ENTITY_CREATE_DEMOS.products.stock,
      categoryId: null,
      unitId: null,
      commissionPct: ENTITY_CREATE_DEMOS.products.commissionPct,
    }),
  });

  const resolvedHighlightId = useMemo(() => {
    if (highlightProductId != null) return highlightProductId;
    if (!highlightQuery || displayItems.length === 0) return null;
    const q = highlightQuery.toLowerCase().trim();
    const match =
      displayItems.find((p) => p.name.toLowerCase() === q) ??
      displayItems.find((p) => p.name.toLowerCase().includes(q));
    return match?.id ?? null;
  }, [highlightProductId, highlightQuery, displayItems]);

  const handleSubmit = useCallback(
    async (data: ProductFormData) => {
      if (isTourDemo() && commitDemoCreate()) return;
      setPending(true);
      try {
        if (editing) {
          await productService.updateProduct(editing.id, data);
          toast.success("Producto actualizado");
        } else {
          await productService.createProduct(data);
          toast.success("Producto creado");
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
      if (!confirm("¿Eliminar este producto?")) return;
      try {
        await productService.deleteProduct(id);
        toast.success("Producto eliminado");
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
      moduleId="products"
      prepareTour={prepareTour}
      cleanupTour={cleanupTour}
      openCreateForm={openCreate}
      resetFormTour={closeModal}
      enabled={canManage}
    >
      <div className="flex flex-col gap-6">
        <PageHeader
          icon={<Boxes3 width={24} height={24} />}
          title="Productos"
          description={
            canManage
              ? "Gestiona el catálogo de productos de tu negocio"
              : "Consulta precios, stock y busca en el catálogo"
          }
          action={
            canManage ? (
              <div className="flex items-center gap-2">
                <EntityCreateHelpButton title="Tutorial: Productos" />
                <Button
                  variant="primary"
                  onPress={openCreate}
                  data-tour="products-create"
                >
                  <Plus width={16} height={16} />
                  Agregar producto
                </Button>
              </div>
            ) : undefined
          }
        />

        <div
          data-tour={
            displayItems.length === 0 ? "products-empty" : "products-list"
          }
        >
          <ProductList
            products={displayItems}
            categories={categories}
            onEdit={openEdit}
            onDelete={handleDelete}
            onAdd={canManage ? openCreate : undefined}
            loading={loading && !tourActive}
            canDelete={canDelete}
            readOnly={!canManage}
            highlightProductId={resolvedHighlightId}
          />
        </div>

        {canManage ? (
          <Modal state={modal}>
            <Modal.Backdrop>
              <Modal.Container placement="center">
                <Modal.Dialog className={ENTITY_MODAL_DIALOG_CLASS}>
                  <Modal.CloseTrigger />
                  <Modal.Header className={ENTITY_MODAL_HEADER_CLASS}>
                    <Modal.Icon>
                      <Boxes3 width={20} height={20} />
                    </Modal.Icon>
                    <Modal.Heading>
                      {editing ? "Editar producto" : "Nuevo producto"}
                    </Modal.Heading>
                    <div className="ml-auto">
                      <EntityCreateHelpButton
                        inModal
                        title="Tutorial: cómo registrar un producto"
                      />
                    </div>
                  </Modal.Header>
                  <Modal.Body className={ENTITY_MODAL_BODY_CLASS}>
                    <ProductForm
                      key={editing?.id ?? "new"}
                      defaultValues={editing ?? undefined}
                      categories={categories}
                      units={units}
                      onSubmit={handleSubmit}
                      formId="product-form"
                    />
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onPress={closeModal}>
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      isDisabled={pending}
                      form="product-form"
                      type="submit"
                      data-tour="products-form-submit"
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
