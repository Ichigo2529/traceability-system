import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialRequestDetail, MaterialRequestIssueOptionsResponse } from "@traceability/sdk";
import { createMaterialQueryKeys } from "@traceability/material";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import {
  Button,
  TextArea,
  FlexBox,
  FlexBoxAlignItems,
  FlexBoxJustifyContent,
  BusyIndicator,
  FlexBoxDirection,
  Text,
  MessageStrip,
} from "@ui5/webcomponents-react";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { MaterialRequestVoucherView } from "../../components/material/MaterialRequestVoucherView";
import { useIssueAllocationWorkbench } from "../../hooks/useIssueAllocationWorkbench";
import {
  approveMaterialRequest,
  getMaterialIssueOptions,
  getMaterialRequestById,
  issueMaterialRequestWithAllocation,
  rejectMaterialRequest,
} from "../../lib/material-api";

import "@ui5/webcomponents-icons/dist/print.js";
import "@ui5/webcomponents-icons/dist/nav-back.js";
import "@ui5/webcomponents-icons/dist/accept.js";
import "@ui5/webcomponents-icons/dist/decline.js";
import "@ui5/webcomponents-icons/dist/request.js";

export function MaterialRequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const keys = createMaterialQueryKeys("admin");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast, ToastComponent } = useToast();

  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const detailsQuery = useQuery<MaterialRequestDetail>({
    queryKey: keys.request(id),
    queryFn: () => getMaterialRequestById(id!),
    enabled: Boolean(id),
  });

  const issueOptionsQuery = useQuery<MaterialRequestIssueOptionsResponse>({
    queryKey: keys.issueOptions(id),
    queryFn: () => getMaterialIssueOptions(id!),
    enabled:
      Boolean(id) &&
      (detailsQuery.data?.status === "REQUESTED" || detailsQuery.data?.status === "APPROVED"),
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
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) => rejectMaterialRequest(requestId, reason),
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

  const anyError = detailsQuery.error ?? issueOptionsQuery.error ?? approveMutation.error ?? rejectMutation.error ?? issueMutation.error;

  const showActionButtons =
    detailsQuery.data && (detailsQuery.data.status === "REQUESTED" || detailsQuery.data.status === "APPROVED");

  return (
    <PageLayout
      title={detailsQuery.data?.request_no ?? "Loading..."}
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <Text>Material Request Details and Approvals</Text>
        </FlexBox>
      }
      icon="request"
      iconColor="blue"
      showBackButton
      onBackClick={() => navigate("/admin/material-requests")}
      headerActions={
        detailsQuery.data ? (
          <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
            {detailsQuery.data.status === "ISSUED" && (
              <Button icon="print" design="Transparent" onClick={() => window.print()} tooltip="Print Voucher">
                Print
              </Button>
            )}
            {showActionButtons && detailsQuery.data.status === "REQUESTED" && (
              <Button
                icon="decline"
                design="Negative"
                onClick={() => { setRejectReason(""); setConfirmRejectOpen(true); }}
                disabled={approveMutation.isPending || rejectMutation.isPending || issueMutation.isPending}
              >
                Reject
              </Button>
            )}
            {showActionButtons && (detailsQuery.data.status === "REQUESTED" || detailsQuery.data.status === "APPROVED") && (
              <Button
                icon="accept"
                design="Emphasized"
                onClick={() => { if (!workbench.issueValidationError) setConfirmIssueOpen(true); }}
                disabled={Boolean(workbench.issueValidationError || issueOptionsQuery.isLoading || approveMutation.isPending || rejectMutation.isPending || issueMutation.isPending)}
              >
                {detailsQuery.data.status === "REQUESTED" ? "Approve & Issue" : "Issue"}
              </Button>
            )}
          </FlexBox>
        ) : undefined
      }
    >
      <div className="page-container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <ApiErrorBanner message={anyError ? formatApiError(anyError) : undefined} />

        {detailsQuery.isLoading ? (
          <BusyIndicator active text="Loading details..." style={{ marginTop: "1rem" }} />
        ) : detailsQuery.data ? (
          <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1.25rem", paddingBottom: "1rem" }}>
            <MaterialRequestVoucherView 
                detail={detailsQuery.data} 
                onBack={() => navigate("/admin/material-requests")}
                workbench={workbench}
                showIssueOptions={detailsQuery.data.status === "REQUESTED" || detailsQuery.data.status === "APPROVED"}
                hideTopBarActions
            />

            {/* Hint: when data is complete, scroll up to approve */}
            {showActionButtons && (
              <MessageStrip design="Information" hideCloseButton style={{ width: "100%", boxSizing: "border-box" }}>
                <Text style={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>
                  {detailsQuery.data.status === "REQUESTED" ? (
                    <>Reject: use when the request is invalid (reason required). When you have added all DO lines and issued totals match requested, scroll up and click <strong>Approve &amp; Issue</strong> in the toolbar.</>
                  ) : (
                    <>When you have added all DO lines and issued totals match requested, scroll up and click <strong>Issue</strong> in the toolbar.</>
                  )}
                </Text>
              </MessageStrip>
            )}
          </FlexBox>
        ) : (
          <FlexBox justifyContent={FlexBoxJustifyContent.Center} style={{ padding: "3rem" }}>
            <Text style={{ color: "var(--sapContent_LabelColor)" }}>Request not found.</Text>
          </FlexBox>
        )}
      </div>

      {/* Dialogs */}
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
            issueMutation.mutate({
              requestId: detailsQuery.data.id,
              remarks: workbench.issueRemarks || undefined,
              allocations: workbench.buildAllocationsPayload(),
            }, {
              onSuccess: () => setConfirmIssueOpen(false)
            });
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
          rejectMutation.mutate({ requestId: detailsQuery.data.id, reason: rejectReason.trim() || undefined }, {
            onSuccess: () => {
              setConfirmRejectOpen(false);
              setRejectReason("");
            }
          });
        }}
      >
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.5rem", padding: "0.5rem 0" }}>
          <Text style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--sapContent_LabelColor)" }}>
            Reason for rejection
          </Text>
          <TextArea
            value={rejectReason}
            onInput={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Enter reason for rejection (optional but recommended)..."
            style={{ width: "100%" }}
          />
        </FlexBox>
      </ConfirmDialog>

      <ToastComponent />
    </PageLayout>
  );
}
