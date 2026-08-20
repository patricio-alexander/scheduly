"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Pagination, SearchField, Label } from "@heroui/react";
import ArrowChevronUp from "@gravity-ui/icons/ArrowChevronUp";
import ArrowChevronDown from "@gravity-ui/icons/ArrowChevronDown";
import ArrowUpArrowDown from "@gravity-ui/icons/ArrowUpArrowDown";

export type TableProAlign = "left" | "right" | "center";
export type TableProSortDir = "asc" | "desc";

export type TableProColumn<T> = {
  id: string;
  label: string;
  align?: TableProAlign;
  sortable?: boolean;
  /** Valor para ordenar (si no, usa row[id]). */
  getSortValue?: (row: T) => string | number | null | undefined;
  /** Valor para búsqueda (si no, usa row[id]). */
  getSearchValue?: (row: T) => string | number | null | undefined;
  render?: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string | number;
  minWidth?: string | number;
};

export type TableProProps<T> = {
  columns: TableProColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string | number;
  /** Slot arriba del buscador (título, acciones). */
  header?: ReactNode;
  /** Filtros extra entre buscador y tabla (ej. select de categoría). */
  toolbar?: ReactNode;
  showSearch?: boolean;
  searchPlaceholder?: string;
  /** Búsqueda controlada (opcional). */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showPagination?: boolean;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  loading?: boolean;
  emptyMessage?: string;
  dense?: boolean;
  className?: string;
  tableClassName?: string;
  maxHeight?: string;
  rowClassName?: (row: T) => string | undefined;
  onRowClick?: (row: T) => void;
  /** Ref callback por fila (scroll/highlight). */
  rowRef?: (row: T, el: HTMLTableRowElement | null) => void;
  /** Id de fila expandida (panel debajo). */
  expandedRowId?: string | number | null;
  renderExpanded?: (row: T) => ReactNode;
};

function visiblePages(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  dir: TableProSortDir,
) {
  const mul = dir === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1 * mul;
  if (b == null) return -1 * mul;
  if (typeof a === "number" && typeof b === "number") return (a - b) * mul;
  return (
    String(a).localeCompare(String(b), "es", {
      sensitivity: "base",
      numeric: true,
    }) * mul
  );
}

function cellText(row: Record<string, unknown>, id: string) {
  const v = row[id];
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  return "";
}

/**
 * Tabla reutilizable (estilo EdDeli TablePro):
 * buscador arriba, toolbar opcional, columnas ordenables, paginación abajo-derecha.
 */
