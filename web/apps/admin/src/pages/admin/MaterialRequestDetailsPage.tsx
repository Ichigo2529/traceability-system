import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialRequestDetail, MaterialRequestIssueOptionsResponse } from "@traceability/sdk";
import { createMaterialQueryKeys } from "@traceability/material";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Printer, Check, X } from "lucide-react";

export function MaterialRequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const keys = createMaterialQueryKeys("admin");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

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

  const showActionButtons =
    detailsQuery.data && (detailsQuery.data.status === "REQUESTED" || detailsQuery.data.status === "APPROVED");

  return (
    <PageLayout
      title={detailsQuery.data?.request_no ?? "Loading..."}
      subtitle={
        <div className="flex items-center gap-2">
          <span>Material Request Details and Approvals</span>
        </div>
      }
      icon="request"
      iconColor="blue"
      showBackButton
      onBackClick={() => navigate("/admin/material-requests")}
      headerActions={
        detailsQuery.data ? (
          <div className="flex items-center gap-2">
            {detailsQuery.data.status === "ISSUED" && (
              <Button variant="default" onClick={() => window.print()} title="Print Voucher">
                <Printer className="h-4 w-4 mr-2" />
                Print Voucher
              </Button>
            )}
            {showActionButtons && detailsQuery.data.status === "REQUESTED" && (
              <Button
                variant="destructive"
                onClick={() => {
                  setRejectReason("");
                  setConfirmRejectOpen(true);
                }}
                disabled={approveMutation.isPending || rejectMutation.isPending || issueMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            )}
            {showActionButtons &&
              (detailsQuery.data.status === "REQUESTED" || detailsQuery.data.status === "APPROVED") && (
                <Button
                  variant="default"
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
                  <Check className="h-4 w-4 mr-2" />
                  {detailsQuery.data.status === "REQUESTED" ? "Approve & Issue" : "Issue"}
                </Button>
              )}
          </div>
        ) : undefined
      }
    >
      <div className="page-container flex flex-col gap-4">
        <ApiErrorBanner message={anyError ? formatApiError(anyError) : undefined} />

        {detailsQuery.isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading details...</span>
          </div>
        ) : detailsQuery.data ? (
          <div className="flex flex-col gap-5 pb-4">
            <MaterialRequestVoucherView
              detail={detailsQuery.data}
              onBack={() => navigate("/admin/material-requests")}
              workbench={workbench}
              showIssueOptions={detailsQuery.data.status === "REQUESTED" || detailsQuery.data.status === "APPROVED"}
              hideTopBarActions
            />

            {showActionButtons && (
              <Alert className="w-full">
                <AlertDescription className="text-sm leading-relaxed">
                  {detailsQuery.data.status === "REQUESTED" ? (
                    <>
                      Reject: use when the request is invalid (reason required). When you have added all DO lines and
                      issued totals match requested, scroll up and click <strong>Approve &amp; Issue</strong> in the
                      toolbar.
                    </>
                  ) : (
                    <>
                      When you have added all DO lines and issued totals match requested, scroll up and click{" "}
                      <strong>Issue</strong> in the toolbar.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {detailsQuery.data.status === "ISSUED" && (
              <Alert variant="default" className="border-green-500/50 bg-green-500/10">
                <AlertDescription className="text-sm leading-relaxed">
                  Voucher ready. Use <strong>Print Voucher</strong> above. For receive / 2D scan: go to{" "}
                  <strong>Forklift Intake</strong> or <strong>Station → Store Approvals</strong>.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-12">
            <span className="text-muted-foreground">Request not found.</span>
          </div>
        )}
      </div>

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
          <Label className="text-sm font-semibold text-muted-foreground">Reason for rejection</Label>
          <Textarea
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
