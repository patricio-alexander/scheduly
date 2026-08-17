"use client";

import { useMemo, useState } from "react";
import { Button, Pagination, SearchField, Label, Table } from "@heroui/react";
import Person from "@gravity-ui/icons/Person";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import type { Supplier } from "../types";

interface Props {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: number) => void;
  onAdd?: () => void;
  loading?: boolean;
  canDelete?: boolean;
}

const PAGE_SIZE = 10;

export function SupplierList({
  suppliers,
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
      suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.phone.includes(search) ||
          s.email.toLowerCase().includes(search.toLowerCase()) ||
          (s.taxId ?? "").includes(search),
      ),
    [suppliers, search],
  );

  const columns = useMemo(
    () => [{ accessorKey: "name" as const, header: "Nombre" }],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    pageCount: Math.ceil(filtered.length / PAGE_SIZE) || 1,
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

  const pageRows = table.getRowModel().rows;
  const totalPages = table.getPageCount();

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
    <ContentCard>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <SearchField value={search} onChange={setSearch}>
          <Label>Buscar proveedor</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              className="w-full sm:w-[320px]"
              placeholder="Nombre, teléfono, RUC..."
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Proveedores" className="min-w-[640px]">
              <Table.Header>
                <Table.Column isRowHeader>Nombre</Table.Column>
                <Table.Column>Teléfono</Table.Column>
                <Table.Column>Correo</Table.Column>
                <Table.Column>RUC</Table.Column>
                <Table.Column>Acciones</Table.Column>
              </Table.Header>
              <Table.Body>
                {pageRows.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5}>
                      <div className="py-8 text-center text-sm text-muted">
                        No se encontraron proveedores con &quot;{search}&quot;
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  pageRows.map((row) => {
                    const supplier = row.original;
                    return (
                      <Table.Row key={supplier.id}>
                        <Table.Cell>
                          <span className="font-medium">{supplier.name}</span>
                        </Table.Cell>
                        <Table.Cell className="text-muted">
                          {supplier.phone || "—"}
                        </Table.Cell>
                        <Table.Cell className="text-muted">
                          {supplier.email || "—"}
                        </Table.Cell>
                        <Table.Cell className="text-muted">
                          {supplier.taxId || "—"}
                        </Table.Cell>
                        <Table.Cell>
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
                        </Table.Cell>
                      </Table.Row>
                    );
                  })
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>

        {filtered.length > PAGE_SIZE ? (
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
                    <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>
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
        ) : null}
      </div>
    </ContentCard>
  );
}
