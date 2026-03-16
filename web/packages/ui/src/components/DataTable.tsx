// @ts-nocheck
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Icon,
  Input,
  Label,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
} from "@ui5/webcomponents-react";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";

import "@ui5/webcomponents-icons/dist/navigation-left-arrow.js";
import "@ui5/webcomponents-icons/dist/navigation-right-arrow.js";
import "@ui5/webcomponents-icons/dist/search.js";

const injectedStyles = `
  ui5-table-row.hoverable-row::part(root):hover,
  ui5-table-row.hoverable-row:hover {
    background-color: var(--sapList_Hover_Background, rgba(0,0,0,0.04)) !important;
  }
  ui5-table.fixed-table::part(table) {
    table-layout: fixed;
    width: 100%;
    border-collapse: collapse;
  }
  ui5-table.fixed-table ui5-table-header-cell::part(content) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  ui5-table.fixed-table ui5-table-cell::part(content) {
    white-space: nowrap;
    overflow: visible;
  }
  ui5-table.fixed-table::part(root) {
    border: 1px solid var(--sapList_BorderColor);
  }
  ui5-table.fixed-table ui5-table-row::part(root) {
    border-bottom: 1px solid var(--sapList_BorderColor);
  }
  ui5-table.fixed-table ui5-table-header-cell::part(root),
  ui5-table.fixed-table ui5-table-cell::part(root) {
    border-right: 1px solid var(--sapList_BorderColor);
  }
  ui5-table.fixed-table ui5-table-header-cell:last-child::part(root),
  ui5-table.fixed-table ui5-table-row > ui5-table-cell:last-child::part(root) {
    border-right: none;
  }
`;

const headerLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--sapContent_LabelColor)",
  opacity: 0.8,
};

const cellContentWrapStyle: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
};

const SCROLLBAR_PADDING = 16;
const FIXED_COLUMN_IDS = new Set(["item_count", "items", "status", "actions"]);
const DEFAULT_FIXED_WIDTH = 80;
const DEFAULT_FLEX_WEIGHT = 140;
const MIN_FLEX_FLOOR = 60;

function isFixedColumn<T>(col: { id: string; columnDef: ColumnDef<T> }): boolean {
  const def = col.columnDef;
  if ((def.meta as { fixed?: boolean } | undefined)?.fixed === true) return true;
  if (FIXED_COLUMN_IDS.has(col.id)) return true;
  if (typeof def.size === "number" && def.size <= 110) return true;
  return false;
}

