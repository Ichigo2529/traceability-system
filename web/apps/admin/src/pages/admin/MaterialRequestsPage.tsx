import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { MaterialRequest } from "@traceability/sdk";
import { DataTable } from "../../components/shared/DataTable";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { formatDateTime } from "../../lib/datetime";
import { useMaterialRequestsRealtime } from "../../hooks/useMaterialRequestsRealtime";
import { PageLayout } from "@traceability/ui";
import { useNavigate } from "react-router-dom";
import {
  Button,
  FlexBox,
  FlexBoxAlignItems,
} from "@ui5/webcomponents-react";

import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/show-edit.js";
import "@ui5/webcomponents-icons/dist/request.js";

import { getMaterialRequests } from "../../lib/material-api";

export default function MaterialRequestsPage() {
  const navigate = useNavigate();

  const requestsQuery = useQuery({
    queryKey: ["admin-material-requests"],
    queryFn: () => getMaterialRequests(),
  });

  const realtimeQueryKeys = useMemo(
    () => [
      ["admin-material-requests"],
      ["material-request-next-numbers-admin"],
    ],
    []
  );

  useMaterialRequestsRealtime({
    enabled: true,
    queryKeys: realtimeQueryKeys,
  });

  const columns = useMemo<ColumnDef<MaterialRequest>[]>(
    () => [
      { header: "Request No.", accessorKey: "request_no", size: 160 },
      { header: "Model", accessorKey: "model_code", cell: ({ row }) => row.original.model_code || "-", size: 140 },
      { header: "DMI No.", accessorKey: "dmi_no", cell: ({ row }) => row.original.dmi_no || "-", size: 160 },
      {
        header: "Date",
        accessorKey: "created_at",
        cell: ({ row }) => formatDateTime((row.original.created_at ?? row.original.request_date) as any),
        size: 160,
      },
      { header: "Section", accessorKey: "section", cell: ({ row }) => row.original.section || "-", size: 140 },
      { header: "Cost Center", accessorKey: "cost_center", cell: ({ row }) => row.original.cost_center || "-", size: 100 },
      { header: "Process", accessorKey: "process_name", cell: ({ row }) => row.original.process_name || "-", size: 100 },
      { header: "Items", accessorKey: "item_count", cell: ({ row }) => row.original.item_count ?? "-", size: 80 },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} />, size: 110 },
      {
        header: "Actions",
        size: 100,
        cell: ({ row }) => (
          <Button
            icon="show-edit"
            design="Transparent"
            onClick={() => navigate(`/admin/material-requests/${row.original.id}`)}
            tooltip="View Details"
            aria-label="View Details"
          >
            View
          </Button>
        ),
      },
    ],
    [navigate]
  );

  const anyError = requestsQuery.error;

  return (
    <PageLayout
      title="Material Requests"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Internal warehouse transfer and material requisitions</span>
        </FlexBox>
      }
      icon="request"
      iconColor="blue"
    >
      <div className="page-container motion-safe:animate-fade-in">
        <ApiErrorBanner message={anyError ? formatApiError(anyError) : undefined} />
        
        <DataTable 
            data={requestsQuery.data ?? []} 
            columns={columns} 
            loading={requestsQuery.isLoading}
            filterPlaceholder="Search request no., section, cost center..." 
            actions={
                <Button
                    icon="add"
                    design="Emphasized"
                    className="button-hover-scale"
                    onClick={() => navigate("/admin/material-requests/new")}
                >
                    New Request
                </Button>
            }
        />
      </div>
    </PageLayout>
  );
}
