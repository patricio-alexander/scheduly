"use client";

import { useMemo } from "react";
import { Button } from "@heroui/react";
import Person from "@gravity-ui/icons/Person";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import {
  TablePro,
  type TableProColumn,
} from "@/shared/components/TablePro";
import type { Supplier } from "../types";

interface Props {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: number) => void;
  onAdd?: () => void;
  loading?: boolean;
  canDelete?: boolean;
}

export function SupplierList({
  suppliers,
  onEdit,
  onDelete,
  onAdd,
  loading,
  canDelete = true,
}: Props) {
  const columns = useMemo<TableProColumn<Supplier>[]>(
    () => [
      {
        id: "name",
        label: "Nombre",
        getSortValue: (s) => s.name.toLowerCase(),
        getSearchValue: (s) =>
          [s.name, s.phone, s.email, s.taxId].filter(Boolean).join(" "),
        render: (s) => <span className="font-medium">{s.name}</span>,
      },
      {
        id: "phone",
        label: "Teléfono",
        getSortValue: (s) => s.phone ?? "",
        render: (s) => <span className="text-muted">{s.phone || "—"}</span>,
      },
      {
        id: "email",
        label: "Correo",
        getSortValue: (s) => (s.email ?? "").toLowerCase(),
        render: (s) => <span className="text-muted">{s.email || "—"}</span>,
      },
      {
        id: "taxId",
        label: "RUC",
        getSortValue: (s) => s.taxId ?? "",
        render: (s) => <span className="text-muted">{s.taxId || "—"}</span>,
      },
      {
        id: "actions",
        label: "Acciones",
        sortable: false,
        render: (supplier) => (
          <div className="flex gap-1">
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              onPress={() => onEdit(supplier)}
            >
              <Pencil width={16} height={16} />
            </Button>
            {canDelete ? (
              <Button
                isIconOnly
                size="sm"
                variant="danger"
                onPress={() => onDelete(supplier.id)}
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
        <TableSkeleton />
      </ContentCard>
    );
  }

  if (suppliers.length === 0) {
    return (
      <ContentCard>
        <EmptyState
          icon={<Person width={40} height={40} />}
          title="Sin proveedores"
          description="Agrega proveedores para asociarlos a tus compras."
          actionLabel="Agregar proveedor"
          onAction={onAdd}
        />
      </ContentCard>
    );
  }

  return (
    <TablePro
      columns={columns}
      rows={suppliers}
      getRowId={(s) => s.id}
      searchPlaceholder="Nombre, teléfono, RUC..."
      emptyMessage="No se encontraron proveedores"
      defaultRowsPerPage={10}
    />
  );
}
