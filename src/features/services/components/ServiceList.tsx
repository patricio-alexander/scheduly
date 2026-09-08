"use client";

import { useMemo } from "react";
import { Button } from "@heroui/react";
import Gear from "@gravity-ui/icons/Gear";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import {
  TablePro,
  type TableProColumn,
} from "@/shared/components/TablePro";
import { formatMoney } from "@/shared/utils/money";
import type { Service } from "../types";

interface Props {
  services: Service[];
  onEdit: (service: Service) => void;
  onDelete: (id: number) => void;
  onAdd?: () => void;
  loading?: boolean;
  canEdit?: boolean;
}

export function ServiceList({
  services,
  onEdit,
  onDelete,
  onAdd,
  loading,
  canEdit = true,
}: Props) {
  const columns = useMemo<TableProColumn<Service>[]>(
    () => [
      {
        id: "name",
        label: "Nombre",
        getSortValue: (s) => s.name.toLowerCase(),
        getSearchValue: (s) => s.name,
        render: (s) => <span className="font-medium">{s.name}</span>,
      },
      {
        id: "durationMinutes",
        label: "Duración",
        align: "right",
        getSortValue: (s) => s.durationMinutes ?? 30,
        render: (s) => (
          <span className="tabular-nums text-muted">
            {s.durationMinutes ?? 30} min
          </span>
        ),
      },
      {
        id: "price",
        label: "Precio",
        align: "right",
        getSortValue: (s) => s.price,
        render: (s) => (
          <span className="font-medium tabular-nums">{formatMoney(s.price)}</span>
        ),
      },
      {
        id: "commissionPct",
        label: "Comisión",
        align: "right",
        getSortValue: (s) => s.commissionPct ?? 15,
        render: (s) => (
          <span className="tabular-nums text-muted">
            {s.commissionPct ?? 15}%
          </span>
        ),
      },
      {
        id: "actions",
        label: "Acciones",
        sortable: false,
        render: (service) =>
          canEdit ? (
            <div className="flex gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                onPress={() => onEdit(service)}
              >
                <Pencil width={16} height={16} />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="danger"
                onPress={() => onDelete(service.id)}
              >
                <TrashBin width={16} height={16} />
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted">—</span>
          ),
      },
    ],
    [canEdit, onDelete, onEdit],
  );

  if (loading) {
    return (
      <ContentCard>
        <TableSkeleton rows={4} />
      </ContentCard>
    );
  }

  if (services.length === 0) {
    return (
      <ContentCard>
        <EmptyState
          icon={<Gear width={40} height={40} />}
          title="No hay servicios registrados"
          description="Define los servicios que ofreces para asociarlos a las reservas."
          actionLabel="Agregar servicio"
          onAction={onAdd}
        />
      </ContentCard>
    );
  }

  return (
    <TablePro
      columns={columns}
      rows={services}
      getRowId={(s) => s.id}
      searchPlaceholder="Nombre del servicio..."
      emptyMessage="No se encontraron servicios"
      defaultRowsPerPage={10}
    />
  );
}
