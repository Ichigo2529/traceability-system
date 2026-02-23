import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialRequestDetail, MaterialRequestIssueOptionsResponse } from "@traceability/sdk";
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
  Bar,
  FlexBoxDirection,
  Text,
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
import "@ui5/webcomponents-icons/dist/accept.js";
import "@ui5/webcomponents-icons/dist/decline.js";
import "@ui5/webcomponents-icons/dist/request.js";

export function MaterialRequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast, ToastComponent } = useToast();

  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const detailsQuery = useQuery<MaterialRequestDetail>({
    queryKey: ["admin-material-request", id],
    queryFn: () => getMaterialRequestById(id!),
    enabled: Boolean(id),
  });

  const issueOptionsQuery = useQuery<MaterialRequestIssueOptionsResponse>({
    queryKey: ["admin-material-request-issue-options", id],
    queryFn: () => getMaterialIssueOptions(id!),
    enabled:
      Boolean(id) &&
      (detailsQuery.data?.status === "REQUESTED" || detailsQuery.data?.status === "APPROVED"),
  });

  const workbench = useIssueAllocationWorkbench(issueOptionsQuery.data);

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => approveMaterialRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-material-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-material-request", id] });
      showToast("Material request approved");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) => rejectMaterialRequest(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-material-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-material-request", id] });
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
      await queryClient.invalidateQueries({ queryKey: ["admin-material-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-material-request", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-material-request-issue-options", id] });
      showToast("Material issued successfully");
    },
  });

  const anyError = detailsQuery.error ?? issueOptionsQuery.error ?? approveMutation.error ?? rejectMutation.error ?? issueMutation.error;

  return (
    <PageLayout
      title={`Request: ${detailsQuery.data?.request_no ?? "Loading..."}`}
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <Text>Material Request Details and Approvals</Text>
        </FlexBox>
      }
      icon="request"
      iconColor="blue"
    >
      <div className="page-container">
        <ApiErrorBanner message={anyError ? formatApiError(anyError) : undefined} />

        {detailsQuery.isLoading ? (
          <BusyIndicator active text="Loading details..." style={{ marginTop: "2rem" }} />
        ) : detailsQuery.data ? (
          <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1.5rem", paddingBottom: "4rem" }}>
            <MaterialRequestVoucherView 
                detail={detailsQuery.data} 
                onBack={() => navigate("/admin/material-requests")}
                workbench={workbench}
                showIssueOptions={detailsQuery.data.status === "REQUESTED" || detailsQuery.data.status === "APPROVED"}
            />
          </FlexBox>
        ) : (
          <FlexBox justifyContent={FlexBoxJustifyContent.Center} style={{ padding: "3rem" }}>
            <Text style={{ color: "var(--sapContent_LabelColor)" }}>Request not found.</Text>
          </FlexBox>
        )}
      </div>

      {detailsQuery.data && (detailsQuery.data.status === "REQUESTED" || detailsQuery.data.status === "APPROVED") && (
        <Bar
          design="FloatingFooter"
          endContent={
            <>
              {detailsQuery.data.status === "REQUESTED" && (
                <Button
                  icon="decline"
                  design="Negative"
                  onClick={() => { setRejectReason(""); setConfirmRejectOpen(true); }}
                  disabled={approveMutation.isPending || rejectMutation.isPending || issueMutation.isPending}
                >
                  Reject
                </Button>
              )}
              <Button
                icon="accept"
                design="Positive"
                onClick={() => { if (!workbench.issueValidationError) setConfirmIssueOpen(true); }}
                disabled={Boolean(workbench.issueValidationError || issueOptionsQuery.isLoading || approveMutation.isPending || rejectMutation.isPending || issueMutation.isPending)}
              >
                {detailsQuery.data.status === "REQUESTED" ? "Approve + Issue Material" : "Issue Material"}
              </Button>
            </>
          }
        />
      )}

      {/* Dialogs */}
      <ConfirmDialog
        open={confirmIssueOpen}
        title={detailsQuery.data?.status === "REQUESTED" ? "Confirm Approve & Issue" : "Confirm Issue Material"}
        description={detailsQuery.data?.status === "REQUESTED" ? "Approve and issue this request now?" : "Issue this approved request now?"}
        confirmText="Issue"
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
        description="Please specify the reason for rejecting this material request."
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
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.75rem", padding: "0.5rem 0" }}>
          <TextArea
            value={rejectReason}
            onInput={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Enter reason for rejection..."
            style={{ width: "100%" }}
          />
        </FlexBox>
      </ConfirmDialog>

      <ToastComponent />
    </PageLayout>
  );
}
