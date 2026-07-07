"use client";

import { useMemo, useState } from "react";
import { Button, Table, Pagination, SearchField, Label } from "@heroui/react";
import Gear from "@gravity-ui/icons/Gear";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import type { Service } from "../types";

interface Props {
  services: Service[];
  onEdit: (service: Service) => void;
  onDelete: (id: number) => void;
  onAdd?: () => void;
  loading?: boolean;
}

const PAGE_SIZE = 10;

export function ServiceList({ services, onEdit, onDelete, onAdd, loading }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [services, search],
  );

  const columns = useMemo(
    () => [
      { accessorKey: "name" as const, header: "Nombre" },
      { accessorKey: "price" as const, header: "Precio" },
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

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(price);

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
          description="Define los servicios que ofreces para asociarlos a los turnos."
          actionLabel="Agregar servicio"
          onAction={onAdd}
        />
      </ContentCard>
    );
  }

  return (
    <ContentCard>
      <div className="flex flex-col gap-4 p-6">
        <SearchField value={search} onChange={setSearch}>
          <Label>Buscar servicio</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="w-full sm:w-[320px]" placeholder="Nombre del servicio..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Servicios" className="min-w-[400px]">
              <Table.Header>
                <Table.Column isRowHeader>Nombre</Table.Column>
                <Table.Column>Precio</Table.Column>
                <Table.Column>Acciones</Table.Column>
              </Table.Header>
              <Table.Body>
                {pageRows.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={3}>
                      <div className="py-8 text-center text-sm text-muted">
                        No se encontraron servicios con &quot;{search}&quot;
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  pageRows.map((row) => {
                    const service = row.original;
                    return (
                      <Table.Row key={service.id}>
                        <Table.Cell>
                          <span className="font-medium">{service.name}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="font-medium tabular-nums">{formatPrice(service.price)}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button isIconOnly size="sm" variant="ghost" onPress={() => onEdit(service)}>
                              <Pencil width={16} height={16} />
                            </Button>
                            <Button isIconOnly size="sm" variant="danger" onPress={() => onDelete(service.id)}>
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
