import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { MaterialRequest, MaterialRequestDetail, MaterialRequestIssueOptionsResponse } from "@traceability/sdk";
import { ClipboardCheck, History } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { MaterialRequestVoucherView } from "../../components/material/MaterialRequestVoucherView";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { formatApiError } from "../../lib/errors";
import { useMaterialRequestsRealtime } from "../../hooks/useMaterialRequestsRealtime";
import { useDelayedBusy } from "../../hooks/useDelayedBusy";
import { LoadingSkeleton } from "../../components/shared/States";
import { UnderlineTabs } from "../../components/shared/UnderlineTabs";
import { useIssueAllocationWorkbench } from "../../hooks/useIssueAllocationWorkbench";
import { IssueAllocationWorkbench } from "../../components/material/IssueAllocationWorkbench";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import {
  approveMaterialRequest,
  getMaterialIssueOptions,
  getMaterialRequestById,
  getMaterialRequests,
  getPendingMaterialRequests,
  issueMaterialRequestWithAllocation,
  rejectMaterialRequest,
} from "../../lib/material-api";

type TabKey = "PENDING" | "HISTORY";

export function StoreMaterialApprovalPage() {
  const { hasRole } = useAuth();
  const canUsePage = hasRole("STORE") || hasRole("SUPERVISOR");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("PENDING");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const pendingQuery = useQuery({
    queryKey: ["station-store-material-pending"],
    queryFn: () => getPendingMaterialRequests(),
    enabled: canUsePage,
  });

  const historyQuery = useQuery({
    queryKey: ["station-store-material-history"],
    queryFn: () => getMaterialRequests(),
    enabled: canUsePage,
  });

  const realtimeQueryKeys = useMemo(
    () => [
      ["station-store-material-pending"],
      ["station-store-material-history"],
      ["station-store-material-detail"],
    ],
    []
  );

  useMaterialRequestsRealtime({
    enabled: canUsePage,
    queryKeys: realtimeQueryKeys,
  });

  const detailsQuery = useQuery<MaterialRequestDetail>({
    queryKey: ["station-store-material-detail", selectedId],
    queryFn: () => getMaterialRequestById(selectedId!),
    enabled: Boolean(selectedId),
  });

  const issueOptionsQuery = useQuery<MaterialRequestIssueOptionsResponse>({
    queryKey: ["station-store-material-issue-options", selectedId],
    queryFn: () => getMaterialIssueOptions(selectedId!),
    enabled:
      Boolean(selectedId) &&
      detailsOpen &&
      (detailsQuery.data?.status === "REQUESTED" || detailsQuery.data?.status === "APPROVED"),
  });
  const workbench = useIssueAllocationWorkbench(issueOptionsQuery.data);

  useEffect(() => {
    if (!detailsOpen) {
      workbench.reset();
      return;
    }
  }, [detailsOpen, workbench.reset]);

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveMaterialRequest(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["station-store-material-pending"] });
      await queryClient.invalidateQueries({ queryKey: ["station-store-material-history"] });
      await queryClient.invalidateQueries({ queryKey: ["station-store-material-detail"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectMaterialRequest(id, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["station-store-material-pending"] });
      await queryClient.invalidateQueries({ queryKey: ["station-store-material-history"] });
      await queryClient.invalidateQueries({ queryKey: ["station-store-material-detail"] });
    },
  });

  const issueMutation = useMutation({
    mutationFn: ({
      id,
      remarks,
      allocations,
    }: {
      id: string;
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
      issueMaterialRequestWithAllocation(id, {
        remarks,
        allocations,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["station-store-material-pending"] });
      await queryClient.invalidateQueries({ queryKey: ["station-store-material-history"] });
      await queryClient.invalidateQueries({ queryKey: ["station-store-material-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["station-store-material-issue-options"] });
    },
  });

  const columns = useMemo<ColumnDef<MaterialRequest>[]>(
    () => [
      { header: "Request No.", accessorKey: "request_no" },
      { header: "Model", accessorKey: "model_code", cell: ({ row }) => row.original.model_code || "-" },
      { header: "Date", accessorKey: "request_date" },
      { header: "Section", accessorKey: "section", cell: ({ row }) => row.original.section || "-" },
      { header: "Cost Center", accessorKey: "cost_center", cell: ({ row }) => row.original.cost_center || "-" },
      { header: "Process", accessorKey: "process_name", cell: ({ row }) => row.original.process_name || "-" },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: "DMI No.", accessorKey: "dmi_no", cell: ({ row }) => row.original.dmi_no || "-" },
      {
        header: "Actions",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedId(row.original.id);
              setDetailsOpen(true);
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [approveMutation, issueMutation, rejectMutation]
  );

  const anyError =
    pendingQuery.error ??
    historyQuery.error ??
    detailsQuery.error ??
    issueOptionsQuery.error ??
    approveMutation.error ??
    rejectMutation.error ??
    issueMutation.error;
  const showPendingLoading = useDelayedBusy(
    pendingQuery.isLoading || (pendingQuery.isFetching && !pendingQuery.data),
    250
  );
  const showHistoryLoading = useDelayedBusy(
    historyQuery.isLoading || (historyQuery.isFetching && !historyQuery.data),
    250
  );
  const showDetailsLoading = useDelayedBusy(Boolean(selectedId) && detailsQuery.isLoading, 200);
  const showIssueOptionsLoading = useDelayedBusy(Boolean(selectedId) && issueOptionsQuery.isLoading, 250);

  if (!canUsePage) {
    return <Card><CardContent className="p-6 text-sm text-slate-600">Role นี้ไม่มีสิทธิ์อนุมัติ/จ่ายของ (ต้องมี STORE หรือ SUPERVISOR)</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Store Material Approval" description="Store queue, approval and issue history" />
      <ApiErrorBanner message={anyError ? formatApiError(anyError) : undefined} />

      <UnderlineTabs
        value={tab}
        onChange={setTab}
        items={[
          { key: "PENDING", label: "Waiting Approval", icon: ClipboardCheck },
          { key: "HISTORY", label: "History", icon: History },
        ]}
      />

      {tab === "PENDING" ? (
        showPendingLoading ? (
          <LoadingSkeleton label="Loading waiting approvals..." />
        ) : (
          <DataTable
            data={pendingQuery.data ?? []}
            columns={columns}
            filterPlaceholder="Search waiting requests"
          />
        )
      ) : showHistoryLoading ? (
        <LoadingSkeleton label="Loading issue history..." />
      ) : (
        <DataTable
          data={historyQuery.data ?? []}
          columns={columns}
          filterPlaceholder="Search by request / section / status"
        />
      )}

      <FormDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={`Request ${detailsQuery.data?.request_no ?? ""}`}
        onSubmit={() => setDetailsOpen(false)}
        contentClassName="max-w-[1200px]"
        bodyClassName="p-0"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Status:</span>
              <StatusBadge status={detailsQuery.data?.status ?? "REQUESTED"} />
            </div>
            <div className="flex flex-wrap gap-2">
              {detailsQuery.data?.status === "REQUESTED" || detailsQuery.data?.status === "APPROVED" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    if (!detailsQuery.data) return;
                    if (workbench.issueValidationError) return;
                    setConfirmIssueOpen(true);
                  }}
                  disabled={Boolean(
                    workbench.issueValidationError ||
                      issueOptionsQuery.isLoading ||
                      approveMutation.isPending ||
                      rejectMutation.isPending ||
                      issueMutation.isPending
                  )}
                >
                  {detailsQuery.data?.status === "REQUESTED" ? "Approve + Issue Material" : "Issue Material"}
                </Button>
              ) : null}
              {detailsQuery.data?.status === "REQUESTED" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!detailsQuery.data) return;
                    setRejectReason("");
                    setConfirmRejectOpen(true);
                  }}
                  disabled={approveMutation.isPending || rejectMutation.isPending || issueMutation.isPending}
                >
                  Reject
                </Button>
              ) : null}
              {detailsQuery.data?.status === "ISSUED" ? (
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  Print
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        {showDetailsLoading ? (
          <LoadingSkeleton label="Loading request details..." />
        ) : detailsQuery.data ? (
          <div className="space-y-3">
            <MaterialRequestVoucherView detail={detailsQuery.data} />

            {detailsQuery.data.status === "REQUESTED" || detailsQuery.data.status === "APPROVED" ? (
              <IssueAllocationWorkbench
                issueOptions={issueOptionsQuery.data}
                isLoading={showIssueOptionsLoading}
                issueRemarks={workbench.issueRemarks}
                onIssueRemarksChange={workbench.setIssueRemarks}
                manualAllocations={workbench.manualAllocations}
                setManualAllocations={workbench.setManualAllocations}
                allocationTotalsByItem={workbench.allocationTotalsByItem}
                addAllocationLine={workbench.addAllocationLine}
                issueValidationError={workbench.issueValidationError}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No details loaded.</p>
        )}
      </FormDialog>
      <ConfirmDialog
        open={confirmIssueOpen}
        title={detailsQuery.data?.status === "REQUESTED" ? "Confirm approve + issue" : "Confirm issue material"}
        description={
          detailsQuery.data?.status === "REQUESTED"
            ? "Approve and issue this request now?"
            : "Issue this approved request now?"
        }
        confirmText={detailsQuery.data?.status === "REQUESTED" ? "Approve + Issue" : "Issue"}
        onCancel={() => setConfirmIssueOpen(false)}
        onConfirm={() => {
          if (!detailsQuery.data) return;
          setConfirmIssueOpen(false);
          issueMutation.mutate({
            id: detailsQuery.data.id,
            remarks: workbench.issueRemarks || undefined,
            allocations: workbench.buildAllocationsPayload(),
          });
        }}
      />
      <ConfirmDialog
        open={confirmRejectOpen}
        title="Confirm reject request"
        description="Reject this material request? Please provide reason if needed."
        confirmText="Reject"
        destructive
        onCancel={() => {
          setConfirmRejectOpen(false);
          setRejectReason("");
        }}
        onConfirm={() => {
          if (!detailsQuery.data) return;
          setConfirmRejectOpen(false);
          rejectMutation.mutate({ id: detailsQuery.data.id, reason: rejectReason.trim() || undefined });
          setRejectReason("");
        }}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="store-reject-reason">
            Reject reason (optional)
          </label>
          <Textarea
            id="store-reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection"
            className="min-h-[88px]"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
