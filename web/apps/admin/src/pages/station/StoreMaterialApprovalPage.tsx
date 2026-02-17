import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { MaterialRequest, MaterialRequestDetail, MaterialRequestIssueOptionsResponse } from "@traceability/sdk";
import { useAuth } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { MaterialRequestVoucherView } from "../../components/material/MaterialRequestVoucherView";
import { useMaterialRequestsRealtime } from "../../hooks/useMaterialRequestsRealtime";
import { useDelayedBusy } from "../../hooks/useDelayedBusy";
import { useIssueAllocationWorkbench } from "../../hooks/useIssueAllocationWorkbench";
import { IssueAllocationWorkbench } from "../../components/material/IssueAllocationWorkbench";
import { FormDialog } from "../../components/shared/FormDialog";
import {
  approveMaterialRequest,
  getMaterialIssueOptions,
  getMaterialRequestById,
  getMaterialRequests,
  getPendingMaterialRequests,
  issueMaterialRequestWithAllocation,
  rejectMaterialRequest,
} from "../../lib/material-api";

import { 
    Page, 
    Bar, 
    Title, 
    TabContainer, 
    Tab, 
    TabSeparator,
    Button,
    Card,
    CardHeader,
    MessageStrip,
    TextArea,
    Label,
    BusyIndicator,
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/form.js";
import "@ui5/webcomponents-icons/dist/history.js";
import "@ui5/webcomponents-icons/dist/nav-back.js";
import "@ui5/webcomponents-icons/dist/print.js";

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

  useMaterialRequestsRealtime({
    enabled: canUsePage,
    queryKeys: [
      ["station-store-material-pending"],
      ["station-store-material-history"],
    ],
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
      setConfirmIssueOpen(false);
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
            design="Transparent"
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
    []
  );

  const showDetailsLoading = useDelayedBusy(Boolean(selectedId) && detailsQuery.isLoading, 200);
  const showIssueOptionsLoading = useDelayedBusy(Boolean(selectedId) && issueOptionsQuery.isLoading, 250);

  if (!canUsePage) {
    return <MessageStrip design="Negative">Role Access Denied. Requires STORE or SUPERVISOR role.</MessageStrip>;
  }

  if (detailsOpen && selectedId) {
      return (
          <Page
            header={
                <Bar 
                    startContent={
                        <Button design="Transparent" icon="nav-back" onClick={() => { setDetailsOpen(false); setSelectedId(null); }}>Back</Button>
                    }
                    endContent={
                        detailsQuery.data?.status === "ISSUED" ? (
                            <Button design="Transparent" icon="print" onClick={() => window.print()}>Print</Button>
                        ) : null
                    }
                >
                    <Title level="H3">Request Detail</Title>
                </Bar>
            }
            backgroundDesign="Solid"
            style={{ height: "100%" }}
          >
              <div style={{ padding: "1rem", maxWidth: "1200px", margin: "0 auto" }}>
                  {showDetailsLoading ? <BusyIndicator active /> : detailsQuery.data ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                          <MaterialRequestVoucherView detail={detailsQuery.data} />
                          
                          {(detailsQuery.data.status === "REQUESTED" || detailsQuery.data.status === "APPROVED") && (
                              <Card header={<CardHeader titleText="Issue & Allocation" />}>
                                  <div style={{ padding: "1rem" }}>
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
                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                                        {detailsQuery.data.status === "REQUESTED" && (
                                            <Button 
                                                design="Negative" 
                                                onClick={() => { setRejectReason(""); setConfirmRejectOpen(true); }}
                                                disabled={approveMutation.isPending || rejectMutation.isPending}
                                            >
                                                Reject
                                            </Button>
                                        )}
                                        <Button 
                                            design="Emphasized"
                                            onClick={() => { if (!workbench.issueValidationError) setConfirmIssueOpen(true); }}
                                            disabled={Boolean(workbench.issueValidationError || issueOptionsQuery.isLoading || issueMutation.isPending)}
                                        >
                                            {detailsQuery.data.status === "REQUESTED" ? "Approve + Issue" : "Issue Material"}
                                        </Button>
                                    </div>
                                  </div>
                              </Card>
                          )}
                      </div>
                  ) : <div>No details found</div>}
              </div>

              <FormDialog
                open={confirmIssueOpen}
                title="Confirm Issue"
                description={`Are you sure you want to issue ${workbench.manualAllocations.length} allocation lines?`}
                onClose={() => setConfirmIssueOpen(false)}
                onSubmit={() => {
                    if (!detailsQuery.data) return;
                    issueMutation.mutate({
                        id: detailsQuery.data.id,
                        remarks: workbench.issueRemarks || undefined,
                        allocations: workbench.buildAllocationsPayload(),
                    });
                }}
                submitting={issueMutation.isPending}
              >
                  <p>Confirmation required to process stock deduction.</p>
              </FormDialog>

              <FormDialog
                open={confirmRejectOpen}
                title="Confirm Reject"
                description="Reject this material request?"
                onClose={() => setConfirmRejectOpen(false)}
                onSubmit={() => {
                    if (!detailsQuery.data) return;
                    setConfirmRejectOpen(false);
                    rejectMutation.mutate({ id: detailsQuery.data.id, reason: rejectReason });
                }}
                submitting={rejectMutation.isPending}
                submitText="Reject Request"
              >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <Label>Reason for rejection:</Label>
                      <TextArea value={rejectReason} onInput={(e) => setRejectReason(e.target.value)} />
                  </div>
              </FormDialog>
          </Page>
      );
  }

  return (
    <Page
      header={<Bar startContent={<Title level="H2">Store Material Approval</Title>} />}
      backgroundDesign="List"
      style={{ height: "100%" }}
    >
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <TabContainer tabLayout="Standard" collapsed onTabSelect={(e) => setTab(e.detail.tab.getAttribute("data-key") as TabKey)}>
                <Tab text="Waiting Approval" icon="clipboard" selected={tab === "PENDING"} data-key="PENDING" />
                <TabSeparator />
                <Tab text="History" icon="history" selected={tab === "HISTORY"} data-key="HISTORY" />
            </TabContainer>
            
            <div style={{ padding: "1rem", flex: 1, overflow: "auto" }}>
                {tab === "PENDING" ? (
                    <DataTable
                        data={pendingQuery.data ?? []}
                        columns={columns}
                        filterPlaceholder="Search waiting requests..."
                    />
                ) : (
                    <DataTable
                        data={historyQuery.data ?? []}
                        columns={columns}
                        filterPlaceholder="Search history..."
                    />
                )}
            </div>
        </div>
    </Page>
  );
}
