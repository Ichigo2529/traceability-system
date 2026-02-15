import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { MaterialRequest, MaterialRequestCatalogItem, MaterialRequestDetail, MaterialRequestIssueOptionsResponse } from "@traceability/sdk";
import { ClipboardPen, History } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { DataTable } from "../../components/shared/DataTable";
import { FormDialog } from "../../components/shared/FormDialog";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { MaterialRequestVoucherView } from "../../components/material/MaterialRequestVoucherView";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { formatApiError } from "../../lib/errors";
import { formatDate, formatDateTime } from "../../lib/datetime";
import { useMaterialRequestsRealtime } from "../../hooks/useMaterialRequestsRealtime";
import { useDelayedBusy } from "../../hooks/useDelayedBusy";
import { LoadingSkeleton } from "../../components/shared/States";
import { UnderlineTabs } from "../../components/shared/UnderlineTabs";
import { useIssueAllocationWorkbench } from "../../hooks/useIssueAllocationWorkbench";
import { IssueAllocationWorkbench } from "../../components/material/IssueAllocationWorkbench";
import { toast } from "sonner";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
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

type LineForm = {
  item_no: number;
  model_id: string;
  part_number: string;
  description: string;
  requested_qty?: number;
  uom: string;
  remarks: string;
};

type TabKey = "FORM" | "HISTORY";
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

