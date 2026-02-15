import React from 'react';
import { cn } from '../../lib/utils';

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id: string | number }>({ data, columns, isLoading, onRowClick }: DataTableProps<T>) {
  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading data...</div>;
  }

  if (data.length === 0) {
    return <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">No records found</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={cn("px-6 py-3 font-medium", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr 
                key={item.id} 
                onClick={() => onRowClick?.(item)}
                className={cn(
                    "bg-white border-b hover:bg-gray-50 transition-colors",
                    onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col, i) => (
                  <td key={i} className={cn("px-6 py-4", col.className)}>
                    {col.cell ? col.cell(item) : (item as any)[col.accessorKey!]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
