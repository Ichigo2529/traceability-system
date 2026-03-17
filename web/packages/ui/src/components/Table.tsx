import React from "react";
import { cn } from "../lib/utils";
import { Skeleton } from "./Skeleton";

export interface TableColumnDef<T> {
  accessorKey: string;
  header: string;
  cell?: (value: unknown, row: T) => React.ReactNode;
  width?: string;
  align?: "start" | "center" | "end";
}

export interface TableProps<T> {
  columns: TableColumnDef<T>[];
  data: T[];
  maxHeight?: string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

const alignClass = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
};

export const Table = React.forwardRef<HTMLDivElement, TableProps<unknown>>(
  (
    { columns, data, maxHeight = "600px", onRowClick, loading = false, emptyMessage = "No data available", className },
    ref
  ) => {
    if (loading) {
      return (
        <div className={cn("overflow-auto rounded border border-border", className)} style={{ maxHeight }}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                {columns.map((col) => (
                  <th
                    key={col.accessorKey}
                    className={cn("px-4 py-3 font-semibold text-foreground", alignClass[col.align ?? "start"])}
                    style={{ width: col.width }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {columns.map((col) => (
                    <td
                      key={col.accessorKey}
                      className={cn("px-4 py-3 align-middle", alignClass[col.align ?? "start"])}
                    >
                      <Skeleton height="1rem" width={i % 3 === 0 ? "90%" : i % 3 === 1 ? "70%" : "60%"} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (data.length === 0) {
      return <div className="p-8 text-center text-muted-foreground text-sm">{emptyMessage}</div>;
    }

    return (
      <div ref={ref} className={cn("overflow-auto rounded border border-border", className)} style={{ maxHeight }}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.accessorKey}
                  className={cn("px-4 py-3 font-semibold text-foreground", alignClass[col.align ?? "start"])}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-border transition-colors",
                  onRowClick && "cursor-pointer hover:bg-accent"
                )}
              >
                {columns.map((col) => {
                  const value = (row as Record<string, unknown>)[col.accessorKey];
                  const rendered = col.cell ? col.cell(value, row) : value;
                  return (
                    <td
                      key={col.accessorKey}
                      className={cn("px-4 py-3 text-foreground align-middle", alignClass[col.align ?? "start"])}
                    >
                      {(rendered as React.ReactNode) ?? "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

Table.displayName = "Table";