export function MaterialRequestsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [costCenter, setCostCenter] = useState("");
  const [headerRemarks, setHeaderRemarks] = useState("");
  const [lines, setLines] = useState<LineForm[]>([blankLine(1)]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [tab, setTab] = useState<TabKey>("FORM");
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
      { header: "Request No.", accessorKey: "request_no" },
      { header: "Model", accessorKey: "model_code", cell: ({ row }) => row.original.model_code || "-" },
      { header: "DMI No.", accessorKey: "dmi_no", cell: ({ row }) => row.original.dmi_no || "-" },
      {
        header: "Date",
        accessorKey: "created_at",
        cell: ({ row }) => formatDateTime((row.original.created_at ?? row.original.request_date) as any),
      },
      { header: "Section", accessorKey: "section", cell: ({ row }) => row.original.section || "-" },
      { header: "Cost Center", accessorKey: "cost_center", cell: ({ row }) => row.original.cost_center || "-" },
      { header: "Process", accessorKey: "process_name", cell: ({ row }) => row.original.process_name || "-" },
      { header: "Items", accessorKey: "item_count", cell: ({ row }) => row.original.item_count ?? "-" },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        header: "Actions",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
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
    []
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
  const showRequestTableLoading = useDelayedBusy(
    requestsQuery.isLoading || (requestsQuery.isFetching && !requestsQuery.data),
    250
  );
  const showFormLoading = useDelayedBusy(
    catalogQuery.isLoading || nextNumbersQuery.isLoading || (catalogQuery.isFetching && !catalogQuery.data),
    250
  );
  const showDetailsLoading = useDelayedBusy(Boolean(selectedId) && detailsQuery.isLoading, 200);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Material Requests"
        description="Production submits direct material requests; Store approves and issues by DMI/DO."
      />
      <ApiErrorBanner message={anyError ? formatApiError(anyError) : undefined} />
      <UnderlineTabs
        value={tab}
        onChange={setTab}
        items={[
          { key: "FORM", label: "Request Form", icon: ClipboardPen },
          { key: "HISTORY", label: "History", icon: History },
        ]}
      />
      {showFormLoading ? <LoadingSkeleton label="Loading form data..." /> : null}

      {tab === "FORM" ? (
        <Card className="ml-0 mr-auto w-full max-w-[1120px] rounded-md border-slate-300 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="rounded-sm border border-slate-300 p-3">
              <div className="mb-3">
                <div className="flex items-start gap-3">
                  <img src="/logo.png" alt="MMI Logo" className="h-14 w-auto object-contain" />
                  <div className="text-sm leading-5">
                    <p className="text-2xl font-semibold italic tracking-wide text-slate-700">MMI Precision Assembly (Thailand) Co., Ltd.</p>
                    <p>888 Moo 1, Mittraphap Road, Tambon Naklang, Amphur Sungnoen, Nakornratchasima 30380 Thailand</p>
                    <p>TEL : (6644) 000188 &nbsp;&nbsp; FAX : (6644) 000199</p>
                  </div>
                </div>
              </div>

              <p className="mb-3 text-2xl font-semibold tracking-tight text-slate-800">DIRECT MATERIAL ISSUE VOUCHER</p>

              <div className="mb-3 rounded-sm border border-slate-300 bg-slate-50 px-4 py-3">
                <div className="grid grid-cols-[1fr_1fr_0.8fr] items-end gap-6 text-[15px] font-semibold text-slate-800">
                  <div className="grid grid-cols-[auto_1fr] items-end gap-2">
                    <span className="whitespace-nowrap">NO.:</span>
                    <span className="w-full border-b border-slate-300 px-1 pb-1 text-[#d92d20]">
                      {nextNumbersQuery.data?.request_no ?? "-"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[auto_1fr] items-end gap-2">
                    <span className="whitespace-nowrap">DMI. NO.:</span>
                    <span className="w-full border-b border-slate-300 px-1 pb-1 text-[#d92d20]">
                      {nextNumbersQuery.data?.dmi_no ?? "-"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[auto_1fr] items-end gap-2">
                    <span className="whitespace-nowrap">DATE:</span>
                    <span className="w-full border-b border-slate-300 px-1 pb-1">
                      {formatDate(nextNumbersQuery.data?.generated_at ?? new Date().toISOString())}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4 rounded-sm border border-slate-300 bg-slate-50 px-4 py-3">
                <div className="grid grid-cols-[1.2fr_1fr] items-end gap-6 text-[15px] font-semibold text-slate-800">
                  <div className="grid grid-cols-[auto_1fr] items-end gap-2">
                    <span className="whitespace-nowrap">SECTION:</span>
                    <span className="w-full border-b border-slate-300 px-1 pb-1">{sectionAuto || "-"}</span>
                  </div>
                  <div className="grid grid-cols-[auto_1fr] items-end gap-2">
                    <span className="whitespace-nowrap">COST CENTER:</span>
                    <Input
                      value={costCenter}
                      onChange={(e) => setCostCenter(e.target.value)}
                      className="h-10 w-full rounded-none border-0 border-b border-slate-300 bg-transparent px-1 pb-1 text-[15px] font-semibold shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col className="w-[56px]" />
                    <col className="w-[190px]" />
                    <col className="w-[220px]" />
                    <col className="w-[220px]" />
                    <col className="w-[110px]" />
                    <col className="w-[76px]" />
                    <col />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-100 text-[13px] text-slate-700">
                      <th className="border border-slate-300 px-2 py-2 text-center">ITEM</th>
                      <th className="border border-slate-300 px-2 py-2 text-center">MODEL</th>
                      <th className="border border-slate-300 px-2 py-2 text-center">COMPONENT PART NO.</th>
                      <th className="border border-slate-300 px-2 py-2 text-center">DESCRIPTION</th>
                      <th className="border border-slate-300 px-2 py-2 text-center">QTY</th>
                      <th className="border border-slate-300 px-2 py-2 text-center">UOM</th>
                      <th className="border border-slate-300 px-2 py-2 text-center">REMARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 px-2 py-1 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 px-2 py-1">
                          <select
                            className="h-8 w-full rounded-none border border-slate-300 bg-white px-2 text-sm"
                            value={line.model_id}
                            onChange={(e) => onModelChange(idx, e.target.value)}
                          >
                            <option value="">Select Model</option>
                            {modelOptions.map((model) => (
                              <option key={model.model_id} value={model.model_id}>
                                {model.model_code}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-slate-300 px-2 py-1">
                          <select
                            className="h-8 w-full rounded-none border border-slate-300 bg-white px-2 text-sm"
                            value={line.part_number}
                            disabled={!line.model_id}
                            onChange={(e) => onPartNumberChange(idx, e.target.value)}
                          >
                            <option value="">{line.model_id ? "Select Component Part Number" : "Select model first"}</option>
                            {(componentOptionsByModel.get(line.model_id) ?? []).map((item) => (
                              <option key={`${item.model_id}-${item.part_number}`} value={item.part_number}>
                                {item.part_number} {item.component_name ? `- ${item.component_name}` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-slate-300 px-2 py-1">
                          <p className="h-8 border-b border-dotted border-slate-500/70 px-1 py-1.5 text-sm text-slate-700">{line.description || "-"}</p>
                        </td>
                        <td className="border border-slate-300 px-2 py-1">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={line.requested_qty ?? ""}
                            onChange={(e) => updateLine(idx, { requested_qty: e.target.value ? Number(e.target.value) : undefined })}
                            className="h-8 rounded-none border border-slate-300 text-right text-sm"
                          />
                        </td>
                        <td className="border border-slate-300 px-2 py-1">
                          <p className="h-8 border-b border-dotted border-slate-500/70 px-1 py-1.5 text-center text-sm font-medium text-slate-700">{line.uom || "PCS"}</p>
                        </td>
                        <td className="border border-slate-300 px-2 py-1">
                          <Input
                            value={line.remarks}
                            onChange={(e) => updateLine(idx, { remarks: e.target.value })}
                            className="h-8 rounded-none border border-slate-300 text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setLines((prev) => [...prev, blankLine(prev.length + 1)])}
                >
                  + Add Item
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setLines((prev) => (prev.length <= 1 ? prev : prev.slice(0, -1)))}
                >
                  Remove Last
                </Button>
              </div>

              <div className="mt-4 overflow-hidden rounded-sm border border-slate-300 md:grid md:grid-cols-2">
                <div className="border-b border-slate-300 md:border-b-0 md:border-r">
                  <div className="bg-slate-100 px-3 py-2 text-xs font-semibold tracking-wide text-slate-700">ISSUED BY</div>
                  <div className="grid grid-cols-[56px_1fr] items-end gap-x-2 gap-y-3 px-3 py-3 text-sm">
                    <p className="text-slate-600">NAME :</p>
                    <p className="border-b border-dotted border-slate-400 pb-1">&nbsp;</p>
                    <p className="text-slate-600">DATE :</p>
                    <p className="border-b border-dotted border-slate-400 pb-1">&nbsp;</p>
                  </div>
                </div>
                <div>
                  <div className="bg-slate-100 px-3 py-2 text-xs font-semibold tracking-wide text-slate-700">RECEIVED BY</div>
                  <div className="grid grid-cols-[56px_1fr] items-end gap-x-2 gap-y-3 px-3 py-3 text-sm">
                    <p className="text-slate-600">NAME :</p>
                    <p className="border-b border-dotted border-slate-400 pb-1">&nbsp;</p>
                    <p className="text-slate-600">DATE :</p>
                    <p className="border-b border-dotted border-slate-400 pb-1">&nbsp;</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-500">White - STORE &nbsp; Blue - MATERIALS &nbsp; Pink - RECEIVER</p>
                <Button
                  size="sm"
                  onClick={() => {
                    setConfirmSubmitOpen(true);
                  }}
                  disabled={createMutation.isPending || lines.every((line) => !line.part_number) || hasInvalidRequestedQty}
                >
                  {createMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "HISTORY"
        ? showRequestTableLoading
          ? <LoadingSkeleton label="Loading material requests..." />
          : <DataTable data={requestsQuery.data ?? []} columns={columns} filterPlaceholder="Search request no., section, cost center..." />
        : null}

      <FormDialog
        open={openDetails}
        onClose={() => setOpenDetails(false)}
        title={`Material Request ${detailsQuery.data?.request_no || ""}`}
        onSubmit={() => setOpenDetails(false)}
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
                  variant="outline"
                  size="sm"
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
              <Button variant="outline" size="sm" onClick={() => setOpenDetails(false)}>
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
                isLoading={issueOptionsQuery.isLoading}
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
          <p className="text-sm text-muted-foreground">No details loaded.</p>
        )}
      </FormDialog>
      <ConfirmDialog
        open={confirmSubmitOpen}
        title="Confirm submit request"
        description="Submit this material request now?"
        confirmText="Submit"
        onCancel={() => setConfirmSubmitOpen(false)}
        onConfirm={() => {
          setConfirmSubmitOpen(false);
          createMutation.mutate();
        }}
      />
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
        description="Reject this material request? You can provide an optional reason."
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
          <label className="text-sm font-medium text-slate-700" htmlFor="admin-reject-reason">
            Reject reason (optional)
          </label>
          <Textarea
            id="admin-reject-reason"
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
