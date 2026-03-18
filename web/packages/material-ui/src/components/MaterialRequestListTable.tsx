import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MaterialRequest } from "@traceability/sdk";
import { DataTable, StatusBadge } from "@traceability/ui";

type MaterialRequestListTableProps = {
  data: MaterialRequest[];
  loading?: boolean;
  onView: (id: string) => void;
  onCreate?: () => void;
  createLabel?: string;
  filterPlaceholder?: string;
  formatDateTime: (value: string | null | undefined) => string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
};

export function MaterialRequestListTable({
  data,
  loading,
  onView,
  onCreate,
  createLabel = "New Request",
  filterPlaceholder = "Search request no., section, cost center...",
  formatDateTime,
  emptyStateTitle = "No material requests",
  emptyStateDescription,
}: MaterialRequestListTableProps) {
  const columns = useMemo<ColumnDef<MaterialRequest>[]>(
    () => [
      {
        header: "Request No.",
        accessorKey: "request_no",
        cell: ({ row }) => {
          const v = row.original.request_no ?? "-";
          return <span title={row.original.request_no ?? undefined}>{v}</span>;
        },
        minSize: 200,
        size: 200,
      },
      {
        header: "Model",
        accessorKey: "model_code",
        cell: ({ row }) => {
          const v = row.original.model_code || "-";
          return <span title={row.original.model_code ?? undefined}>{v}</span>;
        },
        minSize: 180,
        size: 180,
      },
      {
        header: "DMI No.",
        accessorKey: "dmi_no",
        cell: ({ row }) => {
          const v = row.original.dmi_no || "-";
          return <span title={row.original.dmi_no ?? undefined}>{v}</span>;
        },
        minSize: 200,
        size: 200,
      },
      {
        header: "Date",
        accessorKey: "created_at",
        cell: ({ row }) => {
          const dt = formatDateTime((row.original.created_at ?? row.original.request_date) as any);
          return <span title={dt}>{dt}</span>;
        },
        minSize: 180,
        size: 180,
      },
      {
        header: "Section",
        accessorKey: "section",
        cell: ({ row }) => {
          const v = row.original.section || "-";
          return <span title={row.original.section ?? undefined}>{v}</span>;
        },
        minSize: 180,
        size: 180,
      },
      {
        header: "Cost Center",
        accessorKey: "cost_center",
        cell: ({ row }) => {
          const v = row.original.cost_center || "-";
          return <span title={row.original.cost_center ?? undefined}>{v}</span>;
        },
        minSize: 220,
        size: 240,
      },
      {
        header: "Process",
        accessorKey: "process_name",
        cell: ({ row }) => row.original.process_name || "-",
        size: 100,
      },
      {
        header: "Items",
        accessorKey: "item_count",
        cell: ({ row }) => (
          <span style={{ display: "block", textAlign: "right" }}>{row.original.item_count ?? "-"}</span>
        ),
        size: 72,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        size: 140,
        meta: { fixed: true },
      },
      {
        id: "actions",
        header: "Actions",
        size: 88,
        cell: ({ row }) => {
          const requestId =
            row.original.id ?? (row.original as any).request_id ?? (row.original as any).material_request_id ?? "";
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                requestId && onView(requestId);
              }}
              disabled={!requestId}
              title={requestId ? "View Details" : "Missing request id"}
              aria-label="View Details"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-3 py-1 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              View
            </button>
          );
        },
      },
    ],
    [formatDateTime, onView]
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      filterPlaceholder={filterPlaceholder}
      emptyStateTitle={emptyStateTitle}
      emptyStateDescription={emptyStateDescription}
      emptyStateActionText={onCreate ? createLabel : undefined}
      emptyStateOnAction={onCreate ?? undefined}
      actions={
        onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {createLabel}
          </button>
        ) : undefined
      }
    />
  );
}