export function DataTable<TData>({
  data,
  columns,
  filterPlaceholder = "Search",
  initialPageSize = 10,
  onRowClick,
  globalFilter,
  onGlobalFilterChange,
  hideToolbar,
  actions,
  loading,
  hideEmptyState,
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
  filterPlaceholder?: string;
  initialPageSize?: number;
  onRowClick?: (data: TData) => void;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  hideToolbar?: boolean;
  actions?: React.ReactNode;
  loading?: boolean;
  hideEmptyState?: boolean;
}) {
  const [internalGlobalFilter, setInternalGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const [containerWidth, setContainerWidth] = useState(0);
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  const activeGlobalFilter = globalFilter ?? internalGlobalFilter;
  const activeSetGlobalFilter = onGlobalFilterChange ?? setInternalGlobalFilter;

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter: activeGlobalFilter, pagination },
    onGlobalFilterChange: activeSetGlobalFilter,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
  });

  const totalFiltered = table.getFilteredRowModel().rows.length;
  const visibleRows = table.getRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const start = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalFiltered);

  const columnWidthsMap = useMemo(() => {
    const visibleColumns = table.getVisibleFlatColumns();
    const map: Record<string, { width: number; minWidth: number; maxWidth: number }> = {};

    const fixedCols = visibleColumns.filter((c) => isFixedColumn(c));
    const flexCols = visibleColumns.filter((c) => !isFixedColumn(c));

    const fixedWidth = fixedCols.reduce((sum, col) => {
      const def = col.columnDef;
      const w = typeof def.size === "number" ? def.size : typeof def.minSize === "number" ? def.minSize : DEFAULT_FIXED_WIDTH;
      map[col.id] = { width: w, minWidth: w, maxWidth: w };
      return sum + w;
    }, 0);

    const remainingWidth = containerWidth > 0 ? Math.max(0, containerWidth - fixedWidth - SCROLLBAR_PADDING) : 0;

    if (flexCols.length === 0) return map;
    if (remainingWidth <= 0) {
      flexCols.forEach((col) => {
        const def = col.columnDef;
        const minW = typeof def.minSize === "number" ? def.minSize : DEFAULT_FLEX_WEIGHT;
        map[col.id] = { width: minW, minWidth: minW, maxWidth: def.maxSize && def.maxSize !== Number.MAX_SAFE_INTEGER ? def.maxSize : minW };
      });
      return map;
    }

    const weights: number[] = flexCols.map((col) => {
      const def = col.columnDef;
      return (def.meta as { flex?: number } | undefined)?.flex ?? (typeof def.minSize === "number" ? def.minSize : DEFAULT_FLEX_WEIGHT);
    });
    const sumWeights = weights.reduce((sum, w) => sum + w, 0);

    flexCols.forEach((col, i) => {
      const def = col.columnDef;
      const maxW = def.maxSize !== undefined && def.maxSize !== Number.MAX_SAFE_INTEGER ? def.maxSize : Number.MAX_SAFE_INTEGER;
      const weight: number = weights[i] ?? DEFAULT_FLEX_WEIGHT;
      const rawW = sumWeights > 0 ? remainingWidth * (weight / sumWeights) : DEFAULT_FLEX_WEIGHT;
      const width = Math.min(maxW, Math.max(MIN_FLEX_FLOOR, Math.round(rawW)));
      map[col.id] = { width, minWidth: MIN_FLEX_FLOOR, maxWidth: maxW };
    });

    return map;
  }, [table, containerWidth]);

  useEffect(() => {
    const el = tableWrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (totalFiltered === 0) return;
    if (visibleRows > 0) return;
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [totalFiltered, visibleRows]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        boxSizing: "border-box",
        background: "var(--sapBaseColor)",
        border: "1px solid var(--sapGroup_ContentBorderColor)",
        borderRadius: "var(--sapElement_BorderCornerRadius, 0.5rem)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
    >
      <style>{injectedStyles}</style>
      {!hideToolbar && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.875rem 1.25rem",
            borderBottom: "1px solid var(--sapGroup_ContentBorderColor)",
            background: "var(--sapGroup_TitleBackground)",
            gap: "0.75rem",
          }}
        >
          <div style={{ flex: "0 0 260px" }}>
            <Input
              icon={<Icon name="search" />}
              placeholder={filterPlaceholder}
              value={activeGlobalFilter ?? ""}
              onInput={(e) => activeSetGlobalFilter(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          {actions && <div style={{ display: "flex", gap: "0.5rem" }}>{actions}</div>}
        </div>
      )}

      <div ref={tableWrapperRef} style={{ overflowX: "auto", overflowY: "visible", width: "100%" }}>
        <Table
          className="fixed-table"
          headerRow={
            <TableHeaderRow>
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => {
                  const computed = columnWidthsMap[header.id];
                  const colWidth = computed
                    ? `${computed.width}px`
                    : header.column.columnDef.size
                    ? `${header.column.columnDef.size}px`
                    : "80px";

                  return (
                    <TableHeaderCell key={header.id} width={colWidth} style={{ position: "relative", padding: "0.75rem 0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", minWidth: 0 }}>
                        <div style={cellContentWrapStyle}>
                          <Label style={headerLabelStyle}>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </Label>
                        </div>
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          style={{
                            cursor: "col-resize",
                            userSelect: "none",
                            touchAction: "none",
                            height: "60%",
                            width: "2px",
                            backgroundColor: header.column.getIsResizing() ? "var(--sapBrandColor)" : "rgba(0,0,0,0.05)",
                            position: "absolute",
                            right: "4px",
                            top: "20%",
                            zIndex: 1,
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                    </TableHeaderCell>
                  );
                })
              )}
            </TableHeaderRow>
          }
          style={{ width: "100%" }}
        >
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {table.getVisibleFlatColumns().map((column) => (
                  <TableCell key={`skeleton-cell-${i}-${column.id}`}>
                    <Skeleton height="18px" width="75%" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={onRowClick ? "hoverable-row" : ""}
                style={{ cursor: onRowClick ? "pointer" : "default" }}
              >
                {row.getVisibleCells().map((cell) => {
                  const computed = columnWidthsMap[cell.column.id];
                  const cellStyle: React.CSSProperties = computed
                    ? {
                        width: `${computed.width}px`,
                        minWidth: `${computed.minWidth}px`,
                        maxWidth: computed.maxWidth === Number.MAX_SAFE_INTEGER ? "none" : `${computed.maxWidth}px`,
                      }
                    : {
                        width: cell.column.columnDef.size ? `${cell.column.columnDef.size}px` : "auto",
                        minWidth: cell.column.columnDef.minSize ? `${cell.column.columnDef.minSize}px` : "auto",
                        maxWidth:
                          cell.column.columnDef.maxSize && cell.column.columnDef.maxSize !== Number.MAX_SAFE_INTEGER
                            ? `${cell.column.columnDef.maxSize}px`
                            : "none",
                      };
                  return (
                    <TableCell key={cell.id} style={cellStyle}>
                      <div style={cellContentWrapStyle}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : null}
        </Table>
        {!loading && !hideEmptyState && table.getRowModel().rows.length === 0 && (
          <div style={{ padding: "4rem 1rem", display: "flex", justifyContent: "center" }}>
            <EmptyState
              title="No records found"
              description="Try adjusting your search or filters to find what you're looking for."
              icon="search"
            />
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.625rem 1.25rem",
          borderTop: "1px solid var(--sapGroup_ContentBorderColor)",
          background: "var(--sapGroup_TitleBackground)",
        }}
      >
        <Label style={{ fontSize: "0.8rem", opacity: 0.6, fontWeight: 500 }}>
          {start}-{end} of {totalFiltered}
        </Label>
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
          <Button
            design="Transparent"
            icon="navigation-left-arrow"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            tooltip="Previous Page"
          />
          <Label style={{ fontSize: "0.8rem", opacity: 0.6, fontWeight: 500, padding: "0 0.25rem" }}>
            Page {pageIndex + 1} of {table.getPageCount() || 1}
          </Label>
          <Button
            design="Transparent"
            icon="navigation-right-arrow"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            tooltip="Next Page"
          />
        </div>
      </div>
    </div>
  );
}
