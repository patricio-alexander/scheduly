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
import type { Customer } from "../types";

interface Props {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: number) => void;
  onAdd?: () => void;
  loading?: boolean;
  canDelete?: boolean;
  readOnly?: boolean;
  canManagePortal?: boolean;
  onActivatePortal?: (customer: Customer) => void;
}

export function CustomerList({
  customers,
  onEdit,
  onDelete,
  onAdd,
  loading,
  canDelete = true,
  readOnly = false,
  canManagePortal = false,
  onActivatePortal,
}: Props) {
  const showActions = !readOnly || canManagePortal;

  const columns = useMemo<TableProColumn<Customer>[]>(() => {
    const cols: TableProColumn<Customer>[] = [
      {
        id: "name",
        label: "Nombre",
        getSortValue: (c) => c.name.toLowerCase(),
        getSearchValue: (c) =>
          [
            c.name,
            c.lastnames,
            c.phone,
            c.email,
            c.identification,
            c.address,
          ].join(" "),
        render: (c) => <span className="font-medium">{c.name}</span>,
      },
      {
        id: "lastnames",
        label: "Apellidos",
        getSortValue: (c) => c.lastnames.toLowerCase(),
      },
      {
        id: "identification",
        label: "Cédula / ID",
        getSortValue: (c) => c.identification ?? "",
        render: (c) => (
          <span className="font-mono text-xs">{c.identification || "—"}</span>
        ),
      },
      {
        id: "address",
        label: "Dirección",
        getSortValue: (c) => c.address ?? "",
        render: (c) => (
          <span className="text-muted">{c.address || "—"}</span>
        ),
      },
      {
        id: "isActive",
        label: "Estado",
        getSortValue: (c) => (c.isActive === false ? 0 : 1),
        render: (c) => (
          <span
            className={
              c.isActive === false ? "text-danger" : "text-success"
            }
          >
            {c.isActive === false ? "Inactivo" : "Activo"}
          </span>
        ),
      },
      {
        id: "phone",
        label: "Teléfono",
        getSortValue: (c) => c.phone,
        render: (c) => <span className="text-muted">{c.phone || "—"}</span>,
      },
      {
        id: "email",
        label: "Correo",
        getSortValue: (c) => c.email.toLowerCase(),
        render: (c) => <span className="text-muted">{c.email || "—"}</span>,
      },
    ];
    if (showActions) {
      cols.push({
        id: "actions",
        label: readOnly ? "Portal" : "Acciones",
        sortable: false,
        render: (customer) => (
          <div className="flex flex-wrap items-center gap-1">
            {canManagePortal ? (
              <Button
                size="sm"
                variant={customer.hasPortalAccess ? "secondary" : "primary"}
                onPress={() => onActivatePortal?.(customer)}
              >
                {customer.hasPortalAccess ? "Portal activo" : "Activar portal"}
              </Button>
            ) : null}
            {!readOnly ? (
              <>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  onPress={() => onEdit(customer)}
                >
                  <Pencil width={16} height={16} />
                </Button>
                {canDelete ? (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="danger"
                    onPress={() => onDelete(customer.id)}
                  >
                    <TrashBin width={16} height={16} />
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        ),
      });
    }
    return cols;
  }, [
    canDelete,
    canManagePortal,
    onActivatePortal,
    onDelete,
    onEdit,
    readOnly,
    showActions,
  ]);

  if (loading) {
    return (
      <ContentCard>
        <TableSkeleton />
      </ContentCard>
    );
  }

  if (customers.length === 0) {
    return (
      <ContentCard>
        <EmptyState
          icon={<Person width={40} height={40} />}
          title="No hay clientes registrados"
          description={
            readOnly
              ? "Aún no hay clientes en el sistema."
              : "Agrega tu primer cliente para poder agendar turnos en la agenda."
          }
          actionLabel={readOnly ? undefined : "Agregar cliente"}
          onAction={readOnly ? undefined : onAdd}
        />
      </ContentCard>
    );
  }

  return (
    <TablePro
      columns={columns}
      rows={customers}
      getRowId={(c) => c.id}
      searchPlaceholder="Nombre, cédula, teléfono o correo..."
      emptyMessage="No se encontraron clientes"
      defaultRowsPerPage={10}
    />
  );
}
