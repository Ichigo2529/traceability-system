import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMaterialQueryKeys,
  getMaterialIssueOptions,
  getMaterialRequestById,
  getMaterialRequests,
  getPendingMaterialRequests,
  issueMaterialRequestWithAllocation,
  rejectMaterialRequest,
} from "@traceability/material";
import { MaterialRequestListTable } from "@traceability/material-ui";
import { PageLayout, ConfirmDialog } from "@traceability/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, ClipboardList, Printer } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { IssueAllocationSheet } from "../../components/material/IssueAllocationSheet";
import { MaterialRequestVoucherView } from "../../components/material/MaterialRequestVoucherView";
import { MaterialRequestWorkflowTimeline } from "../../components/material/MaterialRequestWorkflowTimeline";
import { useIssueAllocationWorkbench } from "../../hooks/useIssueAllocationWorkbench";
import { useMaterialRequestsRealtime } from "../../hooks/useMaterialRequestsRealtime";
import { formatDate, formatDateTime } from "../../lib/datetime";
import { toast } from "@/lib/toast";

type TabKey = "PENDING" | "HISTORY";

export function StoreMaterialApprovalPage() {
  const { hasRole } = useAuth();
  const canUsePage = hasRole("STORE") || hasRole("SUPERVISOR");
  const queryClient = useQueryClient();
  const keys = createMaterialQueryKeys("store");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: routeRequestId } = useParams<{ id?: string }>();
  const selectedId = routeRequestId ?? null;
  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [allocationSheetOpen, setAllocationSheetOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const tab = useMemo<TabKey>(() => {
    const raw = searchParams.get("tab");
    return raw === "history" ? "HISTORY" : "PENDING";
  }, [searchParams]);
  const listSearch = searchParams.toString();
  const listPath = listSearch ? `/station/material/store?${listSearch}` : "/station/material/store";

  const setTab = (next: TabKey) => {
    const params = new URLSearchParams(searchParams);
    if (next === "HISTORY") {
      params.set("tab", "history");
    } else {
      params.delete("tab");
    }
    setSearchParams(params, { replace: true });
  };

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
    enabled:
      Boolean(selectedId) && (detailsQuery.data?.status === "REQUESTED" || detailsQuery.data?.status === "APPROVED"),
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
  const issueMutation = useMutation<
    { id: string; status: string; alert_status?: string },
    any,
    { id: string; remarks?: string }
  >({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      issueMaterialRequestWithAllocation(id, {
        remarks,
        allocations: workbench.buildAllocationsPayload(),
      }),
    onSuccess: async (result, vars) => {
      setConfirmIssueOpen(false);
      const reqNo = detailsQuery.data?.request_no ?? vars.id;
      const statusText = result.alert_status ? ` Email: ${result.alert_status}.` : "";
      toast.success(`Request ${reqNo} issued successfully.${statusText}`);
      await queryClient.invalidateQueries({ queryKey: keys.pendingRequests() });
      await queryClient.invalidateQueries({ queryKey: keys.requests() });
      await queryClient.invalidateQueries({ queryKey: keys.request(selectedId) });
      await queryClient.invalidateQueries({ queryKey: keys.issueOptions(selectedId) });
    },
  });

  if (!canUsePage) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Role Access Denied. Requires STORE or SUPERVISOR role.</AlertDescription>
      </Alert>
    );
  }

  const showingDetail = Boolean(selectedId);
  const detail = detailsQuery.data;
  const canIssue = detail?.status === "REQUESTED" || detail?.status === "APPROVED";
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
    canIssue && !issueOptionsQuery.isLoading && !issueMutation.isPending && !workbench.issueValidationError
  );

  const handleGeneratePdf = async () => {
    if (!detail || detail.status !== "ISSUED") return;

    try {
      setIsGeneratingPdf(true);
      const logoSrc = `${window.location.origin}/logo.png`;
      const { downloadStoreMaterialRequestIssuePdf } = await import("../../lib/pdf/storeMaterialRequestIssuePdf");
      await downloadStoreMaterialRequestIssuePdf(detail, logoSrc);
      toast.success("PDF generated successfully");
    } catch (error) {
      console.error("Failed to generate PDF", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <PageLayout
      title={showingDetail ? (detailsQuery.data?.request_no ?? "Request Detail") : "Store Material Requests"}
      subtitle={
        <div className="flex items-center gap-2">
          <span>
            {showingDetail
              ? "Review request details, complete allocation, and issue material."
              : "Pending review queue and issued request history."}
          </span>
        </div>
      }
      icon="request"
      iconColor="blue"
      showBackButton={showingDetail}
      onBackClick={() => navigate(listPath)}
      headerActions={
        showingDetail ? (
          <div className="flex items-center gap-2">
            {canIssue && (
              <Button variant="outline" size="sm" onClick={() => setAllocationSheetOpen(true)}>
                <ClipboardList className="h-4 w-4 mr-2" aria-hidden="true" />
                Allocation Workspace
              </Button>
            )}
            {detailsQuery.data?.status === "ISSUED" && (
              <Button
                variant="outline"
                size="sm"
                className="no-print"
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
              >
                <Printer className="h-4 w-4 mr-2" />
                {isGeneratingPdf ? "Generating PDF…" : "Export PDF"}
              </Button>
            )}
            {detailsQuery.data?.status === "REQUESTED" && (
              <Button
                variant="destructive"
                onClick={() => setConfirmRejectOpen(true)}
                disabled={rejectMutation.isPending || issueMutation.isPending}
              >
                Reject
              </Button>
            )}
            {canIssue && (
              <Button
                onClick={() => setConfirmIssueOpen(true)}
                disabled={Boolean(
                  workbench.issueValidationError || issueOptionsQuery.isLoading || issueMutation.isPending
                )}
              >
                {detailsQuery.data?.status === "REQUESTED" ? "Approve & Issue" : "Issue"}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 motion-safe:animate-fade-in">
        {showingDetail ? (
          detailsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                aria-hidden
              />
              <span className="ml-2 text-sm text-muted-foreground">Loading request details...</span>
            </div>
          ) : detail ? (
            <>
              {canIssue && (
                <Card>
                  <CardHeader>
                    <CardTitle>Current Task</CardTitle>
                    <CardDescription>
                      Validate DO choices in the allocation workspace, then issue material when the request is fully
                      matched.
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
                              ? "Issuing from this state will approve the request and issue materials in one action."
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

              <MaterialRequestVoucherView detail={detail} workbench={workbench} showIssueOptions={canIssue} />

              <MaterialRequestWorkflowTimeline
                detail={detail}
                formatDate={formatDate}
                formatDateTime={formatDateTime}
              />
            </>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                Unable to load request details. Return to the queue and reopen the request, or try again after refresh.
              </AlertDescription>
            </Alert>
          )
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList>
              <TabsTrigger value="PENDING">Pending Review</TabsTrigger>
              <TabsTrigger value="HISTORY">History</TabsTrigger>
            </TabsList>
            <TabsContent value="PENDING" className="pt-2">
              <MaterialRequestListTable
                data={pendingQuery.data ?? []}
                loading={pendingQuery.isLoading}
                onView={(id) => navigate(`/station/material/store/${id}${listSearch ? `?${listSearch}` : ""}`)}
                formatDateTime={(s) => formatDateTime(s ?? "")}
                filterPlaceholder="Search pending approval, request no., DMI, or section..."
                emptyStateTitle="No requests waiting for store review"
                emptyStateDescription="New material requests will appear here when they need allocation review or issue."
              />
            </TabsContent>
            <TabsContent value="HISTORY" className="pt-2">
              <MaterialRequestListTable
                data={historyQuery.data ?? []}
                loading={historyQuery.isLoading}
                onView={(id) => navigate(`/station/material/store/${id}${listSearch ? `?${listSearch}` : ""}`)}
                formatDateTime={(s) => formatDateTime(s ?? "")}
                filterPlaceholder="Search issued, rejected, cancelled, or acknowledged requests..."
                emptyStateTitle="No material request history yet"
                emptyStateDescription="Issued, rejected, and completed requests will appear here."
              />
            </TabsContent>
          </Tabs>
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
            ? `Approve this request and issue ${workbench.manualAllocations.length} allocation line(s)? Make sure all requested quantities are fully matched first.`
            : `Issue ${workbench.manualAllocations.length} allocation line(s) for this approved request?`
        }
        confirmText={detailsQuery.data?.status === "REQUESTED" ? "Approve & Issue" : "Issue"}
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
        <div className="flex flex-col gap-2 mt-3">
          <Label htmlFor="store-reject-reason" className="text-sm font-semibold">
            Reason for rejection
          </Label>
          <Textarea
            id="store-reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Enter reason for rejection (optional but recommended)..."
            className="resize-none"
          />
        </div>
      </ConfirmDialog>
    </PageLayout>
  );
}
