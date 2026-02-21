import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  PaginationState,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";
import {
  Table,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableCell,
  Label,
  Input,
  Icon,
  Button,
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/search.js";
import "@ui5/webcomponents-icons/dist/navigation-left-arrow.js";
import "@ui5/webcomponents-icons/dist/navigation-right-arrow.js";
import { Skeleton, EmptyState } from "@traceability/ui";

const injectedStyles = `
  ui5-table-row.hoverable-row::part(root):hover,
  ui5-table-row.hoverable-row:hover {
    background-color: var(--sapList_Hover_Background, rgba(0,0,0,0.04)) !important;
  }
  
  /* Force Web Components Table to respect fixed widths and allow horizontal scroll */
  ui5-table.fixed-table::part(table) {
    table-layout: fixed;
    width: 100%;
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
        background: "var(--glass-bg, rgba(255,255,255,0.72))",
        backdropFilter: "var(--glass-blur, blur(12px))",
        WebkitBackdropFilter: "var(--glass-blur, blur(12px))",
        border: "1px solid var(--glass-border, rgba(200,210,230,0.5))",
        borderRadius: "16px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
    >
      <style>{injectedStyles}</style>
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      {!hideToolbar && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.875rem 1.25rem",
            borderBottom: "1px solid var(--glass-border, rgba(0,0,0,0.07))",
            background: "rgba(255,255,255,0.35)",
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

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div style={{ overflowX: "auto", overflowY: "visible", width: "100%" }}>
        <Table
          className="fixed-table"
          headerRow={
            <TableHeaderRow>
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => (
                  <TableHeaderCell
                    key={header.id}
                    style={{
                      width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : "auto",
                      minWidth: header.column.columnDef.minSize ? `${header.column.columnDef.minSize}px` : "auto",
                      maxWidth: header.column.columnDef.maxSize && header.column.columnDef.maxSize !== Number.MAX_SAFE_INTEGER ? `${header.column.columnDef.maxSize}px` : "none",
                      position: "relative",
                      padding: "0.75rem 0.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                      }}
                    >
                      <Label style={headerLabelStyle}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </Label>
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        style={{
                          cursor: "col-resize",
                          userSelect: "none",
                          touchAction: "none",
                          height: "60%",
                          width: "2px",
                          backgroundColor: header.column.getIsResizing()
                            ? "var(--sapBrandColor)"
                            : "rgba(0,0,0,0.05)",
                          position: "absolute",
                          right: "4px",
                          top: "20%",
                          zIndex: 1,
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </TableHeaderCell>
                ))
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
                {row.getVisibleCells().map((cell) => (
                  <TableCell 
                    key={cell.id}
                    style={{
                        width: cell.column.columnDef.size ? `${cell.column.columnDef.size}px` : "auto",
                        minWidth: cell.column.columnDef.minSize ? `${cell.column.columnDef.minSize}px` : "auto",
                        maxWidth: cell.column.columnDef.maxSize && cell.column.columnDef.maxSize !== Number.MAX_SAFE_INTEGER ? `${cell.column.columnDef.maxSize}px` : "none",
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
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

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.625rem 1.25rem",
          borderTop: "1px solid var(--glass-border, rgba(0,0,0,0.07))",
          background: "rgba(255,255,255,0.3)",
        }}
      >
        <Label style={{ fontSize: "0.8rem", opacity: 0.6, fontWeight: 500 }}>
          {start}–{end} of {totalFiltered}
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
