import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmMaterialReceipt,
  createMaterialQueryKeys,
  createMaterialRequest,
  getMaterialRequestById,
  getMaterialRequestCatalog,
  getMaterialRequestNextNumbers,
  getMaterialRequests,
  NextNumbersResponse,
  useProductionReceiptScanWorkbench,
  withdrawMaterialRequest,
} from "@traceability/material";
import {
  MaterialRequestForm,
  MaterialRequestFormErrors,
  MaterialRequestLineForm,
  MaterialRequestListTable,
  validateMaterialRequestForm,
} from "@traceability/material-ui";
import { PageLayout } from "@traceability/ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MaterialRequest,
  MaterialRequestCatalogItem,
  MaterialRequestDetail,
  WorkflowApprovalConfig,
} from "@traceability/sdk";
import { sdk, useAuth } from "../../context/AuthContext";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { MaterialRequestWorkflowTimeline } from "../../components/material/MaterialRequestWorkflowTimeline";
import { ProductionReceiptWorkbench } from "../../components/material/ProductionReceiptWorkbench";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { MaterialRequestVoucherView } from "../../components/material/MaterialRequestVoucherView";
import { useMaterialRequestMeta } from "../../hooks/useMaterialRequestMeta";
import { useMaterialRequestsRealtime } from "../../hooks/useMaterialRequestsRealtime";
import { formatDate, formatDateTime } from "../../lib/datetime";
import { formatApiError } from "../../lib/errors";
import { toast } from "@/lib/toast";
import { AlertTriangle, CheckCircle2, Loader2, PackageCheck, Undo2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

function blankLine(itemNo: number): MaterialRequestLineForm {
  return {
    item_no: itemNo,
    model_id: "",
    part_number: "",
    description: "",
    requested_qty: undefined,
    uom: "PCS",
    remarks: "",
  };
}

export function ProductionMaterialRequestPage() {
  const { hasRole, user } = useAuth();
  const canUsePage = hasRole("PRODUCTION") || hasRole("OPERATOR");
  const canReadApprovalConfig = hasRole("ADMIN");
  const keys = createMaterialQueryKeys("production");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id: routeRequestId } = useParams<{ id?: string }>();
  const selectedId = routeRequestId ?? null;
  const [selectedCostCenterId, setSelectedCostCenterId] = useState("");
  const [lines, setLines] = useState<MaterialRequestLineForm[]>([blankLine(1)]);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formErrors, setFormErrors] = useState<MaterialRequestFormErrors | undefined>();
  const [confirmWithdrawOpen, setConfirmWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [confirmReceiptReviewOpen, setConfirmReceiptReviewOpen] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const showingDetails = Boolean(selectedId);

  const { meta, sectionNotSet } = useMaterialRequestMeta(canUsePage);
  const defaultSetRef = useRef(false);
  useEffect(() => {
    if (meta?.default_cost_center_id && !defaultSetRef.current) {
      setSelectedCostCenterId(meta.default_cost_center_id);
      defaultSetRef.current = true;
    }
  }, [meta?.default_cost_center_id]);

  const requestsQuery = useQuery<MaterialRequest[]>({
    queryKey: keys.requests(),
    queryFn: () => getMaterialRequests(),
    enabled: canUsePage,
  });
  const catalogQuery = useQuery<MaterialRequestCatalogItem[]>({
    queryKey: keys.catalog(),
    queryFn: getMaterialRequestCatalog,
    enabled: canUsePage,
  });
  const nextNumbersQuery = useQuery<NextNumbersResponse>({
    queryKey: keys.nextNumbers(),
    queryFn: getMaterialRequestNextNumbers,
    enabled: canUsePage,
    refetchOnWindowFocus: true,
  });
  const detailsQuery = useQuery<MaterialRequestDetail>({
    queryKey: keys.request(selectedId),
    queryFn: () => getMaterialRequestById(selectedId!),
    enabled: Boolean(selectedId),
  });
  const approvalsQuery = useQuery<WorkflowApprovalConfig[]>({
    queryKey: ["workflow-approvals-preview"],
    queryFn: () => sdk.admin.getWorkflowApprovals(),
    enabled: canUsePage && canReadApprovalConfig && (showCreateForm || showingDetails),
    retry: false,
  });

  const realtimeQueryKeys = useMemo(
    () => [keys.requests(), keys.nextNumbers(), keys.request(selectedId)],
    [keys, selectedId]
  );
  useMaterialRequestsRealtime({ enabled: canUsePage, queryKeys: realtimeQueryKeys });

  const createMutation = useMutation<MaterialRequest, any>({
    mutationFn: () => {
      const requestedLines = lines.filter((line) => line.part_number.trim().length > 0);
      if (!requestedLines.length) throw new Error("At least one component line is required");
      const modelIds = Array.from(new Set(requestedLines.map((line) => line.model_id).filter(Boolean)));
      if (modelIds.length !== 1) throw new Error("Each request must use one model only");
      return createMaterialRequest({
        request_no: nextNumbersQuery.data?.request_no,
        dmi_no: nextNumbersQuery.data?.dmi_no,
        request_date: nextNumbersQuery.data?.request_date,
        model_id: modelIds[0],
        cost_center_id: selectedCostCenterId || undefined,
        items: requestedLines.map((line, idx) => ({
          item_no: idx + 1,
          part_number: line.part_number.trim().toUpperCase(),
          description: line.description || undefined,
          requested_qty: line.requested_qty,
          uom: line.uom || "PCS",
          remarks: line.remarks || undefined,
        })),
      });
    },
    onSuccess: async (created) => {
      const recipientList = (created.alert_recipients ?? [])
        .map((r) => r.display_name || r.email || "")
        .filter(Boolean)
        .join(", ");
      toast.success(
        `Request ${created.request_no} submitted.` +
          (recipientList ? ` Waiting approval from: ${recipientList}.` : " Routing to configured approvers.")
      );
      setFormErrors(undefined);
      setShowCreateForm(false);
      if (created.id) {
        navigate(`/station/material/request/${created.id}`);
        const createdWithItems = created as MaterialRequest & { items?: unknown[]; item_count?: number };
        const itemCount =
          createdWithItems.item_count ?? (Array.isArray(createdWithItems.items) ? createdWithItems.items.length : 0);
        queryClient.setQueryData<MaterialRequest[]>(keys.requests(), (old) => {
          const list = old ?? [];
          if (list.some((r) => r.id === created.id)) return list;
          return [{ ...created, item_count: itemCount } as MaterialRequest, ...list];
        });
      }
      await queryClient.invalidateQueries({ queryKey: keys.requests() });
      await queryClient.invalidateQueries({ queryKey: keys.nextNumbers() });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit request. Please try again.");
    },
  });

  const withdrawMutation = useMutation<{ id: string; status: string; alert_status?: string }, any, string>({
    mutationFn: (id: string) => withdrawMaterialRequest(id, withdrawReason.trim() || undefined),
    onSuccess: async () => {
      toast.success("Material request withdrawn.");
      setConfirmWithdrawOpen(false);
      setWithdrawReason("");
      await queryClient.invalidateQueries({ queryKey: keys.requests() });
      if (selectedId) {
        await queryClient.invalidateQueries({ queryKey: keys.request(selectedId) });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to withdraw request. Please try again.");
    },
  });
  const confirmReceiptMutation = useMutation<
    { id: string; status: string; scans_saved?: number },
    any,
    { id: string; scans: Array<{ part_number: string; do_number: string; scan_data: string }>; remarks?: string }
  >({
    mutationFn: ({ id, scans, remarks }) => confirmMaterialReceipt(id, { scans, remarks }),
    onSuccess: async () => {
      toast.success("Production receipt acknowledged successfully.");
      setConfirmReceiptReviewOpen(false);
      resetScanWorkbench();
      if (selectedId) {
        await queryClient.invalidateQueries({ queryKey: keys.request(selectedId) });
      }
      await queryClient.invalidateQueries({ queryKey: keys.requests() });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to confirm receipt"),
  });

  /** Run zod validation; if OK open confirm, if not → show inline errors */
  const handleSubmitClick = () => {
    const result = validateMaterialRequestForm({
      cost_center_id: selectedCostCenterId,
      lines: lines.map((l) => ({
        item_no: l.item_no,
        model_id: l.model_id,
        part_number: l.part_number,
        description: l.description,
        requested_qty: l.requested_qty,
        uom: l.uom,
        remarks: l.remarks,
      })),
    });
    if (!result.success) {
      setFormErrors(result.errors);
      return;
    }
    setFormErrors(undefined);
    setConfirmSubmitOpen(true);
  };

  if (!canUsePage) {
    return (
      <Alert variant="destructive">
        <AlertDescription>This role is not allowed to submit material request.</AlertDescription>
      </Alert>
    );
  }

  const anyError =
    requestsQuery.error ??
    catalogQuery.error ??
    nextNumbersQuery.error ??
    createMutation.error ??
    detailsQuery.error ??
    (canReadApprovalConfig ? approvalsQuery.error : null);

  // ── Workflow config helpers ───────────────────────────────────────────────
  const activeApprovals = (approvalsQuery.data ?? []).filter((row) => row.active);
  const materialFlowApprovals = activeApprovals.filter((row) => row.flow_code === "MATERIAL_REQUEST_APPROVAL");
  const keywordApprovals = activeApprovals.filter((row) => {
    const flow = `${row.flow_code} ${row.flow_name}`.toLowerCase();
    return (
      flow.includes("material") || flow.includes("request") || flow.includes("requisition") || flow.includes("issue")
    );
  });
  const scopedApprovals =
    materialFlowApprovals.length > 0
      ? materialFlowApprovals
      : keywordApprovals.length > 0
        ? keywordApprovals
        : activeApprovals;
  const approvalRows = scopedApprovals
    .filter((row) => row.from_status === "REQUESTED")
    .sort((a, b) => a.level - b.level);
  const allApprovalRows = scopedApprovals.sort((a, b) => a.level - b.level);

  const formatApproverWithEmail = (entry: {
    display_name?: string | null;
    email?: string | null;
    user_id?: string;
  }) => {
    const name = entry.display_name || entry.user_id || "Approver";
    return entry.email ? `${name} (${entry.email})` : name;
  };

  // Create-form approval preview text
  const approvalFlowSummary =
    approvalRows.length > 0
      ? approvalRows
          .map((row) => {
            const recipients =
              row.approver_users
                ?.map((u) => u.display_name || u.email || u.user_id)
                .filter(Boolean)
                .join(", ") ||
              row.approver_role_name ||
              "Approver";
            return `L${row.level}: ${recipients}`;
          })
          .join(" → ")
      : null;
  const workflowMailRecipients = Array.from(
    new Set(
      approvalRows.flatMap((row) => (row.approver_users ?? []).map((u) => (u.email ?? "").trim()).filter(Boolean))
    )
  );

  // ── Detail-view helpers ───────────────────────────────────────────────────
  const detailStatus = detailsQuery.data?.status;
  const detail = detailsQuery.data;
  const isTerminalStatus = detailStatus === "ISSUED" || detailStatus === "REJECTED" || detailStatus === "CANCELLED";
  const selectedRequestSummary = (requestsQuery.data ?? []).find((row) => row.id === selectedId);
  const isRequestOwner = detail?.requested_by_user_id && user?.id ? detail.requested_by_user_id === user.id : false;
  const canWithdrawRequest =
    Boolean(detail?.id) &&
    (detail?.status === "REQUESTED" || detail?.status === "APPROVED") &&
    !detail?.dispatched_at &&
    (isRequestOwner || hasRole("ADMIN"));

  // Fallback pending approver info (for non-admin role)
  const fallbackApproverRows = (detail?.alert_recipients ?? selectedRequestSummary?.alert_recipients ?? []).map(
    (row) => ({
      display: formatApproverWithEmail(row),
      email: row.email ?? "",
    })
  );
  const pendingRows = detail ? allApprovalRows.filter((row) => row.from_status === detailStatus) : [];
  const issuedTargets = useMemo(() => {
    if (!detail) return [] as Array<{ part_number: string; do_number: string; required_packs: number }>;
    const rows = detail.items.flatMap((item) =>
      (item.issue_allocations ?? [])
        .map((alloc) => ({
          part_number: String(item.part_number ?? "").toUpperCase(),
          do_number: String(alloc.do_number ?? "").toUpperCase(),
          required_packs: Math.max(1, Number(alloc.issued_packs ?? 1)),
        }))
        .filter((x) => x.part_number && x.do_number)
    );
    const merged = new Map<string, { part_number: string; do_number: string; required_packs: number }>();
    for (const row of rows) {
      const key = `${row.part_number}|${row.do_number}`;
      const current = merged.get(key);
      if (!current) {
        merged.set(key, row);
      } else {
        merged.set(key, { ...current, required_packs: current.required_packs + row.required_packs });
      }
    }
    return Array.from(merged.values());
  }, [detail]);
  const scanWorkbench = useProductionReceiptScanWorkbench(issuedTargets);
  const {
    selectedPart,
    selectedDo,
    scanData,
    manualMode,
    manualReason,
    stagedScans,
    feedback,
    buildPayloadScans,
    buildManualRemarks,
    reset: resetScanWorkbench,
  } = scanWorkbench;
  const pendingApprovalText =
    pendingRows.length > 0
      ? pendingRows
          .map((row) => {
            const recipients =
              row.approver_users
                ?.map((u) => u.display_name || u.email || u.user_id)
                .filter(Boolean)
                .join(", ") ||
              row.approver_role_name ||
              "Approver";
            return `L${row.level}: ${recipients}`;
          })
          .join(" | ")
      : fallbackApproverRows.length > 0
        ? fallbackApproverRows.map((r) => r.display).join(", ")
        : isTerminalStatus
          ? `No pending approver (${detailStatus?.toLowerCase()})`
          : "Pending approver is resolved by workflow configuration.";

  const getApprovalStepState = (
    row: WorkflowApprovalConfig
  ): { text: string; state: "Positive" | "Critical" | "Information" | "None" } => {
    if (!detailStatus) return { text: "Planned", state: "Information" };
    if (isTerminalStatus) return { text: "Completed", state: "Positive" };
    const pendingLevelSet = new Set(pendingRows.map((r) => r.level));
    const firstPending = pendingRows.length > 0 ? Math.min(...pendingRows.map((r) => r.level)) : Infinity;
    if (row.from_status === detailStatus && pendingLevelSet.has(row.level))
      return { text: "Pending", state: "Critical" };
    if (row.level < firstPending) return { text: "Completed", state: "Positive" };
    return { text: "Planned", state: "Information" };
  };

  // Preview lines for confirm dialog
  const previewLines = lines.filter((l) => l.part_number.trim().length > 0);
  const canScanReceive = detail?.status === "ISSUED" && !detail?.production_ack_at;
  const receiptReady = canScanReceive && scanWorkbench.coverage.ready && stagedScans.length > 0;
  useEffect(() => {
    if (!canScanReceive || manualMode) return;
    const focusInput = () => scanInputRef.current?.focus();
    focusInput();
    const timer = window.setInterval(focusInput, 1200);
    return () => window.clearInterval(timer);
  }, [canScanReceive, manualMode, feedback.at]);

  useEffect(() => {
    if (canScanReceive) return;
    if (stagedScans.length > 0 || selectedPart || selectedDo || scanData || manualReason || manualMode) {
      resetScanWorkbench();
    }
  }, [
    canScanReceive,
    manualMode,
    manualReason,
    resetScanWorkbench,
    scanData,
    selectedDo,
    selectedPart,
    stagedScans.length,
  ]);

  const detailHeaderActions = canWithdrawRequest ? (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/30"
      disabled={withdrawMutation.isPending}
      onClick={() => setConfirmWithdrawOpen(true)}
    >
      {withdrawMutation.isPending ? (
        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
      ) : (
        <Undo2 className="h-4 w-4 mr-1.5" />
      )}
      Withdraw Request
    </Button>
  ) : undefined;

  return (
    <PageLayout
      title={
        showCreateForm
          ? "New Material Request"
          : showingDetails
            ? (detailsQuery.data?.request_no ?? "Material Request Details")
            : "Material Requests"
      }
      subtitle={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground">
            {showCreateForm
              ? "Create a new material request"
              : showingDetails
                ? "View status and receive materials"
                : "Internal warehouse transfer and material requisitions"}
          </span>
        </div>
      }
      icon={showCreateForm ? "create-form" : "request"}
      iconColor="blue"
      showBackButton={showCreateForm || showingDetails}
      onBackClick={() => {
        if (showCreateForm) {
          setShowCreateForm(false);
          setFormErrors(undefined);
        }
        if (showingDetails) navigate("/station/material/request");
      }}
      headerActions={showingDetails ? detailHeaderActions : undefined}
    >
      <div className="page-container motion-safe:animate-fade-in flex flex-col gap-6">
        <ApiErrorBanner message={anyError ? formatApiError(anyError) : undefined} />

        {sectionNotSet && (
          <Alert variant="destructive">
            <AlertDescription>
              Your user account has no section assigned. Please contact an administrator.
            </AlertDescription>
          </Alert>
        )}

        {/* ── CREATE FORM ───────────────────────────────── */}
        {showCreateForm ? (
          <div className="flex flex-col gap-6">
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <header className="border-b bg-muted/30 px-6 py-3">
                <h2 className="text-sm font-semibold tracking-tight">Request form detail</h2>
              </header>
              <div className="p-6">
                <MaterialRequestForm
                  lines={lines}
                  setLines={(next) => {
                    setLines(next);
                    if (formErrors) setFormErrors(undefined);
                  }}
                  selectedCostCenterId={selectedCostCenterId}
                  setSelectedCostCenterId={(v) => {
                    setSelectedCostCenterId(v);
                    if (formErrors?.cost_center_id) setFormErrors((e) => (e ? { ...e, cost_center_id: undefined } : e));
                  }}
                  meta={meta}
                  sectionNotSet={sectionNotSet}
                  catalog={catalogQuery.data ?? []}
                  catalogLoading={catalogQuery.isLoading}
                  requestNo={nextNumbersQuery.data?.request_no}
                  dmiNo={nextNumbersQuery.data?.dmi_no}
                  generatedAt={nextNumbersQuery.data?.generated_at}
                  requestorName={user?.display_name}
                  departmentName={meta?.department?.name ?? user?.department ?? "—"}
                  sectionDisplay={
                    meta?.section
                      ? `${meta.section.section_name} (${meta.section.section_code})`
                      : `${user?.display_name ?? "—"}${user?.department ? ` — ${user.department}` : ""}`
                  }
                  formatDate={formatDate}
                  disabled={Boolean(createMutation.isPending)}
                  formErrors={formErrors}
                  onSubmit={handleSubmitClick}
                  submitLabel={createMutation.isPending ? "Submitting…" : "Submit Request"}
                  disableSubmit={Boolean(createMutation.isPending || sectionNotSet)}
                  onCancel={() => {
                    setShowCreateForm(false);
                    setFormErrors(undefined);
                  }}
                />
              </div>
            </section>
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <header className="border-b bg-muted/30 px-6 py-3">
                <h2 className="text-sm font-semibold tracking-tight">Request workflow</h2>
              </header>
              <div className="p-6">
                {canReadApprovalConfig ? (
                  approvalFlowSummary ? (
                    <>
                      <p className="text-sm text-foreground/90">{approvalFlowSummary}</p>
                      {workflowMailRecipients.length > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Email notifications — {workflowMailRecipients.join(", ")}
                        </p>
                      )}
                    </>
                  ) : approvalsQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading approval route…</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">System routes by configured approval rules.</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Routing follows configured approval rules.</p>
                )}
              </div>
            </section>
          </div>
        ) : showingDetails ? (
          /* ── DETAIL / VOUCHER VIEW ─────────────────────── */
          detailsQuery.isFetching && !detailsQuery.data ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
              <p className="text-sm">Loading request details…</p>
            </div>
          ) : detailsQuery.isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
              <p className="text-sm font-medium text-destructive">{formatApiError(detailsQuery.error as Error)}</p>
              <p className="text-sm text-muted-foreground">
                If you just submitted this request, try returning to the list — it may appear after refresh. Contact
                store if you still cannot open it.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    void queryClient.invalidateQueries({ queryKey: keys.request(selectedId!) });
                  }}
                >
                  Retry
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigate("/station/material/request");
                    void queryClient.invalidateQueries({ queryKey: keys.requests() });
                  }}
                >
                  Back to list
                </Button>
              </div>
            </div>
          ) : detail ? (
            <>
              {canScanReceive && (
                <div className="rounded-xl border border-border bg-card shadow-sm">
                  <div className="flex flex-col gap-4 px-5 py-5">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold tracking-tight">Current Task</h3>
                      <p className="text-sm text-muted-foreground">
                        Scan every issued pack, review staged rows, then confirm acknowledgement only when coverage is
                        complete.
                      </p>
                    </div>
                    <div
                      className={`rounded-lg border px-4 py-3 text-sm ${
                        receiptReady
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:text-emerald-100"
                          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-100"
                      }`}
                      role="status"
                      aria-live="polite"
                    >
                      <div className="flex flex-wrap items-start gap-2">
                        {receiptReady ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        )}
                        <div className="space-y-1">
                          <p className="font-medium">
                            {receiptReady
                              ? "Coverage complete. Review staged rows and confirm acknowledgement."
                              : "Acknowledgement is not ready yet. Continue scanning until all issued packs are covered."}
                          </p>
                          <p className="text-xs opacity-90">
                            Required {scanWorkbench.coverage.requiredCount} pack(s), staged{" "}
                            {scanWorkbench.coverage.scannedCount}, remaining{" "}
                            {Math.max(0, scanWorkbench.coverage.requiredCount - scanWorkbench.coverage.scannedCount)}.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-foreground">
                        {scanWorkbench.coverage.requiredCount} required pack(s)
                      </span>
                      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">
                        {stagedScans.length} staged row(s)
                      </span>
                      {manualMode && (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-100">
                          Manual fallback active
                        </span>
                      )}
                      {receiptReady && (
                        <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:text-emerald-100">
                          <PackageCheck className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                          Ready to confirm ACK
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!canScanReceive && detail.status !== "ISSUED" && !isTerminalStatus && (
                <Alert className="border-primary/30 bg-primary/5">
                  <AlertDescription className="text-sm">
                    This request is still moving through approval and store issue workflow. You can review the request
                    below while waiting for material to be issued.
                  </AlertDescription>
                </Alert>
              )}

              <MaterialRequestVoucherView detail={detail} hideTopBarActions hideIssueTotalsBeforeIssued />
              {canScanReceive && (
                <ProductionReceiptWorkbench
                  workbench={scanWorkbench}
                  scanInputRef={scanInputRef}
                  isSubmitting={confirmReceiptMutation.isPending}
                  onReviewConfirm={() => setConfirmReceiptReviewOpen(true)}
                />
              )}
              {detail?.status === "ISSUED" && Boolean(detail?.production_ack_at) && (
                <Alert className="border-primary/30 bg-primary/5">
                  <AlertDescription className="text-sm">Production receipt already acknowledged.</AlertDescription>
                </Alert>
              )}

              <MaterialRequestWorkflowTimeline
                detail={detail}
                formatDate={formatDate}
                formatDateTime={formatDateTime}
                pendingText={!isTerminalStatus ? pendingApprovalText : undefined}
              />

              {canReadApprovalConfig && allApprovalRows.length > 0 && (
                <div className="rounded-xl border border-border bg-card px-5 py-5 shadow-sm">
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                      Approval configuration ({allApprovalRows.length} step
                      {allApprovalRows.length > 1 ? "s" : ""})
                    </summary>
                    <div className="mt-3 flex flex-col gap-2">
                      {allApprovalRows.map((row) => {
                        const stepState = getApprovalStepState(row);
                        const processors = (row.approver_users ?? [])
                          .map((u) => formatApproverWithEmail(u))
                          .filter(Boolean)
                          .join(", ");
                        const stateClass =
                          stepState.state === "Positive"
                            ? "text-primary"
                            : stepState.state === "Critical"
                              ? "text-destructive"
                              : "text-muted-foreground";
                        return (
                          <div
                            key={row.id}
                            className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-border bg-muted/30 p-3"
                          >
                            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                              L{row.level}
                            </span>
                            <div>
                              <p className="text-sm font-medium">{row.flow_name}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {processors || row.approver_role_name || "—"}
                              </p>
                            </div>
                            <span className={`text-sm font-medium ${stateClass}`}>{stepState.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </div>
              )}

              {!canReadApprovalConfig && fallbackApproverRows.length > 0 && (
                <div className="rounded-xl border border-border bg-card px-5 py-5 shadow-sm">
                  <h3 className="text-sm font-semibold tracking-tight">Approvers</h3>
                  <div className="mt-3 flex flex-col gap-2">
                    {fallbackApproverRows.map((row, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground">
                        {row.display}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No detail loaded for this request.
            </div>
          )
        ) : (
          /* ── LIST VIEW ────────────────────────────────── */
          <MaterialRequestListTable
            data={requestsQuery.data ?? []}
            loading={requestsQuery.isLoading}
            onView={(id) => navigate(`/station/material/request/${id}`)}
            onCreate={() => {
              setLines([blankLine(1)]);
              setSelectedCostCenterId(meta?.default_cost_center_id ?? "");
              setFormErrors(undefined);
              setShowCreateForm(true);
            }}
            formatDateTime={formatDateTime as any}
            filterPlaceholder="Search request no., DMI, model, section, or status..."
            emptyStateTitle="No material requests yet"
            emptyStateDescription="Create a new request to get materials from the warehouse."
          />
        )}
      </div>

      {/* ── CONFIRM SUBMIT DIALOG ─────────────────────────── */}
      <ConfirmDialog
        open={confirmSubmitOpen}
        title="Confirm Submit Request"
        description={`Submit material request ${nextNumbersQuery.data?.request_no ?? ""}?`}
        confirmText="Submit"
        submitting={createMutation.isPending}
        onCancel={() => setConfirmSubmitOpen(false)}
        onConfirm={() => {
          setConfirmSubmitOpen(false);
          createMutation.mutate();
        }}
      >
        {previewLines.length > 0 && (
          <div className="mt-3 space-y-1 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Items to be requested</p>
            {previewLines.map((line, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-b-0">
                <span className="text-sm text-foreground">{`${idx + 1}. ${line.part_number}${line.description ? ` — ${line.description}` : ""}`}</span>
                <span className="text-sm font-semibold tabular-nums shrink-0">{`${line.requested_qty ?? "?"} ${line.uom}`}</span>
              </div>
            ))}
            {approvalFlowSummary && (
              <p className="pt-1 text-sm text-muted-foreground">Approval route: {approvalFlowSummary}</p>
            )}
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmWithdrawOpen}
        title="Withdraw Request"
        description={`Withdraw ${detail?.request_no ?? "this request"}? The request will be cancelled and cannot be undone.`}
        confirmText="Withdraw"
        destructive
        submitting={withdrawMutation.isPending}
        onCancel={() => {
          setConfirmWithdrawOpen(false);
          setWithdrawReason("");
        }}
        onConfirm={() => {
          if (!selectedId) return;
          withdrawMutation.mutate(selectedId);
        }}
      >
        <div className="mt-3 space-y-1.5">
          <Label htmlFor="withdraw-request-reason" className="text-sm font-medium text-muted-foreground">
            Reason (optional)
          </Label>
          <Textarea
            id="withdraw-request-reason"
            value={withdrawReason}
            onChange={(e) => setWithdrawReason(e.target.value)}
            placeholder="Optional note for workflow/audit trail..."
            rows={2}
            disabled={withdrawMutation.isPending}
            className="resize-none"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmReceiptReviewOpen}
        title="Review & Confirm Production ACK"
        description={`Confirm ${stagedScans.length} staged row(s) covering ${scanWorkbench.coverage.scannedCount}/${scanWorkbench.coverage.requiredCount} required pack(s) for receipt acknowledgement?`}
        confirmText="Confirm ACK"
        submitting={confirmReceiptMutation.isPending}
        onCancel={() => setConfirmReceiptReviewOpen(false)}
        onConfirm={() => {
          if (!selectedId) return;
          confirmReceiptMutation.mutate({
            id: selectedId,
            scans: buildPayloadScans(),
            remarks: buildManualRemarks(),
          });
        }}
      />
    </PageLayout>
  );
}
