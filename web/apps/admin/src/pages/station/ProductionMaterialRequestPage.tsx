import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMaterialQueryKeys,
  createMaterialRequest,
  getMaterialRequestById,
  getMaterialRequestCatalog,
  getMaterialRequestNextNumbers,
  getMaterialRequests,
  NextNumbersResponse,
} from "@traceability/material";
import {
  MaterialRequestForm,
  MaterialRequestFormErrors,
  MaterialRequestLineForm,
  MaterialRequestListTable,
  validateMaterialRequestForm,
} from "@traceability/material-ui";
import { PageLayout } from "@traceability/ui";
import {
  FlexBox,
  FlexBoxAlignItems,
  Label,
  MessageBox,
  MessageStrip,
  ObjectStatus,
  Text,
  Title,
} from "@ui5/webcomponents-react";
import { MaterialRequest, MaterialRequestCatalogItem, MaterialRequestDetail, WorkflowApprovalConfig } from "@traceability/sdk";
import { sdk, useAuth } from "../../context/AuthContext";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { MaterialRequestVoucherView } from "../../components/material/MaterialRequestVoucherView";
import { useMaterialRequestMeta } from "../../hooks/useMaterialRequestMeta";
import { useMaterialRequestsRealtime } from "../../hooks/useMaterialRequestsRealtime";
import { formatDate, formatDateTime } from "../../lib/datetime";
import { formatApiError } from "../../lib/errors";
import { toast } from "sonner";

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
  { key: "requested",  label: "Requested",    sub: "Production" },
  { key: "approved",   label: "Approved",      sub: "Store" },
  { key: "dispatched", label: "Dispatched",    sub: "Store → Forklift" },
  { key: "issued",     label: "Issued",        sub: "Forklift" },
  { key: "prod_ack",   label: "Prod. ACK",     sub: "Production" },
  { key: "fork_ack",   label: "Forklift ACK",  sub: "Forklift" },
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
      <MessageStrip design="Negative" hideCloseButton>
        This role is not allowed to submit material request.
      </MessageStrip>
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
    return flow.includes("material") || flow.includes("request") || flow.includes("requisition") || flow.includes("issue");
  });
  const scopedApprovals =
    materialFlowApprovals.length > 0 ? materialFlowApprovals : keywordApprovals.length > 0 ? keywordApprovals : activeApprovals;
  const approvalRows = scopedApprovals.filter((row) => row.from_status === "REQUESTED").sort((a, b) => a.level - b.level);
  const allApprovalRows = scopedApprovals.sort((a, b) => a.level - b.level);

  const formatApproverWithEmail = (entry: { display_name?: string | null; email?: string | null; user_id?: string }) => {
    const name = entry.display_name || entry.user_id || "Approver";
    return entry.email ? `${name} (${entry.email})` : name;
  };

  // Create-form approval preview text
  const approvalFlowSummary =
    approvalRows.length > 0
      ? approvalRows
          .map((row) => {
            const recipients =
              row.approver_users?.map((u) => u.display_name || u.email || u.user_id).filter(Boolean).join(", ") ||
              row.approver_role_name ||
              "Approver";
            return `L${row.level}: ${recipients}`;
          })
          .join(" → ")
      : null;
  const workflowMailRecipients = Array.from(
    new Set(approvalRows.flatMap((row) => (row.approver_users ?? []).map((u) => (u.email ?? "").trim()).filter(Boolean)))
  );

  // ── Detail-view helpers ───────────────────────────────────────────────────
  const detailStatus = detailsQuery.data?.status;
  const detail = detailsQuery.data;
  const isTerminalStatus = detailStatus === "ISSUED" || detailStatus === "REJECTED" || detailStatus === "CANCELLED";
  const selectedRequestSummary = (requestsQuery.data ?? []).find((row) => row.id === selectedId);

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
    detail?.status === "REJECTED" || detail?.status === "CANCELLED"
      ? -1
      : workflowStepsDone.findIndex((d) => !d);

  // Fallback pending approver info (for non-admin role)
  const fallbackApproverRows = (detail?.alert_recipients ?? selectedRequestSummary?.alert_recipients ?? []).map((row) => ({
    display: formatApproverWithEmail(row),
    email: row.email ?? "",
  }));
  const pendingRows = detail ? allApprovalRows.filter((row) => row.from_status === detailStatus) : [];
  const pendingApprovalText =
    pendingRows.length > 0
      ? pendingRows
          .map((row) => {
            const recipients =
              row.approver_users?.map((u) => u.display_name || u.email || u.user_id).filter(Boolean).join(", ") ||
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

  const getApprovalStepState = (row: WorkflowApprovalConfig): { text: string; state: "Positive" | "Critical" | "Information" | "None" } => {
    if (!detailStatus) return { text: "Planned", state: "Information" };
    if (isTerminalStatus) return { text: "Completed", state: "Positive" };
    const pendingLevelSet = new Set(pendingRows.map((r) => r.level));
    const firstPending = pendingRows.length > 0 ? Math.min(...pendingRows.map((r) => r.level)) : Infinity;
    if (row.from_status === detailStatus && pendingLevelSet.has(row.level)) return { text: "Pending", state: "Critical" };
    if (row.level < firstPending) return { text: "Completed", state: "Positive" };
    return { text: "Planned", state: "Information" };
  };

  // Preview lines for confirm dialog
  const previewLines = lines.filter((l) => l.part_number.trim().length > 0);

  return (
    <div>
      {/* System failure MessageBox (per docs §6: System failure → MessageBox) */}
      <MessageBox
        open={Boolean(systemErrorMsg)}
        type="Error"
        onClose={() => setSystemErrorMsg(null)}
      >
        {systemErrorMsg}
      </MessageBox>

      <PageLayout
        title={
          showCreateForm
            ? "New Material Request"
            : showingDetails
            ? detailsQuery.data?.request_no ?? "Material Request Details"
            : "Material Requests"
        }
        subtitle={
          <FlexBox alignItems={FlexBoxAlignItems.Center}>
            <span className="indicator-live" />
            <Text>
              {showCreateForm
                ? "Create a new material request"
                : showingDetails
                ? "Material Request Details"
                : "Internal warehouse transfer and material requisitions"}
            </Text>
          </FlexBox>
        }
        icon={showCreateForm ? "create-form" : "request"}
        iconColor="blue"
        showBackButton={showCreateForm || showingDetails}
        onBackClick={() => {
          if (showCreateForm) { setShowCreateForm(false); setFormErrors(undefined); }
          if (showingDetails) setSelectedId(null);
        }}
        headerActions={undefined}
      >
        <div className="page-container motion-safe:animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <ApiErrorBanner message={anyError ? formatApiError(anyError) : undefined} />

          {sectionNotSet && (
            <MessageStrip design="Critical" hideCloseButton>
              Your user account has no section assigned. Please contact an administrator.
            </MessageStrip>
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
                  if (formErrors?.cost_center_id) setFormErrors((e) => e ? { ...e, cost_center_id: undefined } : e);
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
                onCancel={() => { setShowCreateForm(false); setFormErrors(undefined); }}
              />

              {/* Approval info card (create form) */}
              {canReadApprovalConfig && (
                <div
                  style={{
                    border: "1px solid var(--sapHighlightColor)",
                    borderRadius: "0.5rem",
                    background: "var(--sapHighlightBackground)",
                    padding: "0.75rem 1rem",
                  }}
                >
                  <Title level="H6" style={{ margin: "0 0 0.4rem", color: "var(--sapHighlightColor)" }}>
                    Approval Route
                  </Title>
                  {approvalFlowSummary ? (
                    <>
                      <Text style={{ fontSize: "0.85rem" }}>{approvalFlowSummary}</Text>
                      {workflowMailRecipients.length > 0 && (
                        <Text style={{ fontSize: "0.8rem", color: "var(--sapContent_LabelColor)", display: "block", marginTop: "0.3rem" }}>
                          Mail alert to: {workflowMailRecipients.join(", ")}
                        </Text>
                      )}
                    </>
                  ) : approvalsQuery.isLoading ? (
                    <Text style={{ fontSize: "0.85rem", color: "var(--sapContent_LabelColor)" }}>Loading approval route…</Text>
                  ) : (
                    <Text style={{ fontSize: "0.85rem", color: "var(--sapContent_LabelColor)" }}>
                      System will route by configured approval rules.
                    </Text>
                  )}
                </div>
              )}
            </>
          ) : showingDetails ? (
            /* ── DETAIL / VOUCHER VIEW ─────────────────────── */
            detail ? (
              <>
                <MaterialRequestVoucherView detail={detail} hideTopBarActions />

                {/* Workflow Timeline */}
                <div
                  style={{
                    border: "1px solid var(--sapGroup_ContentBorderColor)",
                    borderRadius: "0.5rem",
                    background: "var(--sapGroup_ContentBackground)",
                    padding: "0.75rem 1rem",
                  }}
                >
                  <Title level="H6" style={{ margin: "0 0 0.85rem" }}>
                    Request Workflow
                  </Title>

                  {/* Step indicator */}
                  <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", paddingBottom: "0.5rem" }}>
                    {WORKFLOW_STEPS.map((step, idx) => {
                      const done = workflowStepsDone[idx];
                      const active = idx === firstIncompleteIdx;
                      const rejected = (detail.status === "REJECTED" || detail.status === "CANCELLED") && idx > 0 && !done;
                      const circleColor = done
                        ? "var(--sapPositiveColor)"
                        : active
                        ? "var(--sapHighlightColor)"
                        : rejected
                        ? "var(--sapNeutralColor)"
                        : "var(--sapNeutralBorderColor)";
                      const textColor = done
                        ? "var(--sapPositiveColor)"
                        : active
                        ? "var(--sapHighlightColor)"
                        : "var(--sapContent_LabelColor)";
                      return (
                        <div key={step.key} style={{ display: "flex", alignItems: "flex-start", flex: idx < WORKFLOW_STEPS.length - 1 ? "1 1 auto" : "0 0 auto" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "80px" }}>
                            <div
                              style={{
                                width: "2rem",
                                height: "2rem",
                                borderRadius: "50%",
                                background: circleColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                                border: active ? "2px solid var(--sapHighlightColor)" : "none",
                                boxSizing: "border-box",
                              }}
                            >
                              {done ? "✓" : idx + 1}
                            </div>
                            <Text style={{ fontSize: "0.72rem", color: textColor, textAlign: "center", marginTop: "0.3rem", fontWeight: active ? "bold" : "normal" }}>
                              {step.label}
                            </Text>
                            <Text style={{ fontSize: "0.65rem", color: "var(--sapContent_LabelColor)", textAlign: "center" }}>
                              {step.sub}
                            </Text>
                            {active && (
                              <ObjectStatus state="Critical" style={{ marginTop: "0.2rem", fontSize: "0.65rem" }}>
                                Pending
                              </ObjectStatus>
                            )}
                          </div>
                          {idx < WORKFLOW_STEPS.length - 1 && (
                            <div
                              style={{
                                flex: 1,
                                height: "2px",
                                background: done ? "var(--sapPositiveColor)" : "var(--sapNeutralBorderColor)",
                                margin: "1rem 0 0",
                                minWidth: "1rem",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pending approver info */}
                  {!isTerminalStatus && (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        padding: "0.5rem 0.75rem",
                        background: "var(--sapCriticalBackground)",
                        borderRadius: "0.25rem",
                        borderLeft: "3px solid var(--sapCriticalColor)",
                      }}
                    >
                      <Text style={{ fontSize: "0.82rem" }}>
                        <strong>Waiting for:</strong> {pendingApprovalText}
                      </Text>
                    </div>
                  )}

                  {/* Admin-only: full approval config table */}
                  {canReadApprovalConfig && allApprovalRows.length > 0 && (
                    <details style={{ marginTop: "0.85rem" }}>
                      <summary style={{ cursor: "pointer", fontSize: "0.8rem", color: "var(--sapContent_LabelColor)" }}>
                        Approval Configuration ({allApprovalRows.length} step{allApprovalRows.length > 1 ? "s" : ""})
                      </summary>
                      <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {allApprovalRows.map((row) => {
                          const stepState = getApprovalStepState(row);
                          const processors = (row.approver_users ?? [])
                            .map((u) => formatApproverWithEmail(u))
                            .filter(Boolean)
                            .join(", ");
                          return (
                            <div
                              key={row.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "auto 1fr auto",
                                gap: "0.5rem",
                                alignItems: "center",
                                padding: "0.4rem 0.6rem",
                                background: "var(--sapBaseColor)",
                                borderRadius: "0.25rem",
                                border: "1px solid var(--sapList_BorderColor)",
                              }}
                            >
                              <Label style={{ fontWeight: "bold" }}>L{row.level}</Label>
                              <div>
                                <Text style={{ fontSize: "0.82rem" }}>{row.flow_name}</Text>
                                <Text style={{ fontSize: "0.75rem", color: "var(--sapContent_LabelColor)", display: "block" }}>
                                  {processors || row.approver_role_name || "-"}
                                </Text>
                              </div>
                              <ObjectStatus state={stepState.state}>{stepState.text}</ObjectStatus>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}

                  {/* Fallback for non-admin when no config data */}
                  {!canReadApprovalConfig && fallbackApproverRows.length > 0 && (
                    <div style={{ marginTop: "0.5rem" }}>
                      {fallbackApproverRows.map((row, idx) => (
                        <div key={idx} style={{ fontSize: "0.82rem", color: "var(--sapContent_LabelColor)" }}>
                          {row.display}
                        </div>
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
            <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--sapList_BorderColor)", paddingTop: "0.75rem" }}>
              <Label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "bold" }}>Items to be requested:</Label>
              {previewLines.map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.3rem 0",
                    borderBottom: "1px solid var(--sapList_BorderColor)",
                  }}
                >
                  <Text style={{ fontSize: "0.85rem" }}>
                    {`${idx + 1}. ${line.part_number}${line.description ? ` — ${line.description}` : ""}`}
                  </Text>
                  <Text style={{ fontWeight: "bold", marginLeft: "1rem", fontSize: "0.85rem", flexShrink: 0 }}>
                    {`${line.requested_qty ?? "?"} ${line.uom}`}
                  </Text>
                </div>
              ))}
              {approvalFlowSummary && (
                <Text style={{ display: "block", marginTop: "0.6rem", fontSize: "0.8rem", color: "var(--sapContent_LabelColor)" }}>
                  Approval route: {approvalFlowSummary}
                </Text>
              )}
            </div>
          )}
        </ConfirmDialog>
      </PageLayout>
    </div>
  );
}
