"use client";

import { useMemo } from "react";
import { Button } from "@heroui/react";
import Tag from "@gravity-ui/icons/Tag";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import {
  TablePro,
  type TableProColumn,
} from "@/shared/components/TablePro";
import type { Category } from "../types";

interface Props {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
  onAdd?: () => void;
  loading?: boolean;
  canDelete?: boolean;
}

export function CategoryList({
  categories,
  onEdit,
  onDelete,
  onAdd,
  loading,
  canDelete = true,
}: Props) {
  const columns = useMemo<TableProColumn<Category>[]>(
    () => [
      {
        id: "name",
        label: "Nombre",
        getSortValue: (c) => c.name.toLowerCase(),
        getSearchValue: (c) => `${c.name} ${c.description}`,
        render: (c) => <span className="font-medium">{c.name}</span>,
      },
      {
        id: "description",
        label: "Descripción",
        getSortValue: (c) => (c.description ?? "").toLowerCase(),
        render: (c) => (
          <span className="text-sm text-muted">{c.description || "—"}</span>
        ),
      },
      {
        id: "productsCount",
        label: "Productos",
        align: "right",
        getSortValue: (c) => c.productsCount ?? 0,
        render: (c) => (
          <span className="tabular-nums">{c.productsCount ?? 0}</span>
        ),
      },
      {
        id: "actions",
        label: "Acciones",
        sortable: false,
        render: (category) => (
          <div className="flex gap-1">
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              onPress={() => onEdit(category)}
            >
              <Pencil width={16} height={16} />
            </Button>
            {canDelete ? (
              <Button
                isIconOnly
                size="sm"
                variant="danger"
                onPress={() => onDelete(category.id)}
              >
                <TrashBin width={16} height={16} />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, onDelete, onEdit],
  );

  if (loading) {
    return (
      <ContentCard>
        <TableSkeleton rows={4} />
      </ContentCard>
    );
  }

  if (categories.length === 0) {
    return (
      <ContentCard>
        <EmptyState
          icon={<Tag width={40} height={40} />}
          title="No hay categorías registradas"
          description="Crea categorías para organizar tus productos."
          actionLabel="Agregar categoría"
          onAction={onAdd}
        />
      </ContentCard>
    );
  }

  return (
    <TablePro
      columns={columns}
      rows={categories}
      getRowId={(c) => c.id}
      searchPlaceholder="Nombre o descripción..."
      emptyMessage="No se encontraron categorías"
      defaultRowsPerPage={10}
    />
  );
}
