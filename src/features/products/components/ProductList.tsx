"use client";

import { useMemo, useState } from "react";
import { Button, Table, Pagination, SearchField, Label } from "@heroui/react";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import type { Product } from "../types";

interface Props {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onAdd?: () => void;
  loading?: boolean;
}

const PAGE_SIZE = 10;

export function ProductList({ products, onEdit, onDelete, onAdd, loading }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search],
  );

  const columns = useMemo(
    () => [
      { accessorKey: "name" as const, header: "Nombre" },
      { accessorKey: "price" as const, header: "Precio" },
      { accessorKey: "stock" as const, header: "Stock" },
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

  if (products.length === 0) {
    return (
      <ContentCard>
        <EmptyState
          icon={<Boxes3 width={40} height={40} />}
          title="No hay productos registrados"
          description="Agrega productos para venderlos junto con los turnos."
          actionLabel="Agregar producto"
          onAction={onAdd}
        />
      </ContentCard>
    );
  }

  return (
    <ContentCard>
      <div className="flex flex-col gap-4 p-6">
        <SearchField value={search} onChange={setSearch}>
          <Label>Buscar producto</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="w-full sm:w-[320px]" placeholder="Nombre del producto..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Productos" className="min-w-[400px]">
              <Table.Header>
                <Table.Column isRowHeader>Nombre</Table.Column>
                <Table.Column>Precio</Table.Column>
                <Table.Column>Stock</Table.Column>
                <Table.Column>Acciones</Table.Column>
              </Table.Header>
              <Table.Body>
                {pageRows.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={4}>
                      <div className="py-8 text-center text-sm text-muted">
                        No se encontraron productos con &quot;{search}&quot;
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  pageRows.map((row) => {
                    const product = row.original;
                    return (
                      <Table.Row key={product.id}>
                        <Table.Cell>
                          <span className="font-medium">{product.name}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="font-medium tabular-nums">{formatPrice(product.price)}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <span
                            className={`font-medium tabular-nums ${
                              product.stock <= 5 ? "text-warning" : ""
                            }`}
                          >
                            {product.stock}
                            {product.stock <= 5 && product.stock > 0 && (
                              <span className="ml-1 text-xs text-warning">bajo</span>
                            )}
                            {product.stock === 0 && (
                              <span className="ml-1 text-xs text-danger">sin stock</span>
                            )}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button isIconOnly size="sm" variant="ghost" onPress={() => onEdit(product)}>
                              <Pencil width={16} height={16} />
                            </Button>
                            <Button isIconOnly size="sm" variant="danger" onPress={() => onDelete(product.id)}>
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
