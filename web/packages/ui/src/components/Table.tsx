import React from 'react';

export interface TableColumnDef<T> {
  accessorKey: string;
  header: string;
  cell?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'start' | 'center' | 'end';
}

export interface TableProps<T> {
  columns: TableColumnDef<T>[];
  data: T[];
  maxHeight?: string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export const Table = React.forwardRef<
  HTMLDivElement,
  TableProps<any>
>(({
  columns,
  data,
  maxHeight = '600px',
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
}, ref) => {
  const [hoveredRow, setHoveredRow] = React.useState<number | null>(null);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--sapContent_LabelColor)' }}>
        Loading data...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--sapContent_LabelColor)' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{
        overflow: 'auto',
        maxHeight,
        border: `1px solid var(--sapContent_BorderColor)`,
        borderRadius: '0.25rem',
      }}
    >
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.875rem',
      }}>
        <thead>
          <tr style={{
            backgroundColor: 'var(--sapList_TableGroupHeaderBackground)',
            borderBottom: `1px solid var(--sapContent_BorderColor)`,
          }}>
            {columns.map((col) => (
              <th
                key={col.accessorKey}
                style={{
                  padding: '0.75rem 1rem',
                  textAlign: col.align || 'start',
                  fontWeight: 600,
                  color: 'var(--sapContent_TextColor)',
                  width: col.width,
                }}
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
              style={{
                borderBottom: `1px solid var(--sapContent_BorderColor)`,
                cursor: onRowClick ? 'pointer' : 'default',
                backgroundColor: hoveredRow === rowIdx && onRowClick ? 'var(--sapList_Hover_Background)' : 'transparent',
                transition: 'background-color 150ms ease-out',
              }}
              onMouseEnter={() => {
                if (onRowClick) {
                  setHoveredRow(rowIdx);
                }
              }}
              onMouseLeave={() => {
                setHoveredRow(null);
              }}
            >
              {columns.map((col) => {
                const value = (row as any)[col.accessorKey];
                const rendered = col.cell ? col.cell(value, row) : value;
                return (
                  <td
                    key={col.accessorKey}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: col.align || 'start',
                      color: 'var(--sapContent_TextColor)',
                      verticalAlign: 'middle',
                    }}
                  >
                    {rendered ?? '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

Table.displayName = 'Table';
