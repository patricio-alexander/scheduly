"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, SearchField, Label } from "@heroui/react";
import Boxes3 from "@gravity-ui/icons/Boxes3";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import LayoutList from "@gravity-ui/icons/LayoutList";
import Circles4Square from "@gravity-ui/icons/Circles4Square";
import { ContentCard, EmptyState, TableSkeleton } from "@/shared/components/ui";
import { SelectField } from "@/shared/components/SelectField";
import {
  TablePro,
  type TableProColumn,
} from "@/shared/components/TablePro";
import { formatMoney } from "@/shared/utils/money";
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
  highlightProductId?: number | null;
}

type ViewMode = "table" | "cards";

const FILTER_ALL = "all";
const FILTER_NONE = "none";
const CARD_PAGE_SIZE = 24;

const TYPE_LABELS: Record<string, string> = {
  raw: "Materia prima",
  intermediate: "Intermedio",
  final: "Final",
};

function typeLabel(type?: string | null) {
  if (!type) return "—";
  return TYPE_LABELS[type] ?? type;
}

function codeOf(p: Product) {
  return p.barcode || p.sku || "";
}

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
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(FILTER_ALL);
  const [cardPage, setCardPage] = useState(1);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const highlightAppliedRef = useRef<number | null>(null);
  const rowRefs = useRef<Map<number, HTMLElement | null>>(new Map());

  const categoryOptions = useMemo(() => {
    const opts = [
      { id: FILTER_ALL, label: `Todas (${products.length})` },
      ...categories.map((c) => {
        const count = products.filter(
          (p) => (p.categoryId ?? p.category?.id) === c.id,
        ).length;
        return { id: String(c.id), label: `${c.name} (${count})` };
      }),
    ];
    const uncategorized = products.filter(
      (p) => !p.categoryId && !p.category,
    ).length;
    if (uncategorized > 0) {
      opts.push({
        id: FILTER_NONE,
        label: `Sin categoría (${uncategorized})`,
      });
    }
    return opts;
  }, [categories, products]);

  const filteredByCategory = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter === FILTER_ALL) return true;
      if (categoryFilter === FILTER_NONE) return !p.categoryId && !p.category;
      return String(p.categoryId ?? p.category?.id ?? "") === categoryFilter;
    });
  }, [products, categoryFilter]);

  /** Filas para TablePro (categoría ya filtrada; el search lo hace TablePro). */
  const tableRows = filteredByCategory;

  /** Cards: filtro categoría + búsqueda local. */
  const cardRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = filteredByCategory.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.desc ?? "").toLowerCase().includes(q) ||
        codeOf(p).toLowerCase().includes(q) ||
        (p.category?.name ?? "").toLowerCase().includes(q) ||
        typeLabel(p.type).toLowerCase().includes(q)
      );
    });
    return [...list].sort(
      (a, b) => Number(b.stock ?? 0) - Number(a.stock ?? 0),
    );
  }, [filteredByCategory, search]);

  useEffect(() => {
    if (highlightProductId == null || products.length === 0) return;
    if (highlightAppliedRef.current === highlightProductId) return;

    const product = products.find((p) => p.id === highlightProductId);
    if (!product) return;

    highlightAppliedRef.current = highlightProductId;
    setCategoryFilter(FILTER_ALL);
    setSearch(product.name);
    setHighlightedId(product.id);
    setViewMode("table");
  }, [highlightProductId, products]);

  useEffect(() => {
    if (highlightedId == null) return;
    const el = rowRefs.current.get(highlightedId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setHighlightedId(null), 4500);
    return () => window.clearTimeout(timer);
  }, [highlightedId, viewMode, cardPage]);

  useEffect(() => {
    setCardPage(1);
  }, [search, categoryFilter, viewMode]);

  const columns = useMemo<TableProColumn<Product>[]>(() => {
    const cols: TableProColumn<Product>[] = [
      {
        id: "name",
        label: "Nombre",
        getSortValue: (p) => p.name.toLowerCase(),
        getSearchValue: (p) =>
          [p.name, p.desc, codeOf(p), p.category?.name, typeLabel(p.type)]
            .filter(Boolean)
            .join(" "),
        render: (product) => {
          const isHighlighted = highlightedId === product.id;
          return (
            <div className="flex items-center gap-2">
              <ProductThumb product={product} />
              <span className="font-medium">
                {product.name}
                {isHighlighted ? (
                  <span className="ml-2 text-xs font-semibold text-accent">
                    ← alertado
                  </span>
                ) : null}
              </span>
            </div>
          );
        },
      },
      {
        id: "barcode",
        label: "Código",
        getSortValue: (p) => codeOf(p).toLowerCase(),
        getSearchValue: (p) => codeOf(p),
        render: (p) => (
          <span className="tabular-nums text-muted">
            {codeOf(p) || "—"}
          </span>
        ),
      },
      {
        id: "type",
        label: "Tipo",
        getSortValue: (p) => String(p.type ?? "").toLowerCase(),
        getSearchValue: (p) => typeLabel(p.type),
        render: (p) => (
          <span className="text-xs">{typeLabel(p.type)}</span>
        ),
      },
      {
        id: "category",
        label: "Categoría",
        getSortValue: (p) => (p.category?.name ?? "").toLowerCase(),
        getSearchValue: (p) => p.category?.name ?? "",
        render: (p) =>
          p.category ? (
            <span className="inline-flex rounded-full border border-separator bg-surface-secondary/70 px-2 py-0.5 text-xs font-medium">
              {p.category.name}
            </span>
          ) : (
            <span className="text-muted">Sin categoría</span>
          ),
      },
      {
        id: "supplierPrice",
        label: "P. proveedor",
        align: "right",
        getSortValue: (p) => Number(p.supplierPrice ?? 0),
        getSearchValue: (p) => p.supplierPrice,
        render: (p) => (
          <span className="tabular-nums">
            {formatMoney(p.supplierPrice ?? 0)}
          </span>
        ),
      },
      {
        id: "distributorPrice",
        label: "P. distrib.",
        align: "right",
        getSortValue: (p) => Number(p.distributorPrice ?? 0),
        getSearchValue: (p) => p.distributorPrice,
        render: (p) => (
          <span className="tabular-nums">
            {formatMoney(p.distributorPrice ?? 0)}
          </span>
        ),
      },
      {
        id: "price",
        label: "P. venta",
        align: "right",
        getSortValue: (p) => Number(p.price ?? 0),
        getSearchValue: (p) => p.price,
        render: (p) => (
          <span className="font-medium tabular-nums">
            {formatMoney(p.price)}
          </span>
        ),
      },
      {
        id: "stock",
        label: "Stock",
        align: "right",
        getSortValue: (p) => Number(p.stock ?? 0),
        getSearchValue: (p) => p.stock,
        render: (p) => <StockCell stock={p.stock} />,
      },
    ];

    if (!readOnly) {
      cols.push({
        id: "actions",
        label: "Acciones",
        align: "center",
        sortable: false,
        getSearchValue: () => "",
        render: (product) => (
          <div className="flex justify-center gap-1">
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Editar"
              onPress={() => onEdit(product)}
            >
              <Pencil width={16} height={16} />
            </Button>
            {canDelete ? (
              <Button
                isIconOnly
                size="sm"
                variant="danger"
                aria-label="Eliminar"
                onPress={() => onDelete(product.id)}
              >
                <TrashBin width={16} height={16} />
              </Button>
            ) : null}
          </div>
        ),
      });
    }

    return cols;
  }, [canDelete, highlightedId, onDelete, onEdit, readOnly]);

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

  const viewToggle = (
    <div className="inline-flex overflow-hidden rounded-xl border border-separator">
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${
          viewMode === "cards"
            ? "bg-accent text-accent-foreground"
            : "text-muted hover:bg-surface-secondary"
        }`}
        onClick={() => setViewMode("cards")}
      >
        <Circles4Square width={14} height={14} />
        Tarjetas
      </button>
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${
          viewMode === "table"
            ? "bg-accent text-accent-foreground"
            : "text-muted hover:bg-surface-secondary"
        }`}
        onClick={() => setViewMode("table")}
      >
        <LayoutList width={14} height={14} />
        Tabla
      </button>
    </div>
  );

  const categorySelect = (
    <SelectField
      label="Categoría"
      className="w-full sm:w-[240px]"
      selectedKey={categoryFilter}
      onSelectionChange={(key) => setCategoryFilter(key ?? FILTER_ALL)}
      options={categoryOptions}
    />
  );

  if (viewMode === "table") {
    return (
      <TablePro
        columns={columns}
        rows={tableRows}
        getRowId={(p) => p.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, código, categoría…"
        emptyMessage="No se encontraron productos con los filtros aplicados"
        dense
        rowsPerPageOptions={[25, 50, 100, 200]}
        defaultRowsPerPage={25}
        rowClassName={(p) =>
          highlightedId === p.id
            ? "bg-accent/15 ring-2 ring-inset ring-accent/50"
            : undefined
        }
        rowRef={(p, el) => {
          rowRefs.current.set(p.id, el);
        }}
        toolbar={
          <>
            {categorySelect}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {(categoryFilter !== FILTER_ALL || search) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => {
                    setSearch("");
                    setCategoryFilter(FILTER_ALL);
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
              {viewToggle}
            </div>
          </>
        }
      />
    );
  }

  const cardTotalPages = Math.max(1, Math.ceil(cardRows.length / CARD_PAGE_SIZE));
  const safeCardPage = Math.min(cardPage, cardTotalPages);
  const cardPageRows = cardRows.slice(
    (safeCardPage - 1) * CARD_PAGE_SIZE,
    safeCardPage * CARD_PAGE_SIZE,
  );

  return (
    <ContentCard>
      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <SearchField value={search} onChange={setSearch} className="w-full">
          <Label className="sr-only">Buscar producto</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Buscar por nombre, código, categoría…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <div className="flex flex-wrap items-end gap-2">
          {categorySelect}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {(categoryFilter !== FILTER_ALL || search) && (
              <Button
                size="sm"
                variant="ghost"
                onPress={() => {
                  setSearch("");
                  setCategoryFilter(FILTER_ALL);
                }}
              >
                Limpiar filtros
              </Button>
            )}
            {viewToggle}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cardPageRows.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-muted">
              No se encontraron productos con los filtros aplicados
            </p>
          ) : (
            cardPageRows.map((product) => {
              const isHighlighted = highlightedId === product.id;
              return (
                <article
                  key={product.id}
                  ref={(node) => {
                    rowRefs.current.set(product.id, node);
                  }}
                  className={`flex flex-col overflow-hidden rounded-2xl border border-separator bg-surface ${
                    isHighlighted
                      ? "ring-2 ring-accent/50"
                      : ""
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-surface-secondary">
                    {product.primaryImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.primaryImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted">
                        <Boxes3 width={32} height={32} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    <p className="line-clamp-2 text-sm font-semibold">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted">
                      {product.category?.name ?? "Sin categoría"} ·{" "}
                      {typeLabel(product.type)}
                    </p>
                    <div className="mt-auto flex items-end justify-between gap-2 pt-1">
                      <div>
                        <p className="text-sm font-bold tabular-nums">
                          {formatMoney(product.price)}
                        </p>
                        <StockCell stock={product.stock} />
                      </div>
                      {!readOnly ? (
                        <div className="flex gap-1">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="ghost"
                            aria-label="Editar"
                            onPress={() => onEdit(product)}
                          >
                            <Pencil width={16} height={16} />
                          </Button>
                          {canDelete ? (
                            <Button
                              isIconOnly
                              size="sm"
                              variant="danger"
                              aria-label="Eliminar"
                              onPress={() => onDelete(product.id)}
                            >
                              <TrashBin width={16} height={16} />
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-separator pt-2 text-xs text-muted">
          <span>
            {cardRows.length === 0
              ? "0 resultados"
              : `${(safeCardPage - 1) * CARD_PAGE_SIZE + 1}–${Math.min(safeCardPage * CARD_PAGE_SIZE, cardRows.length)} de ${cardRows.length}`}
          </span>
          {cardTotalPages > 1 ? (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                isDisabled={safeCardPage <= 1}
                onPress={() => setCardPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                isDisabled={safeCardPage >= cardTotalPages}
                onPress={() =>
                  setCardPage((p) => Math.min(cardTotalPages, p + 1))
                }
              >
                Siguiente
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </ContentCard>
  );
}

function ProductThumb({ product }: { product: Product }) {
  if (product.primaryImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.primaryImageUrl}
        alt=""
        className="h-8 w-8 shrink-0 rounded-md object-cover"
      />
    );
  }
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-muted">
      <Boxes3 width={14} height={14} />
    </span>
  );
}

function StockCell({ stock }: { stock: number }) {
  const alert = stockAlertLabel(stock);
  return (
    <span
      className={`font-medium tabular-nums ${
        stock <= LOW_STOCK_THRESHOLD ? "text-warning" : ""
      }`}
    >
      {stock}
      {alert ? (
        <span
          className={`ml-1 text-xs ${
            stock <= 0 ? "text-danger" : "text-warning"
          }`}
        >
          {stock <= 0 ? "sin stock" : "bajo"}
        </span>
      ) : null}
    </span>
  );
}
