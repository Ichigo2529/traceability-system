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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  MaterialRequest,
  MaterialRequestCatalogItem,
  MaterialRequestDetail,
  WorkflowApprovalConfig,
} from "@traceability/sdk";
import { sdk, useAuth } from "../../context/AuthContext";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { MaterialRequestVoucherView } from "../../components/material/MaterialRequestVoucherView";
import { useMaterialRequestMeta } from "../../hooks/useMaterialRequestMeta";
import { useMaterialRequestsRealtime } from "../../hooks/useMaterialRequestsRealtime";
import { formatDate, formatDateTime } from "../../lib/datetime";
import { formatApiError } from "../../lib/errors";
import { toast } from "@/lib/toast";
import { ScanInput } from "../../components/shared/ScanInput";
import { Check, Loader2 } from "lucide-react";

const SELECT_NONE = "__none__";

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

const WORKFLOW_STEPS = [
  { key: "requested", label: "Requested", sub: "Production" },
  { key: "approved", label: "Approved", sub: "Store" },
  { key: "dispatched", label: "Dispatched", sub: "Store — Forklift" },
  { key: "issued", label: "Issued", sub: "Forklift" },
  { key: "prod_ack", label: "Prod. ACK", sub: "Production" },
  { key: "fork_ack", label: "Forklift ACK", sub: "Forklift" },
];

