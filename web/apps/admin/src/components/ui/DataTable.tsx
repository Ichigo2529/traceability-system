import React from 'react';
import {
  AnalyticalTable,
  AnalyticalTableSelectionMode,
  AnalyticalTableScaleWidthMode,
  BusyIndicator 
} from "@ui5/webcomponents-react";

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
  emptyText = "No records found"
}: DataTableProps<T>) {

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
        <BusyIndicator active />
      </div>
    );
  }

  // Map our columns definition to AnalyticalTable columns
  const tableColumns = columns.map((col) => ({
    Header: col.header,
    accessor: col.accessorKey as string, 
    Cell: (instance: any) => {
        if (col.cell) {
            return col.cell(instance.row.original);
        }
        return instance.cell.value;
    },
    width: col.width ? parseInt(col.width) : undefined, 
  }));

  return (
    <div className="admin-table-card" style={{ height: "100%", width: "100%" }}> 
    <AnalyticalTable
        data={data}
        columns={tableColumns}
        selectionMode={onRowClick ? AnalyticalTableSelectionMode.Single : AnalyticalTableSelectionMode.None}
        scaleWidthMode={AnalyticalTableScaleWidthMode.Grow}
        onRowClick={(e) => {
            if (onRowClick) {
                // e.detail.row.original contains the data item
                onRowClick(e.detail.row.original as T);
            }
        }}
        noDataText={emptyText}
        minRows={1}
    />
    </div>
  );
}
