import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { MaterialRequest, MaterialRequestCatalogItem, MaterialRequestDetail, MaterialRequestIssueOptionsResponse } from "@traceability/sdk";
import { useAuth } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { MaterialRequestVoucherView } from "../../components/material/MaterialRequestVoucherView";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { formatDate, formatDateTime } from "../../lib/datetime";
import { useMaterialRequestsRealtime } from "../../hooks/useMaterialRequestsRealtime";
import { useDelayedBusy } from "../../hooks/useDelayedBusy";
import { useIssueAllocationWorkbench } from "../../hooks/useIssueAllocationWorkbench";
import { IssueAllocationWorkbench } from "../../components/material/IssueAllocationWorkbench";
import { toast } from "sonner";
import { PageLayout, Section } from "@traceability/ui";
import {
  Button,
  Input,
  Select,
  Option,
  TextArea,
  Label,
  Title,
  FlexBox,
  FlexBoxAlignItems,
  FlexBoxJustifyContent,
  Table,
  TableRow,
  TableCell,
  TableHeaderRow,
  TableHeaderCell,
  MessageBox,
  BusyIndicator,
  Dialog,
  Bar
} from "@ui5/webcomponents-react";

import "@ui5/webcomponents-icons/dist/history.js";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/navigation-left-arrow.js";
import "@ui5/webcomponents-icons/dist/print.js";
import "@ui5/webcomponents-icons/dist/accept.js";
import "@ui5/webcomponents-icons/dist/decline.js";
import "@ui5/webcomponents-icons/dist/paper-plane.js";
import "@ui5/webcomponents-icons/dist/request.js";


import {
  approveMaterialRequest,
  createMaterialRequest,
  getMaterialIssueOptions,
  getMaterialRequestById,
  getMaterialRequestCatalog,
  getMaterialRequestNextNumbers,
  getMaterialRequests,
  issueMaterialRequestWithAllocation,
  rejectMaterialRequest,
} from "../../lib/material-api";

// ... existing types ...

type LineForm = {
  item_no: number;
  model_id: string;
  part_number: string;
  description: string;
  requested_qty?: number;
  uom: string;
  remarks: string;
};

