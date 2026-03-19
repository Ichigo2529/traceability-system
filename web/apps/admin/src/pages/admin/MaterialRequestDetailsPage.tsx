import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialRequestDetail, MaterialRequestIssueOptionsResponse } from "@traceability/sdk";
import { createMaterialQueryKeys } from "@traceability/material";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { PageLayout, StatusBadge } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { MaterialRequestVoucherView } from "../../components/material/MaterialRequestVoucherView";
import { IssueAllocationSheet } from "../../components/material/IssueAllocationSheet";
import { MaterialRequestWorkflowTimeline } from "../../components/material/MaterialRequestWorkflowTimeline";
import { useIssueAllocationWorkbench } from "../../hooks/useIssueAllocationWorkbench";
import {
  approveMaterialRequest,
  getMaterialIssueOptions,
  getMaterialRequestById,
  issueMaterialRequestWithAllocation,
  rejectMaterialRequest,
} from "../../lib/material-api";
import { AlertTriangle, Check, CheckCircle2, ClipboardList, Loader2, X } from "lucide-react";
import { formatDate, formatDateTime } from "../../lib/datetime";

export function MaterialRequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const keys = createMaterialQueryKeys("admin");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [allocationSheetOpen, setAllocationSheetOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const detailsQuery = useQuery<MaterialRequestDetail>({
    queryKey: keys.request(id),
    queryFn: () => getMaterialRequestById(id!),
    enabled: Boolean(id),
  });

  const issueOptionsQuery = useQuery<MaterialRequestIssueOptionsResponse>({
    queryKey: keys.issueOptions(id),
    queryFn: () => getMaterialIssueOptions(id!),
    enabled: Boolean(id) && (detailsQuery.data?.status === "REQUESTED" || detailsQuery.data?.status === "APPROVED"),
  });

  const workbench = useIssueAllocationWorkbench(issueOptionsQuery.data);

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => approveMaterialRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.requests() });
      queryClient.invalidateQueries({ queryKey: keys.request(id) });
      showToast("Material request approved");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) =>
      rejectMaterialRequest(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.requests() });
      queryClient.invalidateQueries({ queryKey: keys.request(id) });
      showToast("Material request rejected");
    },
  });

  const issueMutation = useMutation({
    mutationFn: ({
      requestId,
      remarks,
      allocations,
    }: {
      requestId: string;
      remarks?: string;
      allocations: Array<{
        item_id: string;
        part_number: string;
        do_number: string;
        vendor_id?: string;
        issued_packs: number;
        issued_qty: number;
        vendor_pack_size: number;
        remarks?: string;
      }>;
    }) =>
      issueMaterialRequestWithAllocation(requestId, {
        remarks,
        allocations,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.requests() });
      await queryClient.invalidateQueries({ queryKey: keys.request(id) });
      await queryClient.invalidateQueries({ queryKey: keys.issueOptions(id) });
      showToast("Material issued successfully");
    },
  });

  const anyError =
    detailsQuery.error ??
    issueOptionsQuery.error ??
    approveMutation.error ??
    rejectMutation.error ??
    issueMutation.error;
  const detail = detailsQuery.data;
  const canIssue = detail?.status === "REQUESTED" || detail?.status === "APPROVED";

  const showActionButtons = Boolean(canIssue);
  const allocationSummary = workbench.issueItems.reduce(
    (summary, item) => {
      const allocatedQty = workbench.allocationTotalsByItem[item.item_id] ?? 0;
      const delta = allocatedQty - item.requested_qty;

      summary.totalItems += 1;
      if (delta === 0) summary.readyItems += 1;
      if (delta < 0) summary.shortItems += 1;
      if (delta > 0) summary.overItems += 1;

      return summary;
    },
    { totalItems: 0, readyItems: 0, shortItems: 0, overItems: 0 }
  );
  const readyToIssue = Boolean(
    canIssue &&
    !issueOptionsQuery.isLoading &&
    !approveMutation.isPending &&
    !rejectMutation.isPending &&
    !issueMutation.isPending &&
    !workbench.issueValidationError
  );

  return (
    <PageLayout
      title={detail?.request_no ?? (detailsQuery.isLoading ? "Loading request..." : "Material Request")}
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          {detail && <StatusBadge status={detail.status} />}
          {detail?.model_code && <span className="text-muted-foreground">{detail.model_code}</span>}
          {detail?.section && <span className="text-muted-foreground">{detail.section}</span>}
        </div>
      }
      icon="request"
      iconColor="blue"
      showBackButton
      onBackClick={() => navigate("/admin/material-requests")}
      headerActions={
        detail ? (
          <div className="flex items-center gap-2">
            {showActionButtons && (
              <Button variant="outline" size="sm" onClick={() => setAllocationSheetOpen(true)}>
                <ClipboardList className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Allocation Workspace
              </Button>
            )}
            {showActionButtons && detail.status === "REQUESTED" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setRejectReason("");
                  setConfirmRejectOpen(true);
                }}
                disabled={approveMutation.isPending || rejectMutation.isPending || issueMutation.isPending}
              >
                <X className="h-4 w-4 mr-1.5" />
                Reject
              </Button>
            )}
            {showActionButtons && (
              <Button
                size="sm"
                onClick={() => {
                  if (!workbench.issueValidationError) setConfirmIssueOpen(true);
                }}
                disabled={Boolean(
                  workbench.issueValidationError ||
                  issueOptionsQuery.isLoading ||
                  approveMutation.isPending ||
                  rejectMutation.isPending ||
                  issueMutation.isPending
                )}
              >
                {issueMutation.isPending || approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1.5" />
                )}
                {detail.status === "REQUESTED" ? "Approve & Issue" : "Issue"}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="page-container flex flex-col gap-4">
        <ApiErrorBanner message={anyError ? formatApiError(anyError) : undefined} />

        {detailsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            <span className="ml-2.5 text-sm text-muted-foreground">Loading request details…</span>
          </div>
        ) : detail ? (
          <>
            {showActionButtons && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Task</CardTitle>
                  <CardDescription>
                    Review request lines, prepare DO allocations in the workspace, and issue only when requested and
                    issued quantities are aligned.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      readyToIssue
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:text-emerald-100"
                        : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-100"
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      {readyToIssue ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                      <div className="space-y-1">
                        <p className="font-medium">
                          {readyToIssue
                            ? "Allocation review complete. This request is ready to issue."
                            : issueOptionsQuery.isLoading
                              ? "Loading issue options and allocation checks..."
                              : "Allocation review still needs attention before issue."}
                        </p>
                        <p className="text-xs opacity-90">
                          {detail.status === "REQUESTED"
                            ? "Issuing from this page will approve the request and issue materials in one step."
                            : "This request is already approved and only needs final issue confirmation."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-foreground">
                      {allocationSummary.readyItems}/{allocationSummary.totalItems || 0} items matched
                    </span>
                    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">
                      {workbench.manualAllocations.length} draft allocation lines
                    </span>
                    {allocationSummary.shortItems > 0 && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-100">
                        {allocationSummary.shortItems} item{allocationSummary.shortItems === 1 ? "" : "s"} short
                      </span>
                    )}
                    {allocationSummary.overItems > 0 && (
                      <span className="rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-1 text-destructive">
                        {allocationSummary.overItems} item{allocationSummary.overItems === 1 ? "" : "s"} over
                      </span>
                    )}
                    {workbench.issueValidationErrors.length > 0 && (
                      <span className="rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-1 text-destructive">
                        {workbench.issueValidationErrors.length} validation check
                        {workbench.issueValidationErrors.length === 1 ? "" : "s"} to resolve
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => setAllocationSheetOpen(true)}>
                      Open Allocation Workspace
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Review the allocation workspace to balance requested vs. issued quantities before final issue.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="pb-2">
              <MaterialRequestVoucherView detail={detail} workbench={workbench} showIssueOptions={canIssue} />
            </div>

            <MaterialRequestWorkflowTimeline detail={detail} formatDate={formatDate} formatDateTime={formatDateTime} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-base font-medium text-foreground">Request not found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This request may have been deleted or you may not have access.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/material-requests")}>
              Back to list
            </Button>
          </div>
        )}
      </div>

      {detail && canIssue && (
        <IssueAllocationSheet
          open={allocationSheetOpen}
          onOpenChange={setAllocationSheetOpen}
          detail={detail}
          workbench={workbench}
        />
      )}

      <ConfirmDialog
        open={confirmIssueOpen}
        title={detailsQuery.data?.status === "REQUESTED" ? "Confirm Approve & Issue" : "Confirm Issue Material"}
        description={
          detailsQuery.data?.status === "REQUESTED"
            ? "This will approve the request and issue material. Ensure all items have DO allocations and issued qty matches requested."
            : "This will issue material for the approved request."
        }
        confirmText={detailsQuery.data?.status === "REQUESTED" ? "Approve & Issue" : "Issue"}
        submitting={issueMutation.isPending || approveMutation.isPending}
        onCancel={() => setConfirmIssueOpen(false)}
        onConfirm={() => {
          if (detailsQuery.data) {
            issueMutation.mutate(
              {
                requestId: detailsQuery.data.id,
                remarks: workbench.issueRemarks || undefined,
                allocations: workbench.buildAllocationsPayload(),
              },
              {
                onSuccess: () => setConfirmIssueOpen(false),
              }
            );
          }
        }}
      />

      <ConfirmDialog
        open={confirmRejectOpen}
        title="Reject Request"
        description="The request will be rejected and the requester will be notified. Please provide a reason (recommended for audit and clarity)."
        confirmText="Reject"
        destructive
        submitting={rejectMutation.isPending}
        onCancel={() => {
          setConfirmRejectOpen(false);
          setRejectReason("");
        }}
        onConfirm={() => {
          if (!detailsQuery.data) return;
          rejectMutation.mutate(
            { requestId: detailsQuery.data.id, reason: rejectReason.trim() || undefined },
            {
              onSuccess: () => {
                setConfirmRejectOpen(false);
                setRejectReason("");
              },
            }
          );
        }}
      >
        <div className="flex flex-col gap-2 py-2">
          <Label htmlFor="material-request-reject-reason" className="text-sm font-semibold text-muted-foreground">
            Reason for rejection
          </Label>
          <Textarea
            id="material-request-reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Enter reason for rejection (optional but recommended)..."
            className="w-full"
          />
        </div>
      </ConfirmDialog>
    </PageLayout>
  );
}
