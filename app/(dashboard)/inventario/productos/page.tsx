"use client";

import { useState, useCallback } from "react";
import { Button, Modal, useOverlayState, toast } from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import { ProductList, ProductForm, useProducts } from "@/src/features/products";
import type { Product } from "@/src/features/products";
import type { ProductFormData } from "@/src/features/products";
import * as productService from "@/src/features/products/services/product-service";
import { useCategories } from "@/src/features/categories";
import { PageHeader } from "@/shared/components/ui";
import Plus from "@gravity-ui/icons/Plus";
import Boxes3 from "@gravity-ui/icons/Boxes3";

export default function ProductsPage() {
  const { user } = useAuth();
  const { products, loading, refetch } = useProducts();
  const { categories } = useCategories();
  const [editing, setEditing] = useState<Product | null>(null);
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();

  if (!user) return null;

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

  const handleSubmit = useCallback(
    async (data: ProductFormData) => {
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
    [editing, closeModal, refetch],
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Boxes3 width={24} height={24} />}
        title="Productos"
        description="Gestiona el catálogo de productos de tu negocio"
        action={
          <Button variant="primary" onPress={openCreate}>
            <Plus width={16} height={16} />
            Agregar producto
          </Button>
        }
      />

      <ProductList
        products={products}
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
                  <Boxes3 width={20} height={20} />
                </Modal.Icon>
                <Modal.Heading>
                  {editing ? "Editar producto" : "Nuevo producto"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <ProductForm
                  key={editing?.id ?? "new"}
                  defaultValues={editing ?? undefined}
                  categories={categories}
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
