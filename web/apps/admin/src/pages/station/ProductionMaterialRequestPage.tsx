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
import { toast } from "sonner";
import { ScanInput } from "../../components/shared/ScanInput";

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
  { key: "dispatched", label: "Dispatched", sub: "Store → Forklift" },
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
      if (created.id) setSelectedId(created.id);
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
          <div className="flex items-center gap-2">
            <span>
              {showCreateForm
                ? "Create a new material request"
                : showingDetails
                  ? "Material Request Details"
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
        <div
          className="page-container motion-safe:animate-fade-in"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
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
            <>
              <MaterialRequestForm
                lines={lines}
                setLines={(next) => {
                  setLines(next);
                  // Clear errors when user edits (per docs: real-time feedback)
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
                departmentName={meta?.department?.name ?? user?.department ?? "-"}
                sectionDisplay={
                  meta?.section
                    ? `${meta.section.section_name} (${meta.section.section_code})`
                    : `${user?.display_name ?? "-"}${user?.department ? ` / ${user.department}` : ""}`
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

              {/* Approval info card (create form) */}
              {canReadApprovalConfig && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <h3 className="text-sm font-semibold text-primary mb-1">Approval Route</h3>
                  {approvalFlowSummary ? (
                    <>
                      <p className="text-sm">{approvalFlowSummary}</p>
                      {workflowMailRecipients.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 block">
                          Mail alert to: {workflowMailRecipients.join(", ")}
                        </p>
                      )}
                    </>
                  ) : approvalsQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading approval route…</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">System will route by configured approval rules.</p>
                  )}
                </div>
              )}
            </>
          ) : showingDetails ? (
            /* ── DETAIL / VOUCHER VIEW ─────────────────────── */
            detail ? (
              <>
                <MaterialRequestVoucherView detail={detail} hideTopBarActions hideIssueTotalsBeforeIssued />
                {canScanReceive && (
                  <div className="rounded-lg border bg-card p-4">
                    <h3 className="font-semibold mb-3">Receive & Scan 2D</h3>
                    <p className="text-sm text-muted-foreground mb-2 block">
                      Scanner mode: choose Part + DO, then keep scanning continuously.
                    </p>
                    {feedback.type !== "idle" && (
                      <Alert variant={feedback.type === "success" ? "default" : "destructive"} className="mb-2">
                        <AlertDescription>{feedback.message}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex gap-3 flex-wrap">
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
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Button
                        variant={manualMode ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setManualMode((v) => !v)}
                      >
                        {manualMode ? "Manual Fallback ON" : "Use Manual Fallback"}
                      </Button>
                      <Button size="sm" onClick={addStagedScan}>
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
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 block">
                      Coverage (packs): {coverage.scannedCount}/{coverage.requiredCount}{" "}
                      {coverage.missing.length ? `| Remaining ${coverage.missing.length}` : "| Ready"}
                    </p>
                    {stagedScans.length > 0 && (
                      <div className="mt-2 max-h-[11rem] overflow-y-auto border-t pt-2">
                        {stagedScans.map((row, idx) => (
                          <div key={row.id} className="text-sm flex justify-between items-center py-1">
                            <span>
                              {idx + 1}. {row.part_number} / {row.do_number} [{row.source}]
                              {row.reason ? ` - ${row.reason}` : ""}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeStagedScan(row.id)}
                              aria-label="Remove"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {detail?.status === "ISSUED" && Boolean(detail?.production_ack_at) && (
                  <Alert className="border-green-500/50 bg-green-50 dark:bg-green-900/20">
                    <AlertDescription>Production receipt already acknowledged.</AlertDescription>
                  </Alert>
                )}

                {/* Workflow Timeline */}
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="font-semibold mb-3">Request Workflow</h3>

                  <div className="flex items-start overflow-x-auto pb-2">
                    {WORKFLOW_STEPS.map((step, idx) => {
                      const done = workflowStepsDone[idx];
                      const active = idx === firstIncompleteIdx;
                      const rejected =
                        (detail.status === "REJECTED" || detail.status === "CANCELLED") && idx > 0 && !done;
                      const circleClass = done
                        ? "bg-green-600"
                        : active
                          ? "bg-primary border-2 border-primary"
                          : rejected
                            ? "bg-muted-foreground/50"
                            : "bg-muted";
                      const textClass = done
                        ? "text-green-600"
                        : active
                          ? "text-primary font-semibold"
                          : "text-muted-foreground";
                      return (
                        <div key={step.key} className="flex items-start flex-1 min-w-0">
                          <div className="flex flex-col items-center min-w-[80px]">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${circleClass}`}
                            >
                              {done ? "✓" : idx + 1}
                            </div>
                            <span className={`text-xs text-center mt-1 ${textClass}`}>{step.label}</span>
                            <span className="text-[0.65rem] text-muted-foreground text-center">{step.sub}</span>
                            {active && <span className="text-xs text-destructive mt-0.5">Pending</span>}
                          </div>
                          {idx < WORKFLOW_STEPS.length - 1 && (
                            <div
                              className={`flex-1 h-0.5 mt-4 min-w-2 self-center ${done ? "bg-green-600" : "bg-muted"}`}
                              aria-hidden
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!isTerminalStatus && (
                    <div className="mt-3 py-2 px-3 rounded bg-destructive/10 border-l-4 border-destructive">
                      <p className="text-sm">
                        <strong>Waiting for:</strong> {pendingApprovalText}
                      </p>
                    </div>
                  )}

                  {canReadApprovalConfig && allApprovalRows.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-muted-foreground">
                        Approval Configuration ({allApprovalRows.length} step{allApprovalRows.length > 1 ? "s" : ""})
                      </summary>
                      <div className="mt-2 flex flex-col gap-2">
                        {allApprovalRows.map((row) => {
                          const stepState = getApprovalStepState(row);
                          const processors = (row.approver_users ?? [])
                            .map((u) => formatApproverWithEmail(u))
                            .filter(Boolean)
                            .join(", ");
                          const stateClass =
                            stepState.state === "Positive"
                              ? "text-green-600"
                              : stepState.state === "Critical"
                                ? "text-destructive"
                                : "text-muted-foreground";
                          return (
                            <div
                              key={row.id}
                              className="grid grid-cols-[auto_1fr_auto] gap-2 items-center p-2 rounded border bg-background"
                            >
                              <Label className="font-bold">L{row.level}</Label>
                              <div>
                                <p className="text-sm">{row.flow_name}</p>
                                <p className="text-xs text-muted-foreground block">
                                  {processors || row.approver_role_name || "-"}
                                </p>
                              </div>
                              <span className={`text-sm ${stateClass}`}>{stepState.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}

                  {!canReadApprovalConfig && fallbackApproverRows.length > 0 && (
                    <div className="mt-2">
                      {fallbackApproverRows.map((row, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground">
                          {row.display}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null
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