function blankLine(itemNo: number): LineForm {
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

export default function MaterialRequestsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [costCenter, setCostCenter] = useState("");
  const [headerRemarks, setHeaderRemarks] = useState("");
  const [lines, setLines] = useState<LineForm[]>([blankLine(1)]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const requestsQuery = useQuery({
    queryKey: ["admin-material-requests"],
    queryFn: () => getMaterialRequests(),
  });

  const detailsQuery = useQuery<MaterialRequestDetail>({
    queryKey: ["admin-material-request", selectedId],
    queryFn: () => getMaterialRequestById(selectedId!),
    enabled: Boolean(selectedId),
  });
  const issueOptionsQuery = useQuery<MaterialRequestIssueOptionsResponse>({
    queryKey: ["admin-material-request-issue-options", selectedId],
    queryFn: () => getMaterialIssueOptions(selectedId!),
    enabled:
      Boolean(selectedId) &&
      openDetails &&
      (detailsQuery.data?.status === "REQUESTED" || detailsQuery.data?.status === "APPROVED"),
  });
  const workbench = useIssueAllocationWorkbench(issueOptionsQuery.data);

  const catalogQuery = useQuery({
    queryKey: ["material-request-catalog-admin"],
    queryFn: getMaterialRequestCatalog,
  });

  const nextNumbersQuery = useQuery({
    queryKey: ["material-request-next-numbers-admin"],
    queryFn: getMaterialRequestNextNumbers,
    refetchOnWindowFocus: true,
  });

  const realtimeQueryKeys = useMemo(
    () => [
      ["admin-material-requests"],
      ["admin-material-request"],
      ["material-request-next-numbers-admin"],
    ],
    []
  );

  useMaterialRequestsRealtime({
    enabled: true,
    queryKeys: realtimeQueryKeys,
  });
  
  useEffect(() => {
    if (!openDetails) {
      workbench.reset();
      return;
    }
  }, [openDetails, workbench.reset]);

  const modelOptions = useMemo(() => {
    const map = new Map<string, { model_id: string; model_code: string; model_name: string }>();
    for (const row of catalogQuery.data ?? []) {
      if (!map.has(row.model_id)) {
        map.set(row.model_id, {
          model_id: row.model_id,
          model_code: row.model_code,
          model_name: row.model_name,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.model_code.localeCompare(b.model_code));
  }, [catalogQuery.data]);

  const componentOptionsByModel = useMemo(() => {
    const mapByModel = new Map<string, Map<string, MaterialRequestCatalogItem>>();
    for (const row of catalogQuery.data ?? []) {
      const modelId = row.model_id;
      if (!mapByModel.has(modelId)) mapByModel.set(modelId, new Map<string, MaterialRequestCatalogItem>());
      const map = mapByModel.get(modelId)!;
      const key = String(row.part_number).toUpperCase();
      if (!key) continue;
      if (!map.has(key)) map.set(key, row);
    }
    const result = new Map<string, MaterialRequestCatalogItem[]>();
    for (const [modelId, itemMap] of mapByModel.entries()) result.set(modelId, Array.from(itemMap.values()));
    return result;
  }, [catalogQuery.data]);

  const catalogByModelPart = useMemo(() => {
    const map = new Map<string, MaterialRequestCatalogItem>();
    for (const row of catalogQuery.data ?? []) {
      const key = `${row.model_id}|${String(row.part_number).toUpperCase()}`;
      if (!map.has(key)) map.set(key, row);
    }
    return map;
  }, [catalogQuery.data]);

  const sectionAuto = `${user?.display_name ?? "-"}${user?.department ? ` / ${user.department}` : ""}`;
  const hasInvalidRequestedQty = lines
    .filter((line) => line.part_number.trim().length > 0)
    .some((line) => !Number.isFinite(Number(line.requested_qty)) || Number(line.requested_qty) <= 0);

  const createMutation = useMutation({
    mutationFn: () => {
      const requestedLines = lines.filter((line) => line.part_number.trim().length > 0);
      if (!requestedLines.length) {
        throw new Error("At least one component line is required");
      }
      const modelIds = Array.from(new Set(requestedLines.map((line) => line.model_id).filter(Boolean)));
      if (modelIds.length !== 1) {
        throw new Error("Each voucher must use one model only");
      }
      const invalidQtyLine = requestedLines.find(
        (line) => !Number.isFinite(Number(line.requested_qty)) || Number(line.requested_qty) <= 0
      );
      if (invalidQtyLine) {
        throw new Error(`Requested quantity must be greater than 0 for part ${invalidQtyLine.part_number}`);
      }
      return createMaterialRequest({
        request_no: nextNumbersQuery.data?.request_no,
        dmi_no: nextNumbersQuery.data?.dmi_no,
        request_date: nextNumbersQuery.data?.request_date,
        model_id: modelIds[0],
        section: sectionAuto,
        cost_center: costCenter || undefined,
        remarks: headerRemarks || undefined,
        items: requestedLines
          .map((line, idx) => ({
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
      setLines([blankLine(1)]);
      setCostCenter("");
      setHeaderRemarks("");
      const recipientText =
        (created.alert_recipients ?? []).length > 0
          ? (created.alert_recipients ?? [])
              .map((row) => row.display_name || row.email || "-")
              .join(", ")
          : "workflow approver group";
      toast.success(`Request submitted: ${created.request_no}${created.dmi_no ? ` (${created.dmi_no})` : ""}`, {
        description:
          created.alert_status === "QUEUED_MOCK"
            ? `Email alert queued (mock) to: ${recipientText}`
            : `Email alert prepared to: ${recipientText}`,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-material-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["material-request-next-numbers-admin"] });
      setCreateDialogOpen(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveMaterialRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-material-requests"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectMaterialRequest(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-material-requests"] }),
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
      await queryClient.invalidateQueries({ queryKey: ["admin-material-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-material-request"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-material-request-issue-options"] });
    },
  });

  const updateLine = (index: number, patch: Partial<LineForm>) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const onModelChange = (index: number, modelId: string) => {
    updateLine(index, {
      model_id: modelId,
      part_number: "",
      description: "",
      uom: "PCS",
    });
  };

  const onPartNumberChange = (index: number, partNo: string) => {
    const key = partNo.toUpperCase();
    const modelId = lines[index]?.model_id || "";
    const model = catalogByModelPart.get(`${modelId}|${key}`);
    updateLine(index, {
      part_number: key,
      description:
        [
          model?.component_name || model?.model_name || "",
          model?.rm_location ? `Loc ${model.rm_location}` : "",
          model?.qty_per_assy ? `Use ${model.qty_per_assy}/VCM` : "",
        ]
          .filter(Boolean)
          .join(" | ") || "",
      uom: model?.uom_default ?? "PCS",
    });
  };

  const columns = useMemo<ColumnDef<MaterialRequest>[]>(
    () => [
      { header: "Request No.", accessorKey: "request_no", size: 160 },
      { header: "Model", accessorKey: "model_code", cell: ({ row }) => row.original.model_code || "-", size: 140 },
      { header: "DMI No.", accessorKey: "dmi_no", cell: ({ row }) => row.original.dmi_no || "-", size: 160 },
      {
        header: "Date",
        accessorKey: "created_at",
        cell: ({ row }) => formatDateTime((row.original.created_at ?? row.original.request_date) as any),
        size: 160,
      },
      { header: "Section", accessorKey: "section", cell: ({ row }) => row.original.section || "-", size: 140 },
      { header: "Cost Center", accessorKey: "cost_center", cell: ({ row }) => row.original.cost_center || "-", size: 100 },
      { header: "Process", accessorKey: "process_name", cell: ({ row }) => row.original.process_name || "-", size: 100 },
      { header: "Items", accessorKey: "item_count", cell: ({ row }) => row.original.item_count ?? "-", size: 80 },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} />, size: 110 },
      {
        header: "Actions",
        size: 100,
        cell: ({ row }) => (
          <Button
            icon="display"
            design="Transparent"
            onClick={() => {
              setSelectedId(row.original.id);
              setOpenDetails(true);
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [detailsQuery.data?.id, detailsQuery.data?.status, openDetails]
  );

  const anyError =
    requestsQuery.error ??
    catalogQuery.error ??
    nextNumbersQuery.error ??
    createMutation.error ??
    approveMutation.error ??
    rejectMutation.error ??
    issueMutation.error ??
    detailsQuery.error ??
    issueOptionsQuery.error;
    
  const showDetailsLoading = useDelayedBusy(Boolean(selectedId) && detailsQuery.isLoading, 200);

  // Removed TabKey effect


  return (
    <PageLayout
      title="Material Requests"
      subtitle="Production submits direct material requests; Store approves and issues by DMI/DO."
      icon="request"
      iconColor="var(--icon-indigo)"
    >
      <Section variant="card">
         <ApiErrorBanner message={anyError ? formatApiError(anyError) : undefined} />
         
         {openDetails ? (
            <div className="motion-safe:animate-panel-slide-in-left">
                 <div style={{ padding: "1rem" }}>
                     <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} alignItems={FlexBoxAlignItems.Center} style={{ marginBottom: "1rem" }}>
                         <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                             <Button icon="navigation-left-arrow" design="Transparent" onClick={() => { setOpenDetails(false); setSelectedId(null); }}>Back</Button>
                             <Title level="H4">Material Request Detail {detailsQuery.data?.request_no ? `- ${detailsQuery.data.request_no}` : ""}</Title>
                         </FlexBox>
                         <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                             <StatusBadge status={detailsQuery.data?.status ?? "REQUESTED"} />
                             {detailsQuery.data?.status === "ISSUED" && <Button icon="print" design="Transparent" onClick={() => window.print()}>Print</Button>}
                         </FlexBox>
                     </FlexBox>

                     {showDetailsLoading ? (
                         <BusyIndicator active text="Loading details..." />
                     ) : detailsQuery.data ? (
                         <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                             <MaterialRequestVoucherView detail={detailsQuery.data} />
                             
                             {(detailsQuery.data.status === "REQUESTED" || detailsQuery.data.status === "APPROVED") && (
                                  <IssueAllocationWorkbench
                                    issueOptions={issueOptionsQuery.data}
                                    isLoading={issueOptionsQuery.isLoading}
                                    issueRemarks={workbench.issueRemarks}
                                    onIssueRemarksChange={workbench.setIssueRemarks}
                                    manualAllocations={workbench.manualAllocations}
                                    setManualAllocations={workbench.setManualAllocations}
                                    allocationTotalsByItem={workbench.allocationTotalsByItem}
                                    addAllocationLine={workbench.addAllocationLine}
                                    issueValidationError={workbench.issueValidationError}
                                  />
                             )}

                             {(detailsQuery.data.status === "REQUESTED" || detailsQuery.data.status === "APPROVED") && (
                                 <FlexBox justifyContent={FlexBoxJustifyContent.End} style={{ gap: "0.5rem", padding: "1rem", background: "var(--sapObjectHeader_Background)" }}>
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
                                 </FlexBox>
                             )}
                         </div>
                     ) : (
                         <Label>No details loaded.</Label>
                     )}
                 </div>
            </div>
        ) : (
            <DataTable 
                data={requestsQuery.data ?? []} 
                columns={columns} 
                loading={requestsQuery.isLoading}
                filterPlaceholder="Search request no., section, cost center..." 
                actions={
                    <Button
                        icon="add"
                        design="Emphasized"
                        onClick={() => {
                            setLines([blankLine(1)]);
                            setCostCenter("");
                            setHeaderRemarks("");
                            setCreateDialogOpen(true);
                        }}
                    >
                        New Request
                    </Button>
                }
            />
        )}
      </Section>

      {/* Create Request Dialog */}
      <Dialog
        open={createDialogOpen}
        headerText="New Material Request"
        stretch
        footer={
            <Bar
                endContent={
                    <>
                        <Button onClick={() => setCreateDialogOpen(false)} design="Transparent">Cancel</Button>
                        <Button 
                            design="Emphasized" 
                            onClick={() => setConfirmSubmitOpen(true)}
                            disabled={createMutation.isPending || lines.every((line) => !line.part_number) || hasInvalidRequestedQty}
                        >
                            {createMutation.isPending ? "Submitting..." : "Submit Request"}
                        </Button>
                    </>
                }
            />
        }
      >
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}>
             {/* Header Info - Simplified for Dialog */}
             <div style={{ padding: "0.75rem 1rem", background: "var(--sapObjectHeader_Background)", border: "1px solid var(--sapList_BorderColor)", borderRadius: "var(--sapElement_BorderCornerRadius)" }}>
                 <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} wrap="Wrap" style={{ gap: "1rem" }}>
                     <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                         <Label style={{ fontWeight: "bold" }}>NO.:</Label>
                         <Label style={{ color: "var(--sapNegativeColor)" }}>
                            {nextNumbersQuery.data?.request_no ?? "-"}
                         </Label>
                     </FlexBox>
                     <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                         <Label style={{ fontWeight: "bold" }}>DMI. NO.:</Label>
                         <Label style={{ color: "var(--sapNegativeColor)" }}>
                            {nextNumbersQuery.data?.dmi_no ?? "-"}
                         </Label>
                     </FlexBox>
                     <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                         <Label style={{ fontWeight: "bold" }}>DATE:</Label>
                         <Label>
                            {formatDate(nextNumbersQuery.data?.generated_at ?? new Date().toISOString())}
                         </Label>
                     </FlexBox>
                     <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                         <Label style={{ fontWeight: "bold" }}>SECTION:</Label>
                         <Label>
                            {sectionAuto || "-"}
                         </Label>
                     </FlexBox>
                     <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem", flexGrow: 1, minWidth: "200px" }}>
                         <Label style={{ fontWeight: "bold" }}>COST CENTER:</Label>
                         <Input 
                            value={costCenter}
                            onInput={(e) => setCostCenter(e.target.value)}
                            style={{ flex: 1 }}
                         />
                     </FlexBox>
                 </FlexBox>
             </div>

             {/* Items Table - Using UI5 Table */}
             <div style={{ flex: 1, overflow: "auto" }}>
                 <Table
                    headerRow={
                        <TableHeaderRow>
                            <TableHeaderCell minWidth="3rem"><Label>Item</Label></TableHeaderCell>
                            <TableHeaderCell minWidth="12rem"><Label>Model</Label></TableHeaderCell>
                            <TableHeaderCell minWidth="14rem"><Label>Part No.</Label></TableHeaderCell>
                            <TableHeaderCell minWidth="12rem"><Label>Description</Label></TableHeaderCell>
                            <TableHeaderCell minWidth="6rem"><Label>Qty</Label></TableHeaderCell>
                            <TableHeaderCell minWidth="4rem"><Label>UOM</Label></TableHeaderCell>
                            <TableHeaderCell minWidth="8rem"><Label>Remarks</Label></TableHeaderCell>
                        </TableHeaderRow>
                    }
                 >
                     {lines.map((line, idx) => (
                         <TableRow key={idx}>
                             <TableCell><Label>{idx + 1}</Label></TableCell>
                             <TableCell>
                                 <Select 
                                    onChange={(e) => {
                                        const selected = e.detail.selectedOption as unknown as { value: string };
                                        onModelChange(idx, selected.value);
                                    }}
                                    value={line.model_id}
                                    style={{ width: "100%" }}
                                 >
                                     <Option value="">Select Model</Option>
                                     {modelOptions.map((model) => (
                                         <Option key={model.model_id} value={model.model_id}>{model.model_code}</Option>
                                     ))}
                                 </Select>
                             </TableCell>
                             <TableCell>
                                 <Select 
                                     onChange={(e) => {
                                        const selected = e.detail.selectedOption as unknown as { value: string };
                                        onPartNumberChange(idx, selected.value);
                                    }}
                                    value={line.part_number}
                                    disabled={!line.model_id}
                                    style={{ width: "100%" }}
                                 >
                                     <Option value="">{line.model_id ? "Select Component" : "Select model"}</Option>
                                     {(componentOptionsByModel.get(line.model_id) ?? []).map((item) => (
                                         <Option key={`${item.model_id}-${item.part_number}`} value={item.part_number}>
                                             {item.part_number} {item.component_name ? `- ${item.component_name}` : ""}
                                         </Option>
                                     ))}
                                 </Select>
                             </TableCell>
                             <TableCell>
                                 <Label wrappingType="Normal">{line.description || "-"}</Label>
                             </TableCell>
                             <TableCell>
                                 <Input 
                                    type="Number"
                                    value={line.requested_qty?.toString() ?? ""}
                                    onInput={(e) => updateLine(idx, { requested_qty: e.target.value ? Number(e.target.value) : undefined })}
                                    style={{ width: "100%", textAlign: "right" }}
                                 />
                             </TableCell>
                             <TableCell>
                                 <Label>{line.uom || "PCS"}</Label>
                             </TableCell>
                             <TableCell>
                                 <Input 
                                    value={line.remarks}
                                    onInput={(e) => updateLine(idx, { remarks: e.target.value })}
                                    style={{ width: "100%" }}
                                 />
                             </TableCell>
                         </TableRow>
                     ))}
                 </Table>
             </div>

             <FlexBox style={{ gap: "0.5rem" }}>
                 <Button icon="add" onClick={() => setLines((prev) => [...prev, blankLine(prev.length + 1)])}>Add Item</Button>
                 <Button icon="delete" design="Transparent" onClick={() => setLines((prev) => (prev.length <= 1 ? prev : prev.slice(0, -1)))}>Remove Last</Button>
             </FlexBox>
        </div>
      </Dialog>
      
      {/* Confirm Dialogs */}
      <MessageBox
        open={confirmSubmitOpen}
        type="Confirm"
        titleText="Confirm submit request"
        onClose={(action: string | undefined) => {
            if (action === "OK") {
                createMutation.mutate();
            }
            setConfirmSubmitOpen(false);
        }}
      >
          Submit this material request now?
      </MessageBox>

      <MessageBox
           open={confirmIssueOpen}
           type="Confirm"
           titleText={detailsQuery.data?.status === "REQUESTED" ? "Confirm approve + issue" : "Confirm issue material"}
           onClose={(action: string | undefined) => {
               if (action === "OK") {
                   if (detailsQuery.data) {
                       issueMutation.mutate({
                         id: detailsQuery.data.id,
                         remarks: workbench.issueRemarks || undefined,
                         allocations: workbench.buildAllocationsPayload(),
                       });
                   }
               }
               setConfirmIssueOpen(false);
           }}
      >
           {detailsQuery.data?.status === "REQUESTED" ? "Approve and issue this request now?" : "Issue this approved request now?"}
      </MessageBox>

      <Dialog
          open={confirmRejectOpen}
          headerText="Confirm reject request"
          footer={
              <Bar
                  endContent={
                      <>
                          <Button onClick={() => setConfirmRejectOpen(false)} design="Transparent">Cancel</Button>
                          <Button 
                              design="Negative" 
                              onClick={() => {
                                  if (!detailsQuery.data) return;
                                  setConfirmRejectOpen(false);
                                  rejectMutation.mutate({ id: detailsQuery.data.id, reason: rejectReason.trim() || undefined });
                                  setRejectReason("");
                              }}
                          >
                              Reject
                          </Button>
                      </>
                  }
              />
          }
      >
           <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: "300px", padding: "1rem" }}>
                <Label>Reject reason (optional)</Label>
                <TextArea
                    value={rejectReason}
                    onInput={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Enter reason for rejection"
                />
           </div>
      </Dialog>
    </PageLayout>
  );
}
