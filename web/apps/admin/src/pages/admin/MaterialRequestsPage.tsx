import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MaterialRequestListTable } from "@traceability/material-ui";
import { createMaterialQueryKeys } from "@traceability/material";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { formatDateTime } from "../../lib/datetime";
import { useMaterialRequestsRealtime } from "../../hooks/useMaterialRequestsRealtime";
import { PageLayout } from "@traceability/ui";
import { useNavigate } from "react-router-dom";
import { getMaterialRequests } from "../../lib/material-api";

export default function MaterialRequestsPage() {
  const navigate = useNavigate();
  const keys = createMaterialQueryKeys("admin");

  const requestsQuery = useQuery({
    queryKey: keys.requests(),
    queryFn: () => getMaterialRequests(),
  });

  const realtimeQueryKeys = useMemo(() => [keys.requests(), keys.nextNumbers()], [keys]);

  useMaterialRequestsRealtime({
    enabled: true,
    queryKeys: realtimeQueryKeys,
  });

  const anyError = requestsQuery.error;

  return (
    <PageLayout
      title="Material Requests"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Track request approval, warehouse issue, and production acknowledgement</span>
        </div>
      }
      icon="request"
      iconColor="blue"
    >
      <div className="page-container motion-safe:animate-fade-in flex flex-col gap-4">
        <ApiErrorBanner message={anyError ? formatApiError(anyError) : undefined} />

        <MaterialRequestListTable
          data={requestsQuery.data ?? []}
          loading={requestsQuery.isLoading}
          onView={(id) => navigate(`/admin/material-requests/${id}`)}
          onCreate={() => navigate("/admin/material-requests/new")}
          formatDateTime={(s) => formatDateTime(s ?? "")}
          filterPlaceholder="Search request no., DMI, model, section, or requestor..."
          emptyStateTitle="No material requests"
          emptyStateDescription="Create a new request to start an internal transfer or requisition."
        />
      </div>
    </PageLayout>
  );
}
