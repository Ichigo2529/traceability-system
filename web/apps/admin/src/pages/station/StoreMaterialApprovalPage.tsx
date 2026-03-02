import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMaterialQueryKeys, getMaterialIssueOptions, getMaterialRequestById, getMaterialRequests, getPendingMaterialRequests, issueMaterialRequestWithAllocation, rejectMaterialRequest } from "@traceability/material";
import { MaterialRequestListTable } from "@traceability/material-ui";
import { PageLayout, ConfirmDialog } from "@traceability/ui";
import { BusyIndicator, Button, FlexBox, FlexBoxAlignItems, FlexBoxDirection, MessageStrip, Text, TextArea } from "@ui5/webcomponents-react";
import { useAuth } from "../../context/AuthContext";
import { MaterialRequestVoucherView } from "../../components/material/MaterialRequestVoucherView";
import { useIssueAllocationWorkbench } from "../../hooks/useIssueAllocationWorkbench";
import { useMaterialRequestsRealtime } from "../../hooks/useMaterialRequestsRealtime";
import { formatDateTime } from "../../lib/datetime";

type TabKey = "PENDING" | "HISTORY";

export function StoreMaterialApprovalPage() {
  const { hasRole } = useAuth();
  const canUsePage = hasRole("STORE") || hasRole("SUPERVISOR");
  const queryClient = useQueryClient();
  const keys = createMaterialQueryKeys("store");
  const [tab, setTab] = useState<TabKey>("PENDING");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const pendingQuery = useQuery({
    queryKey: keys.pendingRequests(),
    queryFn: async () => {
      // Keep compatibility when /pending endpoint is inconsistent by falling back to status filter.
      const pending = await getPendingMaterialRequests();
      if (Array.isArray(pending) && pending.length > 0) return pending;
      const all = await getMaterialRequests();
      return (all ?? []).filter((row) => row.status === "REQUESTED" || row.status === "APPROVED");
    },
    enabled: canUsePage,
  });
  const historyQuery = useQuery({
    queryKey: keys.requests(),
    queryFn: () => getMaterialRequests(),
    enabled: canUsePage,
  });

  useMaterialRequestsRealtime({
    enabled: canUsePage,
    queryKeys: [keys.pendingRequests(), keys.requests(), keys.request(selectedId), keys.issueOptions(selectedId)],
  });

  const detailsQuery = useQuery({
    queryKey: keys.request(selectedId),
    queryFn: () => getMaterialRequestById(selectedId!),
    enabled: Boolean(selectedId),
  });
  const issueOptionsQuery = useQuery({
    queryKey: keys.issueOptions(selectedId),
    queryFn: () => getMaterialIssueOptions(selectedId!),
    enabled: Boolean(selectedId) && (detailsQuery.data?.status === "REQUESTED" || detailsQuery.data?.status === "APPROVED"),
  });
  const workbench = useIssueAllocationWorkbench(issueOptionsQuery.data);

  useEffect(() => {
    if (!selectedId && (workbench.manualAllocations.length > 0 || workbench.issueRemarks)) {
      workbench.reset();
    }
  }, [selectedId, workbench.manualAllocations.length, workbench.issueRemarks, workbench.reset]);

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectMaterialRequest(id, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.pendingRequests() });
      await queryClient.invalidateQueries({ queryKey: keys.requests() });
      await queryClient.invalidateQueries({ queryKey: keys.request(selectedId) });
    },
  });
  const issueMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      issueMaterialRequestWithAllocation(id, {
        remarks,
        allocations: workbench.buildAllocationsPayload(),
      }),
    onSuccess: async () => {
      setConfirmIssueOpen(false);
      await queryClient.invalidateQueries({ queryKey: keys.pendingRequests() });
      await queryClient.invalidateQueries({ queryKey: keys.requests() });
      await queryClient.invalidateQueries({ queryKey: keys.request(selectedId) });
      await queryClient.invalidateQueries({ queryKey: keys.issueOptions(selectedId) });
    },
  });

  if (!canUsePage) {
    return <MessageStrip design="Negative">Role Access Denied. Requires STORE or SUPERVISOR role.</MessageStrip>;
  }

  const showingDetail = Boolean(selectedId);
  return (
    <PageLayout
      title={showingDetail ? detailsQuery.data?.request_no ?? "Request Detail" : "Store Material Approval"}
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <Text>Shared issue material flow</Text>
        </FlexBox>
      }
      icon="request"
      iconColor="blue"
      showBackButton={showingDetail}
      onBackClick={() => setSelectedId(null)}
      headerActions={
        !showingDetail ? (
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
            <Button design={tab === "PENDING" ? "Emphasized" : "Transparent"} onClick={() => setTab("PENDING")}>Waiting Approval</Button>
            <Button design={tab === "HISTORY" ? "Emphasized" : "Transparent"} onClick={() => setTab("HISTORY")}>History</Button>
          </FlexBox>
        ) : (
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
            {detailsQuery.data?.status === "REQUESTED" && (
              <Button design="Negative" onClick={() => setConfirmRejectOpen(true)} disabled={rejectMutation.isPending || issueMutation.isPending}>
                Reject
              </Button>
            )}
            {(detailsQuery.data?.status === "REQUESTED" || detailsQuery.data?.status === "APPROVED") && (
              <Button
                design="Emphasized"
                onClick={() => setConfirmIssueOpen(true)}
                disabled={Boolean(workbench.issueValidationError || issueOptionsQuery.isLoading || issueMutation.isPending)}
              >
                {detailsQuery.data?.status === "REQUESTED" ? "Approve & Issue" : "Issue"}
              </Button>
            )}
          </FlexBox>
        )
      }
    >
      <div className="page-container motion-safe:animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {showingDetail ? (
          detailsQuery.isLoading ? (
            <BusyIndicator active text="Loading details..." />
          ) : detailsQuery.data ? (
            <MaterialRequestVoucherView
              detail={detailsQuery.data}
              workbench={workbench}
              showIssueOptions={detailsQuery.data.status === "REQUESTED" || detailsQuery.data.status === "APPROVED"}
              hideTopBarActions
            />
          ) : (
            <MessageStrip design="Negative" hideCloseButton>
              Unable to load request details.
            </MessageStrip>
          )
        ) : (
          <MaterialRequestListTable
            data={tab === "PENDING" ? pendingQuery.data ?? [] : historyQuery.data ?? []}
            loading={tab === "PENDING" ? pendingQuery.isLoading : historyQuery.isLoading}
            onView={(id) => setSelectedId(id)}
            formatDateTime={formatDateTime as any}
            filterPlaceholder={tab === "PENDING" ? "Search waiting requests..." : "Search history..."}
          />
        )}
      </div>

      <ConfirmDialog
        open={confirmIssueOpen}
        title="Confirm Issue"
        description={`Are you sure you want to issue ${workbench.manualAllocations.length} allocation lines?`}
        confirmText="Issue"
        submitting={issueMutation.isPending}
        onCancel={() => setConfirmIssueOpen(false)}
        onConfirm={() => {
          if (!detailsQuery.data) return;
          issueMutation.mutate({ id: detailsQuery.data.id, remarks: workbench.issueRemarks || undefined });
        }}
      />

      <ConfirmDialog
        open={confirmRejectOpen}
        title="Confirm Reject"
        description="Reject this material request?"
        destructive
        confirmText="Reject Request"
        submitting={rejectMutation.isPending}
        onCancel={() => setConfirmRejectOpen(false)}
        onConfirm={() => {
          if (!detailsQuery.data) return;
          rejectMutation.mutate({ id: detailsQuery.data.id, reason: rejectReason.trim() || undefined });
          setConfirmRejectOpen(false);
          setRejectReason("");
        }}
      >
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.5rem", marginTop: "0.75rem" }}>
          <Text style={{ fontSize: "0.8rem", fontWeight: "600" }}>Reason for rejection</Text>
          <TextArea value={rejectReason} onInput={(e) => setRejectReason(e.target.value)} rows={3} />
        </FlexBox>
      </ConfirmDialog>
    </PageLayout>
  );
}
