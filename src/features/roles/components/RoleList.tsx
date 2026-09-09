"use client";

import { useMemo } from "react";
import { Button } from "@heroui/react";
import Shield from "@gravity-ui/icons/Shield";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import {
  TablePro,
  type TableProColumn,
} from "@/shared/components/TablePro";
import { roleDisplayLabel } from "@/shared/utils/system-roles";
import type { Role } from "../types";

interface Props {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (id: number) => void;
  onAdd?: () => void;
  loading?: boolean;
  canDelete?: boolean;
  /** Si false, no muestra lápiz de editar (p. ej. Programador solo lectura). */
  canEdit?: boolean;
}

export function RoleList({
  roles,
  onEdit,
  onDelete,
  onAdd,
  loading,
  canDelete = true,
  canEdit = true,
}: Props) {
  const columns = useMemo<TableProColumn<Role>[]>(
    () => [
      {
        id: "name",
        label: "Nombre",
        getSortValue: (r) => roleDisplayLabel(r.name).toLowerCase(),
        getSearchValue: (r) => roleDisplayLabel(r.name),
        render: (r) => (
          <span className="font-medium">{roleDisplayLabel(r.name)}</span>
        ),
      },
      {
        id: "usersCount",
        label: "Usuarios",
        align: "right",
        getSortValue: (r) => r.usersCount ?? 0,
        render: (r) => (
          <span className="tabular-nums">{r.usersCount ?? 0}</span>
        ),
      },
      {
        id: "actions",
        label: "Acciones",
        sortable: false,
        render: (role) => (
          <div className="flex gap-1">
            {canEdit && !role.system ? (
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                onPress={() => onEdit(role)}
              >
                <Pencil width={16} height={16} />
              </Button>
            ) : null}
            {canDelete && !role.system ? (
              <Button
                isIconOnly
                size="sm"
                variant="danger"
                onPress={() => onDelete(role.id)}
              >
                <TrashBin width={16} height={16} />
              </Button>
            ) : null}
            {role.system || (!canEdit && !canDelete) ? (
              <span className="px-2 text-xs text-muted">—</span>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, canEdit, onDelete, onEdit],
  );

  if (loading) {
    return (
      <ContentCard>
        <TableSkeleton rows={4} />
      </ContentCard>
    );
  }

  if (roles.length === 0) {
    return (
      <ContentCard>
        <EmptyState
          icon={<Shield width={40} height={40} />}
          title="No hay roles registrados"
          description="Crea roles para organizar los permisos de tu equipo."
          actionLabel="Agregar rol"
          onAction={onAdd}
        />
      </ContentCard>
    );
  }

  return (
    <TablePro
      columns={columns}
      rows={roles}
      getRowId={(r) => r.id}
      searchPlaceholder="Nombre del rol..."
      emptyMessage="No se encontraron roles"
      defaultRowsPerPage={10}
    />
  );
}
