"use client";

import { useMemo, useState } from "react";
import { Button, Table, Pagination, SearchField, Label } from "@heroui/react";
import Person from "@gravity-ui/icons/Person";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import type { Customer } from "../types";

interface Props {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: number) => void;
  onAdd?: () => void;
  loading?: boolean;
}

const PAGE_SIZE = 10;

export function CustomerList({ customers, onEdit, onDelete, onAdd, loading }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.lastnames.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.includes(search) ||
          c.email.toLowerCase().includes(search.toLowerCase()),
      ),
    [customers, search],
  );

  const columns = useMemo(
    () => [
      { accessorKey: "name" as const, header: "Nombre" },
      { accessorKey: "lastnames" as const, header: "Apellidos" },
      { accessorKey: "phone" as const, header: "Teléfono" },
      { accessorKey: "email" as const, header: "Correo" },
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
          description="Agrega tu primer cliente para poder agendar turnos en la agenda."
          actionLabel="Agregar cliente"
          onAction={onAdd}
        />
      </ContentCard>
    );
  }

  return (
    <ContentCard>
      <div className="flex flex-col gap-4 p-6">
        <SearchField value={search} onChange={setSearch}>
          <Label>Buscar cliente</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="w-full sm:w-[320px]" placeholder="Nombre, teléfono o correo..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Clientes" className="min-w-[600px]">
              <Table.Header>
                <Table.Column isRowHeader>Nombre</Table.Column>
                <Table.Column>Apellidos</Table.Column>
                <Table.Column>Teléfono</Table.Column>
                <Table.Column>Correo</Table.Column>
                <Table.Column>Acciones</Table.Column>
              </Table.Header>
              <Table.Body>
                {pageRows.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5}>
                      <div className="py-8 text-center text-sm text-muted">
                        No se encontraron clientes con &quot;{search}&quot;
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  pageRows.map((row) => {
                    const customer = row.original;
                    return (
                      <Table.Row key={customer.id}>
                        <Table.Cell>
                          <span className="font-medium">{customer.name}</span>
                        </Table.Cell>
                        <Table.Cell>{customer.lastnames}</Table.Cell>
                        <Table.Cell className="text-muted">{customer.phone}</Table.Cell>
                        <Table.Cell className="text-muted">{customer.email}</Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button isIconOnly size="sm" variant="ghost" onPress={() => onEdit(customer)}>
                              <Pencil width={16} height={16} />
                            </Button>
                            <Button isIconOnly size="sm" variant="danger" onPress={() => onDelete(customer.id)}>
                              <TrashBin width={16} height={16} />
                            </Button>
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
        )}
      </div>
    </ContentCard>
  );
}
