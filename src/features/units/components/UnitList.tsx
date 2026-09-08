"use client";

import { useMemo } from "react";
import { Button } from "@heroui/react";
import Cube from "@gravity-ui/icons/Cube";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import {
  TablePro,
  type TableProColumn,
} from "@/shared/components/TablePro";
import type { Unit } from "../types";

interface Props {
  units: Unit[];
  onEdit: (unit: Unit) => void;
  onDelete: (id: number) => void;
  onAdd?: () => void;
  loading?: boolean;
  canDelete?: boolean;
}

export function UnitList({
  units,
  onEdit,
  onDelete,
  onAdd,
  loading,
  canDelete = true,
}: Props) {
  const columns = useMemo<TableProColumn<Unit>[]>(
    () => [
      {
        id: "name",
        label: "Nombre",
        getSortValue: (u) => u.name.toLowerCase(),
        getSearchValue: (u) =>
          `${u.name} ${u.abbreviation} ${u.description ?? ""}`,
        render: (u) => <span className="font-medium">{u.name}</span>,
      },
      {
        id: "abbreviation",
        label: "Abreviatura",
        getSortValue: (u) => u.abbreviation.toLowerCase(),
        render: (u) => (
          <span className="tabular-nums text-sm">{u.abbreviation}</span>
        ),
      },
      {
        id: "description",
        label: "Descripción",
        getSortValue: (u) => (u.description ?? "").toLowerCase(),
        render: (u) => (
          <span className="text-sm text-muted">{u.description || "—"}</span>
        ),
      },
      {
        id: "factor",
        label: "Factor",
        align: "right",
        getSortValue: (u) => u.factor,
        render: (u) => (
          <span className="tabular-nums text-sm">{u.factor || "—"}</span>
        ),
      },
      {
        id: "productsCount",
        label: "Productos",
        align: "right",
        getSortValue: (u) => u.productsCount ?? 0,
        render: (u) => (
          <span className="tabular-nums">{u.productsCount ?? 0}</span>
        ),
      },
      {
        id: "actions",
        label: "Acciones",
        sortable: false,
        render: (unit) => (
          <div className="flex gap-1">
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              onPress={() => onEdit(unit)}
            >
              <Pencil width={16} height={16} />
            </Button>
            {canDelete ? (
              <Button
                isIconOnly
                size="sm"
                variant="danger"
                onPress={() => onDelete(unit.id)}
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

  if (units.length === 0) {
    return (
      <ContentCard>
        <EmptyState
          icon={<Cube width={40} height={40} />}
          title="No hay unidades registradas"
          description="Crea unidades de medida (ml, L, und, g…) para tus productos."
          actionLabel="Agregar unidad"
          onAction={onAdd}
        />
      </ContentCard>
    );
  }

  return (
    <TablePro
      columns={columns}
      rows={units}
      getRowId={(u) => u.id}
      searchPlaceholder="Nombre o abreviatura..."
      emptyMessage="No se encontraron unidades"
      defaultRowsPerPage={10}
    />
  );
}
