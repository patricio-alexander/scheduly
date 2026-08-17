"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { LOW_STOCK_THRESHOLD, stockAlertLabel } from "@/shared/utils/stock";
import type { Category } from "@/src/features/categories";
import type { Product } from "../types";

interface Props {
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onAdd?: () => void;
  loading?: boolean;
  canDelete?: boolean;
  readOnly?: boolean;
  /** Resalta y centra este producto (desde notificación de stock) */
  highlightProductId?: number | null;
}

const PAGE_SIZE = 10;
const FILTER_ALL = "all";
const FILTER_NONE = "none";

export function ProductList({
  products,
  categories,
  onEdit,
  onDelete,
  onAdd,
  loading,
  canDelete = true,
  readOnly = false,
  highlightProductId = null,
}: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(FILTER_ALL);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const highlightAppliedRef = useRef<number | null>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement | null>>(new Map());

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category?.name ?? "").toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === FILTER_ALL ||
        (categoryFilter === FILTER_NONE && !p.categoryId && !p.category) ||
        String(p.categoryId ?? p.category?.id ?? "") === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  useEffect(() => {
    if (highlightProductId == null || products.length === 0) return;
    if (highlightAppliedRef.current === highlightProductId) return;

    const product = products.find((p) => p.id === highlightProductId);
    if (!product) return;

    highlightAppliedRef.current = highlightProductId;
    setCategoryFilter(FILTER_ALL);
    setSearch(product.name);
    setHighlightedId(product.id);

    const matching = products.filter((p) =>
      p.name.toLowerCase().includes(product.name.toLowerCase()),
    );
    const idx = matching.findIndex((p) => p.id === product.id);
    setPage(Math.floor(Math.max(0, idx) / PAGE_SIZE) + 1);
  }, [highlightProductId, products]);

  useEffect(() => {
    if (highlightedId == null) return;
    const el = rowRefs.current.get(highlightedId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const timer = window.setTimeout(() => setHighlightedId(null), 4500);
    return () => window.clearTimeout(timer);
  }, [highlightedId, page, filtered]);

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
    pageCount: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
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

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

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
          description={
            readOnly
              ? "Aún no hay productos en el catálogo."
              : "Agrega productos para venderlos junto con los turnos."
          }
          actionLabel={readOnly ? undefined : "Agregar producto"}
          onAction={readOnly ? undefined : onAdd}
        />
      </ContentCard>
    );
  }

  const uncategorizedCount = products.filter((p) => !p.categoryId && !p.category).length;

  const displayProducts = filtered;
  const productsOnPage = readOnly
    ? displayProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : pageRows.map((row) => row.original);
  const displayTotalPages = readOnly
    ? Math.max(1, Math.ceil(displayProducts.length / PAGE_SIZE))
    : totalPages;

  return (
    <ContentCard>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SearchField value={search} onChange={handleSearch}>
            <Label>Buscar producto</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                className="w-full sm:w-[320px]"
                placeholder="Nombre del producto..."
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          {(categoryFilter !== FILTER_ALL || search) && (
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                setSearch("");
                setCategoryFilter(FILTER_ALL);
                setPage(1);
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted">Filtrar por categoría</p>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label={`Todas (${products.length})`}
              selected={categoryFilter === FILTER_ALL}
              onPress={() => handleCategoryFilter(FILTER_ALL)}
            />
            {categories.map((category) => {
              const count = products.filter(
                (p) => (p.categoryId ?? p.category?.id) === category.id,
              ).length;
              return (
                <FilterChip
                  key={category.id}
                  label={`${category.name} (${count})`}
                  selected={categoryFilter === String(category.id)}
                  onPress={() => handleCategoryFilter(String(category.id))}
                />
              );
            })}
            {uncategorizedCount > 0 && (
              <FilterChip
                label={`Sin categoría (${uncategorizedCount})`}
                selected={categoryFilter === FILTER_NONE}
                onPress={() => handleCategoryFilter(FILTER_NONE)}
              />
            )}
          </div>
        </div>

        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Productos" className="min-w-[400px]">
              <Table.Header>
                <Table.Column isRowHeader>Nombre</Table.Column>
                <Table.Column>Categoría</Table.Column>
                <Table.Column>Precio</Table.Column>
                <Table.Column>Stock</Table.Column>
                {!readOnly ? <Table.Column>Acciones</Table.Column> : null}
              </Table.Header>
              <Table.Body>
                {productsOnPage.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={readOnly ? 4 : 5}>
                      <div className="py-8 text-center text-sm text-muted">
                        No se encontraron productos con los filtros aplicados
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  productsOnPage.map((product) => {
                    const isHighlighted = highlightedId === product.id;
                    return (
                      <Table.Row
                        key={product.id}
                        ref={(node: HTMLTableRowElement | null) => {
                          rowRefs.current.set(product.id, node);
                        }}
                        className={
                          isHighlighted
                            ? "bg-accent/15 ring-2 ring-inset ring-accent/50 transition-colors"
                            : undefined
                        }
                      >
                        <Table.Cell>
                          <span className="font-medium">
                            {product.name}
                            {isHighlighted ? (
                              <span className="ml-2 text-xs font-semibold text-accent">
                                ← alertado
                              </span>
                            ) : null}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          {product.category ? (
                            <span className="inline-flex rounded-full border border-separator bg-surface-secondary/70 px-2 py-0.5 text-xs font-medium">
                              {product.category.name}
                            </span>
                          ) : (
                            <span className="text-sm text-muted">Sin categoría</span>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <span className="font-medium tabular-nums">
                            {formatPrice(product.price)}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <span
                            className={`font-medium tabular-nums ${
                              product.stock <= LOW_STOCK_THRESHOLD ? "text-warning" : ""
                            }`}
                          >
                            {product.stock}
                            {stockAlertLabel(product.stock) && (
                              <span
                                className={`ml-1 text-xs ${
                                  product.stock <= 0 ? "text-danger" : "text-warning"
                                }`}
                              >
                                {product.stock <= 0 ? "sin stock" : "bajo"}
                              </span>
                            )}
                          </span>
                        </Table.Cell>
                        {!readOnly ? (
                          <Table.Cell>
                            <div className="flex gap-1">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="ghost"
                                onPress={() => onEdit(product)}
                              >
                                <Pencil width={16} height={16} />
                              </Button>
                              {canDelete ? (
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="danger"
                                  onPress={() => onDelete(product.id)}
                                >
                                  <TrashBin width={16} height={16} />
                                </Button>
                              ) : null}
                            </div>
                          </Table.Cell>
                        ) : null}
                      </Table.Row>
                    );
                  })
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>

        {(readOnly ? displayProducts.length : filtered.length) > PAGE_SIZE && (
          <Table.Footer>
            <Pagination size="sm">
              <Pagination.Summary>
                {readOnly
                  ? `${(page - 1) * PAGE_SIZE + 1} a ${Math.min(page * PAGE_SIZE, displayProducts.length)} de ${displayProducts.length} resultados`
                  : `${table.getState().pagination.pageIndex * PAGE_SIZE + 1} a ${Math.min(
                      (table.getState().pagination.pageIndex + 1) * PAGE_SIZE,
                      filtered.length,
                    )} de ${filtered.length} resultados`}
              </Pagination.Summary>
              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.Previous
                    isDisabled={page <= 1}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <Pagination.PreviousIcon />
                  </Pagination.Previous>
                </Pagination.Item>
                {Array.from({ length: displayTotalPages }, (_, i) => i + 1).map((p) => (
                  <Pagination.Item key={p}>
                    <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>
                      {p}
                    </Pagination.Link>
                  </Pagination.Item>
                ))}
                <Pagination.Item>
                  <Pagination.Next
                    isDisabled={page >= displayTotalPages}
                    onPress={() => setPage((p) => Math.min(displayTotalPages, p + 1))}
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

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        selected
          ? "border-accent bg-accent text-accent-foreground"
          : "border-separator bg-surface text-muted hover:border-accent/50 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