export function ProductionMaterialRequestPage() {
  const { hasRole, user } = useAuth();
  const canUsePage = hasRole("PRODUCTION") || hasRole("OPERATOR");
  const canReadApprovalConfig = hasRole("ADMIN");
  const keys = createMaterialQueryKeys("production");
  const queryClient = useQueryClient();
  const [selectedCostCenterId, setSelectedCostCenterId] = useState("");
  const [lines, setLines] = useState<MaterialRequestLineForm[]>([blankLine(1)]);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<MaterialRequestFormErrors | undefined>();
  const [systemErrorMsg, setSystemErrorMsg] = useState<string | null>(null);
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
      if (modelIds.length !== 1) throw new Error("Each voucher must use one model only");
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
        setSelectedId(created.id);
        const itemCount =
          (created as MaterialRequest & { item_count?: number }).item_count ??
          (Array.isArray((created as { items?: unknown[] }).items)
            ? (created as { items: unknown[] }).items.length
            : 0);
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
      // System failure → MessageBox (per docs/UI §6)
      setSystemErrorMsg(err?.message || "Failed to submit request. Please try again.");
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
      setSystemErrorMsg(err?.message || "Failed to withdraw request. Please try again.");
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
    onError: (err: any) => setSystemErrorMsg(err?.message || "Failed to confirm receipt"),
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

  // Workflow timeline step states
  const workflowStepsDone = useMemo(() => {
    if (!detail) return [false, false, false, false, false, false];
    const approved = ["APPROVED", "ISSUED"].includes(detail.status ?? "") || Boolean((detail as any).dispatched_at);
    const dispatched = Boolean((detail as any).dispatched_at);
    const issued = detail.status === "ISSUED" || Boolean((detail as any).production_ack_at);
    const prodAck = Boolean((detail as any).production_ack_at);
    const forkliftAck = Boolean((detail as any).forklift_ack_at);
    return [true, approved, dispatched, issued, prodAck, forkliftAck];
  }, [detail]);

  const firstIncompleteIdx =
    detail?.status === "REJECTED" || detail?.status === "CANCELLED" ? -1 : workflowStepsDone.findIndex((d) => !d);

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
    partOptions,
    doOptionsForPart,
    selectedPart,
    setSelectedPart,
    selectedDo,
    setSelectedDo,
    scanData,
    setScanData,
    manualMode,
    setManualMode,
    manualReason,
    setManualReason,
    stagedScans,
    coverage,
    feedback,
    addStagedScan,
    removeStagedScan,
    clearStagedScans,
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
    <Button variant="destructive" disabled={withdrawMutation.isPending} onClick={() => setConfirmWithdrawOpen(true)}>
      {withdrawMutation.isPending ? "Withdrawing..." : "Withdraw"}
    </Button>
  ) : undefined;

  return (
    <div>
      <Dialog open={Boolean(systemErrorMsg)} onOpenChange={(o) => !o && setSystemErrorMsg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <p className="text-sm">{systemErrorMsg}</p>
          <DialogFooter>
            <Button onClick={() => setSystemErrorMsg(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            {/* View mode / Event–Divert breadcrumb */}
            <nav aria-label="Request flow" className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedId(null);
                  setFormErrors(undefined);
                }}
                className={`hover:text-foreground transition-colors ${!showCreateForm && !showingDetails ? "font-medium text-foreground" : ""}`}
              >
                List
              </button>
              {showCreateForm && (
                <>
                  <span aria-hidden> — </span>
                  <span className="font-medium text-foreground">New request</span>
                </>
              )}
              {showingDetails && !showCreateForm && (
                <>
                  <span aria-hidden> — </span>
                  <span
                    className="font-medium text-foreground truncate max-w-[12rem]"
                    title={detailsQuery.data?.request_no}
                  >
                    {detailsQuery.data?.request_no ?? "Details"}
                  </span>
                </>
              )}
            </nav>
            <span className="hidden sm:inline text-muted-foreground/70"> — </span>
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
          if (showingDetails) setSelectedId(null);
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
                      if (formErrors?.cost_center_id)
                        setFormErrors((e) => (e ? { ...e, cost_center_id: undefined } : e));
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
                      setSelectedId(null);
                      void queryClient.invalidateQueries({ queryKey: keys.requests() });
                    }}
                  >
                    Back to list
                  </Button>
                </div>
              </div>
            ) : detail ? (
              <>
                <MaterialRequestVoucherView detail={detail} hideTopBarActions hideIssueTotalsBeforeIssued />
                {canScanReceive && (
                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base">Receive & Scan 2D</h3>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        Scanner mode
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose Part + DO, then scan 2D barcodes continuously. Use manual fallback if the scanner is
                      unavailable.
                    </p>
                    {feedback.type !== "idle" && (
                      <Alert
                        variant={feedback.type === "success" ? "default" : "destructive"}
                        className="mb-4 transition-opacity"
                      >
                        <AlertDescription>{feedback.message}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex gap-4 flex-wrap items-end">
                      <div className="min-w-[14rem] space-y-1">
                        <Label>Part Number</Label>
                        <Select
                          value={selectedPart || SELECT_NONE}
                          onValueChange={(v) => {
                            const next = v === SELECT_NONE ? "" : v;
                            setSelectedPart(next);
                            setSelectedDo("");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select part number" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SELECT_NONE}>Select part number</SelectItem>
                            {partOptions.map((part) => (
                              <SelectItem key={`part-${part}`} value={part}>
                                {part}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-[12rem] space-y-1">
                        <Label>DO Number</Label>
                        <Select
                          value={selectedDo || SELECT_NONE}
                          onValueChange={(v) => setSelectedDo(v === SELECT_NONE ? "" : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select DO number" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SELECT_NONE}>Select DO number</SelectItem>
                            {doOptionsForPart.map((row) => (
                              <SelectItem key={`do-${selectedPart}-${row}`} value={row}>
                                {row}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-[18rem] flex-1 space-y-1">
                        <Label>{manualMode ? "Manual fallback note" : "2D Barcode Data"}</Label>
                        {manualMode ? (
                          <Textarea value={manualReason} onChange={(e) => setManualReason(e.target.value)} rows={2} />
                        ) : (
                          <div onClick={() => scanInputRef.current?.focus()}>
                            <ScanInput
                              ref={scanInputRef}
                              value={scanData}
                              onChange={setScanData}
                              onSubmit={addStagedScan}
                              placeholder="Scan 2D barcode and press Enter"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
                      <Button
                        variant={manualMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setManualMode((v) => !v)}
                      >
                        {manualMode ? "Manual Fallback ON" : "Use Manual Fallback"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={addStagedScan}>
                        Add Scan Row
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        disabled={!coverage.ready || confirmReceiptMutation.isPending || stagedScans.length === 0}
                        onClick={() => setConfirmReceiptReviewOpen(true)}
                      >
                        Review & Confirm ACK
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={stagedScans.length === 0 || confirmReceiptMutation.isPending}
                        onClick={clearStagedScans}
                      >
                        Clear All
                      </Button>
                      <span
                        className={`ml-auto text-sm font-medium ${
                          coverage.ready ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                        }`}
                      >
                        Coverage: {coverage.scannedCount}/{coverage.requiredCount} packs
                        {coverage.missing.length ? ` · ${coverage.missing.length} remaining` : " · Ready"}
                      </span>
                    </div>
                    {stagedScans.length > 0 && (
                      <div className="mt-4 max-h-44 overflow-y-auto rounded-md border border-border bg-muted/30 p-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Staged scans ({stagedScans.length})
                        </p>
                        <ul className="space-y-1">
                          {stagedScans.map((row, idx) => (
                            <li
                              key={row.id}
                              className="text-sm flex justify-between items-center py-1.5 px-2 rounded hover:bg-background/80"
                            >
                              <span className="truncate">
                                {idx + 1}. {row.part_number} / {row.do_number}
                                {row.source ? ` [${row.source}]` : ""}
                                {row.reason ? ` — ${row.reason}` : ""}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => removeStagedScan(row.id)}
                                aria-label="Remove this scan"
                              >
                                ×
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {detail?.status === "ISSUED" && Boolean(detail?.production_ack_at) && (
                  <Alert className="border-primary/30 bg-primary/5">
                    <AlertDescription className="text-sm">Production receipt already acknowledged.</AlertDescription>
                  </Alert>
                )}

                <div className="rounded-xl border border-border bg-card shadow-sm">
                  <div className="border-b border-border px-5 py-3">
                    <h3 className="text-sm font-semibold tracking-tight">Request workflow</h3>
                  </div>
                  <div className="px-5 py-5">
                    <nav className="w-full overflow-x-auto pb-1" aria-label="Workflow steps">
                      <ol className="flex min-w-[36rem] items-start">
                        {WORKFLOW_STEPS.map((step, idx) => {
                          const done = workflowStepsDone[idx];
                          const active = idx === firstIncompleteIdx;
                          const rejected =
                            (detail.status === "REJECTED" || detail.status === "CANCELLED") && idx > 0 && !done;
                          const segmentComplete = workflowStepsDone[idx];
                          return (
                            <li key={step.key} className="contents">
                              <div className="flex w-[5.25rem] shrink-0 flex-col items-center gap-1.5 text-center">
                                <div
                                  className={
                                    done
                                      ? "flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground"
                                      : active
                                        ? "flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background text-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                                        : rejected
                                          ? "flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground"
                                          : "flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground"
                                  }
                                  aria-current={active ? "step" : undefined}
                                >
                                  {done ? (
                                    <Check className="size-4" strokeWidth={2.5} aria-hidden />
                                  ) : (
                                    <span className="text-xs font-semibold tabular-nums">{idx + 1}</span>
                                  )}
                                </div>
                                <span
                                  className={
                                    done || active
                                      ? "text-xs font-medium text-foreground"
                                      : "text-xs font-medium text-muted-foreground"
                                  }
                                >
                                  {step.label}
                                </span>
                                <span className="text-[11px] leading-tight text-muted-foreground">{step.sub}</span>
                                {active && (
                                  <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                                    Current
                                  </span>
                                )}
                              </div>
                              {idx < WORKFLOW_STEPS.length - 1 && (
                                <div
                                  className="mt-4 flex min-w-[0.75rem] flex-1 items-center self-start px-0.5"
                                  aria-hidden
                                >
                                  <div
                                    className={segmentComplete ? "h-px w-full bg-primary/60" : "h-px w-full bg-border"}
                                  />
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </nav>

                    {!isTerminalStatus && (
                      <div className="mt-5 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3">
                        <p className="text-sm text-foreground">
                          <span className="font-medium text-destructive">Waiting — </span>
                          {pendingApprovalText}
                        </p>
                      </div>
                    )}

                    {canReadApprovalConfig && allApprovalRows.length > 0 && (
                      <details className="mt-6 border-t border-border pt-4">
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
                    )}

                    {!canReadApprovalConfig && fallbackApproverRows.length > 0 && (
                      <div className="mt-6 border-t border-border pt-4">
                        {fallbackApproverRows.map((row, idx) => (
                          <p key={idx} className="text-sm text-muted-foreground">
                            {row.display}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
              onView={(id) => setSelectedId(id)}
              onCreate={() => {
                setLines([blankLine(1)]);
                setSelectedCostCenterId(meta?.default_cost_center_id ?? "");
                setFormErrors(undefined);
                setSystemErrorMsg(null);
                setShowCreateForm(true);
              }}
              formatDateTime={formatDateTime as any}
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
            <div className="mt-3 pt-3 border-t">
              <Label className="block mb-2 font-bold">Items to be requested:</Label>
              {previewLines.map((line, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <span className="text-sm">{`${idx + 1}. ${line.part_number}${line.description ? ` — ${line.description}` : ""}`}</span>
                  <span className="font-bold ml-4 text-sm shrink-0">{`${line.requested_qty ?? "?"} ${line.uom}`}</span>
                </div>
              ))}
              {approvalFlowSummary && (
                <p className="mt-2 text-sm text-muted-foreground block">Approval route: {approvalFlowSummary}</p>
              )}
            </div>
          )}
        </ConfirmDialog>

        <ConfirmDialog
          open={confirmWithdrawOpen}
          title="Confirm Withdraw"
          description={`Withdraw request ${detail?.request_no ?? ""}? This action cannot be undone.`}
          confirmText="Withdraw"
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
          <div className="mt-3">
            <Label className="block mb-2">Reason (optional)</Label>
            <Input
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              placeholder="Optional note for workflow/audit"
              disabled={withdrawMutation.isPending}
            />
          </div>
        </ConfirmDialog>

        <ConfirmDialog
          open={confirmReceiptReviewOpen}
          title="Review & Confirm Production ACK"
          description={`Confirm ${stagedScans.length} scan row(s) for receipt acknowledgement?`}
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
    </div>
  );
}
