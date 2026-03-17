import { Loader2 } from "lucide-react";
import React from "react";

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  width?: string;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  emptyText?: string;
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  isLoading,
  onRowClick,
  emptyText = "No records found",
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!data.length) {
    return <div className="flex items-center justify-center p-8 text-muted-foreground">{emptyText}</div>;
  }

  return (
    <div className="h-full w-full overflow-auto rounded border border-border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th
                key={String(col.accessorKey ?? col.header)}
                className="px-4 py-3 text-left text-sm font-medium"
                style={col.width ? { width: col.width, minWidth: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={String(row.id)}
              onClick={() => onRowClick?.(row)}
              className={`border-b hover:bg-muted/50 ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {columns.map((col) => {
                const value = col.accessorKey ? (row as Record<string, unknown>)[col.accessorKey as string] : null;
                const content = col.cell ? col.cell(row) : value != null ? String(value) : "—";
                return (
                  <td
                    key={String(col.accessorKey ?? col.header)}
                    className={`px-4 py-3 text-sm ${col.className ?? ""}`}
                  >
                    {content}
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
