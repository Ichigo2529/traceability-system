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

const headerLabelStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: "var(--sapContent_LabelColor)",
  opacity: 0.65,
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
      <div style={{ overflow: "auto" }}>
        <Table
          headerRow={
            <TableHeaderRow>
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => (
                  <TableHeaderCell
                    key={header.id}
                    style={{
                      width:
                        header.column.columnDef.size !== 150
                          ? `${header.getSize()}px`
                          : "auto",
                      minWidth: header.column.columnDef.minSize
                        ? `${header.column.columnDef.minSize}px`
                        : `${header.getSize()}px`,
                      position: "relative",
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
                          height: "100%",
                          width: "5px",
                          backgroundColor: header.column.getIsResizing()
                            ? "var(--sapBrandColor)"
                            : "transparent",
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          zIndex: 1,
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
                style={{ cursor: onRowClick ? "pointer" : "default" }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell>
                <EmptyState
                  title="No records found"
                  description="Try adjusting your search or filters to find what you're looking for."
                  icon="search"
                  style={{ margin: "auto" }}
                />
              </TableCell>
            </TableRow>
          )}
        </Table>
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
