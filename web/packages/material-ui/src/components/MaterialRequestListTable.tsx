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

function getStatusDetail(request: MaterialRequest) {
  switch (request.status) {
    case "REQUESTED":
      return "Waiting for approval";
    case "APPROVED":
      return "Waiting for store issue";
    case "ISSUED":
      return request.production_ack_at ? "Production acknowledged" : "Waiting for production ACK";
    case "REJECTED":
      return "Request rejected";
    case "CANCELLED":
      return "Request withdrawn";
    default:
      return request.status;
  }
}

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
          const request = row.original;
          const requestNo = request.request_no ?? "-";
          const secondary = [request.dmi_no ? `DMI ${request.dmi_no}` : null, request.requested_by_name || null]
            .filter(Boolean)
            .join(" • ");
          return (
            <div className="min-w-0 whitespace-normal">
              <p className="truncate font-medium text-foreground" title={request.request_no ?? undefined}>
                {requestNo}
              </p>
              <p className="truncate text-xs text-muted-foreground">{secondary || "No DMI or requestor"}</p>
            </div>
          );
        },
        minSize: 230,
        size: 230,
        meta: { flex: 220 },
      },
      {
        header: "Model",
        accessorKey: "model_code",
        cell: ({ row }) => {
          const request = row.original;
          return (
            <div className="min-w-0 whitespace-normal">
              <p className="truncate font-medium text-foreground" title={request.model_code ?? undefined}>
                {request.model_code || "-"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{request.model_name || "No model name"}</p>
            </div>
          );
        },
        minSize: 180,
        size: 180,
      },
      {
        header: "Date",
        accessorKey: "created_at",
        cell: ({ row }) => {
          const request = row.original;
          const created = formatDateTime((request.created_at ?? request.request_date) as any);
          const updated = request.updated_at ? formatDateTime(request.updated_at) : null;
          return (
            <div className="min-w-0 whitespace-normal">
              <p className="truncate text-foreground" title={created}>
                {created}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {updated ? `Updated ${updated}` : "No recent update"}
              </p>
            </div>
          );
        },
        minSize: 180,
        size: 180,
      },
      {
        header: "Routing",
        accessorKey: "section",
        cell: ({ row }) => {
          const request = row.original;
          return (
            <div className="min-w-0 whitespace-normal">
              <p className="truncate text-foreground" title={request.section ?? undefined}>
                {request.section || "-"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {[request.cost_center, request.process_name].filter(Boolean).join(" • ") || "No cost center or process"}
              </p>
            </div>
          );
        },
        minSize: 220,
        size: 240,
        meta: { flex: 220 },
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
        cell: ({ row }) => (
          <div className="min-w-0 whitespace-normal">
            <StatusBadge status={row.original.status} />
            <p className="mt-1 truncate text-xs text-muted-foreground">{getStatusDetail(row.original)}</p>
          </div>
        ),
        size: 170,
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
              title={requestId ? "Open request details" : "Missing request id"}
              aria-label={requestId ? `Open request ${row.original.request_no ?? ""}` : "Missing request id"}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-3 py-1 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Open
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
      onRowClick={(row) => row.id && onView(row.id)}
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