export function TablePro<T>({
  columns,
  rows,
  getRowId,
  header,
  toolbar,
  showSearch = true,
  searchPlaceholder = "Buscar…",
  searchValue,
  onSearchChange,
  showPagination = true,
  rowsPerPageOptions = [10, 25, 50, 100],
  defaultRowsPerPage = 25,
  loading = false,
  emptyMessage = "No hay datos",
  dense = false,
  className = "",
  tableClassName = "",
  maxHeight = "calc(100vh - 260px)",
  rowClassName,
  onRowClick,
  rowRef,
  expandedRowId = null,
  renderExpanded,
}: TableProProps<T>) {
  const controlledSearch = searchValue !== undefined;
  const [internalSearch, setInternalSearch] = useState("");
  const search = controlledSearch ? searchValue : internalSearch;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultRowsPerPage);
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [orderDir, setOrderDir] = useState<TableProSortDir>("asc");

  const setSearch = (value: string) => {
    if (!controlledSearch) setInternalSearch(value);
    onSearchChange?.(value);
    setPage(1);
  };

  const sorted = useMemo(() => {
    if (!orderBy) return rows;
    const column = columns.find((c) => c.id === orderBy);
    return [...rows].sort((a, b) => {
      const va = column?.getSortValue
        ? column.getSortValue(a)
        : cellText(a as Record<string, unknown>, orderBy);
      const vb = column?.getSortValue
        ? column.getSortValue(b)
        : cellText(b as Record<string, unknown>, orderBy);
      return compareValues(va, vb, orderDir);
    });
  }, [rows, orderBy, orderDir, columns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((row) =>
      columns.some((column) => {
        const raw = column.getSearchValue
          ? column.getSearchValue(row)
          : cellText(row as Record<string, unknown>, column.id);
        if (raw == null) return false;
        return String(raw).toLowerCase().includes(q);
      }),
    );
  }, [sorted, search, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = showPagination
    ? filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
    : filtered;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleSort = (columnId: string) => {
    const column = columns.find((c) => c.id === columnId);
    if (!column || column.sortable === false) return;
    if (orderBy === columnId) {
      setOrderDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(columnId);
      setOrderDir("asc");
    }
    setPage(1);
  };

  const alignClass = (align?: TableProAlign) => {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  };

  const cellPad = dense ? "px-2 py-1" : "px-3 py-2";
  const fontSize = dense ? "text-[12px]" : "text-sm";

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-separator bg-surface ${className}`}
    >
      <div className="flex flex-col gap-2.5 p-3 sm:p-4">
        {header}

        {showSearch ? (
          <SearchField
            value={search}
            onChange={setSearch}
            isDisabled={loading}
            className="w-full"
          >
            <Label className="sr-only">Buscar</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={searchPlaceholder} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        ) : null}

        {toolbar ? (
          <div className="flex flex-wrap items-end gap-2">{toolbar}</div>
        ) : null}

        <div
          className="relative overflow-auto rounded-lg border border-separator"
          style={{ maxHeight }}
        >
          <table
            className={`w-full min-w-[640px] border-collapse text-left ${fontSize} ${tableClassName}`}
          >
            <thead className="sticky top-0 z-[1] border-b border-separator bg-surface-secondary/90 backdrop-blur-sm">
              <tr>
                {columns.map((column) => {
                  const sortable = column.sortable !== false;
                  const active = orderBy === column.id;
                  return (
                    <th
                      key={column.id}
                      className={`${cellPad} font-semibold text-muted ${alignClass(column.align)} ${column.headerClassName ?? ""}`}
                      style={{
                        width: column.width,
                        minWidth: column.minWidth,
                      }}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 ${
                            column.align === "right" ? "w-full justify-end" : ""
                          } ${
                            column.align === "center"
                              ? "w-full justify-center"
                              : ""
                          } ${active ? "text-foreground" : "hover:text-foreground"}`}
                          onClick={() => handleSort(column.id)}
                          disabled={loading}
                        >
                          {column.label}
                          {active ? (
                            orderDir === "asc" ? (
                              <ArrowChevronUp width={12} height={12} />
                            ) : (
                              <ArrowChevronDown width={12} height={12} />
                            )
                          ) : (
                            <ArrowUpArrowDown
                              width={12}
                              height={12}
                              className="opacity-35"
                            />
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className={`${cellPad} py-12 text-center text-muted`}
                  >
                    Cargando…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className={`${cellPad} py-12 text-center text-muted`}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const id = getRowId(row);
                  const expanded =
                    renderExpanded != null &&
                    expandedRowId != null &&
                    String(expandedRowId) === String(id);
                  return (
                    <Fragment key={String(id)}>
                      <tr
                        ref={(el) => rowRef?.(row, el)}
                        className={`border-b border-separator/70 last:border-0 ${
                          onRowClick
                            ? "cursor-pointer hover:bg-surface-secondary/50"
                            : ""
                        } ${rowClassName?.(row) ?? ""}`}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                      >
                        {columns.map((column) => (
                          <td
                            key={column.id}
                            className={`${cellPad} ${alignClass(column.align)} ${column.className ?? ""}`}
                            style={{
                              width: column.width,
                              minWidth: column.minWidth,
                            }}
                            onClick={
                              column.id === "actions"
                                ? (e) => e.stopPropagation()
                                : undefined
                            }
                          >
                            {column.render
                              ? column.render(row)
                              : cellText(
                                  row as Record<string, unknown>,
                                  column.id,
                                ) || "—"}
                          </td>
                        ))}
                      </tr>
                      {expanded ? (
                        <tr className="border-b border-separator/70 bg-surface-secondary/40">
                          <td
                            colSpan={columns.length}
                            className={`${cellPad} py-2`}
                          >
                            {renderExpanded(row)}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {showPagination ? (
          <div className="flex flex-col gap-2 border-t border-separator pt-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted">
              <span>
                {filtered.length === 0
                  ? "0 resultados"
                  : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} de ${filtered.length}`}
              </span>
              <label className="inline-flex items-center gap-1.5">
                <span>Por página</span>
                <select
                  className="rounded-lg border border-separator bg-field-background px-2 py-1 text-xs text-foreground"
                  value={pageSize}
                  disabled={loading}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {rowsPerPageOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filtered.length > pageSize ? (
              <Pagination size="sm">
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={safePage <= 1 || loading}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <Pagination.PreviousIcon />
                    </Pagination.Previous>
                  </Pagination.Item>
                  {visiblePages(safePage, totalPages).map((p, i) =>
                    p === "…" ? (
                      <Pagination.Item key={`e-${i}`}>
                        <span className="px-1 text-muted">…</span>
                      </Pagination.Item>
                    ) : (
                      <Pagination.Item key={p}>
                        <Pagination.Link
                          isActive={p === safePage}
                          onPress={() => setPage(p)}
                        >
                          {p}
                        </Pagination.Link>
                      </Pagination.Item>
                    ),
                  )}
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={safePage >= totalPages || loading}
                      onPress={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
