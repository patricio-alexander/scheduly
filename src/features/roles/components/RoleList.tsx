"use client";

import { useMemo, useState } from "react";
import { Button, Table, Pagination, SearchField, Label } from "@heroui/react";
import Shield from "@gravity-ui/icons/Shield";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import { roleDisplayLabel } from "@/shared/utils/system-roles";
import type { Role } from "../types";

interface Props {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (id: number) => void;
  onAdd?: () => void;
  loading?: boolean;
  canDelete?: boolean;
}

const PAGE_SIZE = 10;

export function RoleList({
  roles,
  onEdit,
  onDelete,
  onAdd,
  loading,
  canDelete = true,
}: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      roles.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [roles, search],
  );

  const columns = useMemo(
    () => [
      { accessorKey: "name" as const, header: "Nombre" },
      { accessorKey: "usersCount" as const, header: "Usuarios" },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    pageCount: Math.ceil(filtered.length / PAGE_SIZE),
    state: { pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE } },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: page - 1, pageSize: PAGE_SIZE })
          : updater;
      setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  const totalPages = table.getPageCount();
  const pageRows = table.getRowModel().rows;

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
    <ContentCard>
      <div className="flex flex-col gap-4 p-6">
        <SearchField value={search} onChange={setSearch}>
          <Label>Buscar rol</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              className="w-full sm:w-[320px]"
              placeholder="Nombre del rol..."
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Roles" className="min-w-[360px]">
              <Table.Header>
                <Table.Column isRowHeader>Nombre</Table.Column>
                <Table.Column>Usuarios</Table.Column>
                <Table.Column>Acciones</Table.Column>
              </Table.Header>
              <Table.Body>
                {pageRows.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={3}>
                      <div className="py-8 text-center text-sm text-muted">
                        No se encontraron roles con &quot;{search}&quot;
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  pageRows.map((row) => {
                    const role = row.original;
                    return (
                      <Table.Row key={role.id}>
                        <Table.Cell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">
                              {roleDisplayLabel(role.name)}
                            </span>
                            {role.system ? (
                              <span className="text-[11px] text-muted">
                                Rol del sistema
                              </span>
                            ) : null}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="tabular-nums">
                            {role.usersCount ?? 0}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            {!role.system ? (
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
                            {role.system ? (
                              <span className="px-2 text-xs text-muted">—</span>
                            ) : null}
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>

        {filtered.length > PAGE_SIZE && (
          <Table.Footer>
            <Pagination size="sm">
              <Pagination.Summary>
                {table.getState().pagination.pageIndex * PAGE_SIZE + 1} a{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * PAGE_SIZE,
                  filtered.length,
                )}{" "}
                de {filtered.length} resultados
              </Pagination.Summary>
              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.Previous
                    isDisabled={!table.getCanPreviousPage()}
                    onPress={() => table.previousPage()}
                  >
                    <Pagination.PreviousIcon />
                  </Pagination.Previous>
                </Pagination.Item>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Pagination.Item key={p}>
                    <Pagination.Link
                      isActive={p === page}
                      onPress={() => setPage(p)}
                    >
                      {p}
                    </Pagination.Link>
                  </Pagination.Item>
                ))}
                <Pagination.Item>
                  <Pagination.Next
                    isDisabled={!table.getCanNextPage()}
                    onPress={() => table.nextPage()}
                  >
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            </Pagination>
          </Table.Footer>
        )}
      </div>
    </ContentCard>
  );
}
