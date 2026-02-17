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
    Button
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/search.js";
import "@ui5/webcomponents-icons/dist/navigation-left-arrow.js";
import "@ui5/webcomponents-icons/dist/navigation-right-arrow.js";
import { Skeleton, EmptyState } from "@traceability/ui";

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
  // ... (rest of the file until return)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", boxSizing: "border-box" }}>
        
        {!hideToolbar && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ width: "300px" }}>
                <Input
                    icon={<Icon name="search" />}
                    placeholder={filterPlaceholder}
                    value={activeGlobalFilter ?? ""}
                    onInput={(e) => activeSetGlobalFilter(e.target.value)}
                />
            </div>
            {actions && (
                <div>
                    {actions}
                </div>
            )}
        </div>
        )}

        <Table
            headerRow={
                <TableHeaderRow>
                    {table.getHeaderGroups().map((headerGroup) => (
                        headerGroup.headers.map((header) => (
                            <TableHeaderCell 
                                key={header.id} 
                                style={{ 
                                    width: header.column.columnDef.size !== 150 ? `${header.getSize()}px` : 'auto',
                                    minWidth: header.column.columnDef.minSize ? `${header.column.columnDef.minSize}px` : `${header.getSize()}px`,
                                    position: "relative" 
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                                    <Label style={{ fontWeight: "bold" }}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </Label>
                                    <div
                                        onMouseDown={header.getResizeHandler()}
                                        onTouchStart={header.getResizeHandler()}
                                        className={`resizer ${
                                            header.column.getIsResizing() ? "isResizing" : ""
                                        }`}
                                        style={{
                                            transform: header.column.getIsResizing() ? "translateX(0px)" : "translateX(0px)",
                                            cursor: "col-resize",
                                            userSelect: "none",
                                            touchAction: "none",
                                            height: "100%",
                                            width: "5px",
                                            backgroundColor: header.column.getIsResizing() ? "var(--sapSelectedColor)" : "transparent",
                                            position: "absolute",
                                            right: 0,
                                            top: 0,
                                            bottom: 0,
                                            zIndex: 1
                                        }}
                                        title="Resize column"
                                    />
                                </div>
                            </TableHeaderCell>
                        ))
                    ))}
                </TableHeaderRow>
            }
        >
            {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                        {table.getVisibleFlatColumns().map((column) => (
                            <TableCell key={`skeleton-cell-${i}-${column.id}`}>
                                <Skeleton height="20px" width="80%" />
                            </TableCell>
                        ))}
                    </TableRow>
                ))
            ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                    <TableRow 
                        key={row.id}
                        onClick={() => onRowClick?.(row.original)}
                        style={{ cursor: onRowClick ? 'pointer' : 'default' }}
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem" }}>
            <Label>
              {start}-{end} of {totalFiltered}
            </Label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <Button 
                    design="Transparent" 
                    icon="navigation-left-arrow" 
                    disabled={!table.getCanPreviousPage()} 
                    onClick={() => table.previousPage()}
                    tooltip="Previous Page"
                />
                <Label>Page {pageIndex + 1} of {table.getPageCount() || 1}</Label>
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
