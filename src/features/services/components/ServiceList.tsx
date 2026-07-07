"use client";

import { useMemo, useState } from "react";
import { Button, Table, Pagination, SearchField, Label } from "@heroui/react";
import Plus from "@gravity-ui/icons/Plus";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
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
    () =>
      services.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase())
      ),
    [services, search]
  );

  const columns = useMemo(
    () => [
      { accessorKey: "name" as const, header: "Nombre" },
      { accessorKey: "price" as const, header: "Precio" },
    ],
    []
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
    return <p className="text-muted">Cargando...</p>;
  }

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-muted">No hay servicios registrados</p>
        {onAdd && (
          <Button variant="primary" onPress={onAdd}>
            <Plus width={16} height={16} />
            Agregar servicio
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchField value={search} onChange={setSearch}>
        <Label>Buscar servicio</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input className="w-[280px]" placeholder="Nombre del servicio..." />
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
                  <Table.Cell colSpan={3} className="text-center text-muted py-4">
                    Sin resultados
                  </Table.Cell>
                </Table.Row>
              ) : (
                pageRows.map((row) => {
                  const service = row.original;
                  return (
                    <Table.Row key={service.id}>
                      <Table.Cell>{service.name}</Table.Cell>
                      <Table.Cell>{formatPrice(service.price)}</Table.Cell>
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
      <Table.Footer>
        <Pagination size="sm">
          <Pagination.Summary>
            {table.getState().pagination.pageIndex * PAGE_SIZE + 1} a{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * PAGE_SIZE,
              filtered.length
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
    </div>
  );
}
