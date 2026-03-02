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
import {
  FlexBox,
  FlexBoxAlignItems,
} from "@ui5/webcomponents-react";

import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/show-edit.js";
import "@ui5/webcomponents-icons/dist/request.js";

import { getMaterialRequests } from "../../lib/material-api";

export default function MaterialRequestsPage() {
  const navigate = useNavigate();
  const keys = createMaterialQueryKeys("admin");

  const requestsQuery = useQuery({
    queryKey: keys.requests(),
    queryFn: () => getMaterialRequests(),
  });

  const realtimeQueryKeys = useMemo(
    () => [
      keys.requests(),
      keys.nextNumbers(),
    ],
    [keys]
  );

  useMaterialRequestsRealtime({
    enabled: true,
    queryKeys: realtimeQueryKeys,
  });

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
        
        <MaterialRequestListTable
          data={requestsQuery.data ?? []}
          loading={requestsQuery.isLoading}
          onView={(id) => navigate(`/admin/material-requests/${id}`)}
          onCreate={() => navigate("/admin/material-requests/new")}
          formatDateTime={formatDateTime as any}
        />
      </div>
    </PageLayout>
  );
}
