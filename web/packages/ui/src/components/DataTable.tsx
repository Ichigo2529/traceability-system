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
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";
import { cn } from "../lib/utils";

const cellContentWrapStyle = "overflow-hidden text-ellipsis whitespace-nowrap min-w-0";

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
      const w =
        typeof def.size === "number" ? def.size : typeof def.minSize === "number" ? def.minSize : DEFAULT_FIXED_WIDTH;
      map[col.id] = { width: w, minWidth: w, maxWidth: w };
      return sum + w;
    }, 0);

    const remainingWidth = containerWidth > 0 ? Math.max(0, containerWidth - fixedWidth - SCROLLBAR_PADDING) : 0;

    if (flexCols.length === 0) return map;
    if (remainingWidth <= 0) {
      flexCols.forEach((col) => {
        const def = col.columnDef;
        const minW = typeof def.minSize === "number" ? def.minSize : DEFAULT_FLEX_WEIGHT;
        map[col.id] = {
          width: minW,
          minWidth: minW,
          maxWidth: def.maxSize && def.maxSize !== Number.MAX_SAFE_INTEGER ? def.maxSize : minW,
        };
      });
      return map;
    }

    const weights: number[] = flexCols.map((col) => {
      const def = col.columnDef;
      return (
        (def.meta as { flex?: number } | undefined)?.flex ??
        (typeof def.minSize === "number" ? def.minSize : DEFAULT_FLEX_WEIGHT)
      );
    });
    const sumWeights = weights.reduce((sum, w) => sum + w, 0);

    flexCols.forEach((col, i) => {
      const def = col.columnDef;
      const maxW =
        def.maxSize !== undefined && def.maxSize !== Number.MAX_SAFE_INTEGER ? def.maxSize : Number.MAX_SAFE_INTEGER;
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
    <div className="flex flex-col w-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      {!hideToolbar && (
        <div className="flex justify-between items-center py-3.5 px-5 border-b border-border bg-muted/30 gap-3">
          <div className="w-[260px] shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={filterPlaceholder}
                value={activeGlobalFilter ?? ""}
                onChange={(e) => activeSetGlobalFilter(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}

      <div ref={tableWrapperRef} className="overflow-x-auto overflow-y-visible w-full">
        <table className="w-full border-collapse table-fixed" style={{ minWidth: "100%" }}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border">
                {headerGroup.headers.map((header) => {
                  const computed = columnWidthsMap[header.id];
                  const colWidth = computed
                    ? `${computed.width}px`
                    : header.column.columnDef.size
                      ? `${header.column.columnDef.size}px`
                      : "80px";
                  return (
                    <th
                      key={header.id}
                      style={{
                        width: colWidth,
                        minWidth: colWidth,
                        maxWidth:
                          computed?.maxWidth !== Number.MAX_SAFE_INTEGER ? `${computed?.maxWidth}px` : undefined,
                        position: "relative",
                        padding: "0.75rem 0.5rem",
                        textAlign: "left",
                      }}
                      className="bg-muted/50"
                    >
                      <div className="flex items-center justify-between w-full min-w-0">
                        <div
                          className={cn(
                            "font-semibold text-xs uppercase tracking-wider text-muted-foreground",
                            cellContentWrapStyle
                          )}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </div>
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className="cursor-col-resize select-none touch-none w-0.5 h-3/5 absolute right-1 top-1/5 rounded bg-border hover:bg-primary"
                          style={{ backgroundColor: header.column.getIsResizing() ? "var(--primary)" : undefined }}
                        />
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-border">
                    {table.getVisibleFlatColumns().map((column) => (
                      <td key={`skeleton-cell-${i}-${column.id}`} className="p-2">
                        <Skeleton height="18px" width="75%" />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn("border-b border-border", onRowClick && "cursor-pointer hover:bg-muted/50")}
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
                        <td key={cell.id} className="p-2 align-middle" style={cellStyle}>
                          <div className={cellContentWrapStyle}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && !hideEmptyState && table.getRowModel().rows.length === 0 && (
          <div className="py-16 flex justify-center">
            <EmptyState
              title="No records found"
              description="Try adjusting your search or filters to find what you're looking for."
            />
          </div>
        )}
      </div>

      <div className="flex justify-between items-center py-2.5 px-5 border-t border-border bg-muted/30 text-sm text-muted-foreground">
        <span>
          {start}-{end} of {totalFiltered}
        </span>
        <div className="flex gap-1 items-center">
          <button
            type="button"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            title="Previous Page"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-1">
            Page {pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <button
            type="button"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            title="Next Page"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
