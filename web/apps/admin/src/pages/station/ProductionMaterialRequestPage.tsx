import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { MaterialRequest, MaterialRequestCatalogItem, MaterialRequestDetail } from "@traceability/sdk";
import { useAuth } from "../../context/AuthContext";
import { DataTable } from "../../components/shared/DataTable";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { MaterialRequestVoucherView } from "../../components/material/MaterialRequestVoucherView";
import { formatApiError } from "../../lib/errors";
import { formatDate, formatDateTime } from "../../lib/datetime";
import { useMaterialRequestsRealtime } from "../../hooks/useMaterialRequestsRealtime";
import { useDelayedBusy } from "../../hooks/useDelayedBusy";
import { toast } from "sonner";
import {
  confirmMaterialReceipt,
  createMaterialRequest,
  getMaterialRequestById,
  getMaterialRequestCatalog,
  getMaterialRequestNextNumbers,
  getMaterialRequests,
} from "../../lib/material-api";
import { useMaterialRequestMeta } from "../../hooks/useMaterialRequestMeta";
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
    Input,
    Label,
    BusyIndicator,
    MessageStrip,
    Select,
    Option,
    TextArea,
    Table,
    TableHeaderRow,
    TableHeaderCell,
    TableRow,
    TableCell,
    Form,
    FormGroup,
    FormItem,
    Text,
    Dialog,
    FlexBox,
    FlexBoxDirection,
    FlexBoxAlignItems,
    FlexBoxJustifyContent,
    Grid
} from "@ui5/webcomponents-react";

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

export function ProductionMaterialRequestPage() {
  const { hasRole, user } = useAuth();
  const canUsePage = hasRole("PRODUCTION") || hasRole("OPERATOR");
  const queryClient = useQueryClient();
  const [selectedCostCenterId, setSelectedCostCenterId] = useState("");
  const [headerRemarks, setHeaderRemarks] = useState("");
  const [lines, setLines] = useState<LineForm[]>([blankLine(1)]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [tab, setTab] = useState<TabKey>("FORM");
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [receivePartNo, setReceivePartNo] = useState("");
  const [receiveDoNo, setReceiveDoNo] = useState("");
  const [receiveScanData, setReceiveScanData] = useState("");
  const [bulkScanData, setBulkScanData] = useState("");
  const [receiveRemarks, setReceiveRemarks] = useState("");
  const [scanQueue, setScanQueue] = useState<Array<{ part_number: string; do_number: string; scan_data: string }>>([]);
  const [scanInputError, setScanInputError] = useState<string | null>(null);
  const submittedScanCacheRef = useRef<Set<string>>(new Set());
  const scanInputRef = useRef<any>(null);

  const { meta, sectionNotSet, isLoading: metaLoading } = useMaterialRequestMeta(canUsePage);

  // Pre-select default cost center once meta loads
  const defaultSetRef = useRef(false);
  useEffect(() => {
    if (meta?.default_cost_center_id && !defaultSetRef.current) {
      setSelectedCostCenterId(meta.default_cost_center_id);
      defaultSetRef.current = true;
    }
  }, [meta?.default_cost_center_id]);

  const requestsQuery = useQuery({
    queryKey: ["station-production-material-requests"],
    queryFn: () => getMaterialRequests(),
    enabled: canUsePage,
  });

  const detailsQuery = useQuery<MaterialRequestDetail>({
    queryKey: ["station-production-material-request", selectedId],
    queryFn: () => getMaterialRequestById(selectedId!),
    enabled: Boolean(selectedId),
  });

  const catalogQuery = useQuery({
    queryKey: ["material-request-catalog"],
    queryFn: getMaterialRequestCatalog,
    enabled: canUsePage,
  });

  const nextNumbersQuery = useQuery({
    queryKey: ["material-request-next-numbers"],
    queryFn: getMaterialRequestNextNumbers,
    enabled: canUsePage,
    refetchOnWindowFocus: true,
  });

  const realtimeQueryKeys = useMemo(
    () => [
      ["station-production-material-requests"],
      ["station-production-material-request"],
      ["material-request-next-numbers"],
    ],
    []
  );

  useMaterialRequestsRealtime({
    enabled: canUsePage,
    queryKeys: realtimeQueryKeys,
  });

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

  const departmentDisplay = (meta as any)?.department?.name || user?.department || "-";
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
        cost_center_id: selectedCostCenterId || undefined,
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
      setSelectedCostCenterId(meta?.default_cost_center_id ?? "");
      setHeaderRemarks("");
      const recipientText =
        (created.alert_recipients ?? []).length > 0
          ? (created.alert_recipients ?? [])
              .map((row) => row.display_name || row.email || "-")
              .join(", ")
          : "configured approver group";
      toast.success(`Request submitted: ${created.request_no}${created.dmi_no ? ` (${created.dmi_no})` : ""}`, {
        description:
          created.alert_status === "QUEUED_MOCK"
            ? `Email alert queued (mock) to: ${recipientText}`
            : `Email alert prepared to: ${recipientText}`,
      });
      await queryClient.invalidateQueries({ queryKey: ["station-production-material-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["material-request-next-numbers"] });
    },
    onError: (err: any) => {
      const code = err?.error_code;
      if (code === "SECTION_NOT_SET") {
        toast.error("Your user has no section assigned. Contact an administrator.");
      } else if (code === "COST_CENTER_DEFAULT_NOT_SET") {
        toast.error("No default cost center set for your section. Contact an administrator.");
      } else if (code === "INVALID_COST_CENTER") {
        toast.error("Selected cost center is not allowed. Reverting to default.");
        setSelectedCostCenterId(meta?.default_cost_center_id ?? "");
      } else {
        toast.error(err?.message || "Failed to submit request");
      }
    },
  });

  const confirmReceiptMutation = useMutation({
    mutationFn: ({
      id,
      scans,
      remarks,
    }: {
      id: string;
      scans: Array<{ part_number: string; do_number: string; scan_data: string }>;
      remarks?: string;
    }) => confirmMaterialReceipt(id, { scans, remarks }),
    onSuccess: async (result, variables) => {
      for (const row of variables.scans) {
        const key = `${row.part_number}|${row.do_number}|${row.scan_data}`;
        submittedScanCacheRef.current.add(key);
      }
      toast.success("Material receipt confirmed", {
        description: `Saved scans: ${result.scans_saved ?? 0}`,
      });
      setReceiveScanData("");
      setBulkScanData("");
      setReceiveRemarks("");
      setScanQueue([]);
      setScanInputError(null);
      requestAnimationFrame(() => scanInputRef.current?.focus());
      await queryClient.invalidateQueries({ queryKey: ["station-production-material-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["station-production-material-request"] });
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
      { header: "No.", accessorKey: "request_no" },
      { header: "Model", accessorKey: "model_code", cell: ({ row }) => row.original.model_code || "-" },
      { header: "DMI No.", accessorKey: "dmi_no", cell: ({ row }) => row.original.dmi_no || "-" },
      {
        header: "Date",
        accessorKey: "created_at",
        cell: ({ row }) => formatDateTime((row.original.created_at ?? row.original.request_date) as any),
      },
      { header: "Cost Center", accessorKey: "cost_center", cell: ({ row }) => row.original.cost_center || "-" },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        header: "Actions",
        cell: ({ row }) => (
          <Button
            design="Transparent"
            icon="search"
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

  const receiptOptions = useMemo(() => {
    const options: Array<{ part_number: string; do_number: string }> = [];
    const seen = new Set<string>();
    for (const item of detailsQuery.data?.items ?? []) {
      for (const alloc of item.issue_allocations ?? []) {
        const part = String(item.part_number ?? "").toUpperCase();
        const doNo = String(alloc.do_number ?? "").toUpperCase();
        if (!part || !doNo) continue;
        const key = `${part}|${doNo}`;
        if (seen.has(key)) continue;
        seen.add(key);
        options.push({ part_number: part, do_number: doNo });
      }
    }
    return options;
  }, [detailsQuery.data]);

  const availableDoByPart = useMemo(() => {
    return receiptOptions
      .filter((row) => row.part_number === receivePartNo)
      .map((row) => row.do_number);
  }, [receiptOptions, receivePartNo]);

  useEffect(() => {
    if (!detailsQuery.data || detailsQuery.data.status !== "ISSUED") return;
    const first = receiptOptions[0];
    setReceivePartNo(first?.part_number ?? "");
    setReceiveDoNo(first?.do_number ?? "");
    setReceiveScanData("");
    setBulkScanData("");
    setReceiveRemarks("");
    setScanQueue([]);
    setScanInputError(null);
    submittedScanCacheRef.current.clear();
    requestAnimationFrame(() => scanInputRef.current?.focus());
  }, [detailsQuery.data, receiptOptions, openDetails]);

  useEffect(() => {
    if (!receivePartNo) {
      setReceiveDoNo("");
      return;
    }
    if (availableDoByPart.length === 0) {
      setReceiveDoNo("");
      return;
    }
    if (!availableDoByPart.includes(receiveDoNo)) {
      setReceiveDoNo(availableDoByPart[0]);
    }
  }, [receivePartNo, availableDoByPart, receiveDoNo]);

  const anyError = requestsQuery.error ?? catalogQuery.error ?? nextNumbersQuery.error ?? createMutation.error ?? detailsQuery.error;
  const showRequestTableLoading = useDelayedBusy(
    requestsQuery.isLoading || (requestsQuery.isFetching && !requestsQuery.data),
    250
  );
  const showFormLoading = useDelayedBusy(
    catalogQuery.isLoading || nextNumbersQuery.isLoading || metaLoading || (catalogQuery.isFetching && !catalogQuery.data),
    250
  );
  const showDetailsLoading = useDelayedBusy(Boolean(selectedId) && detailsQuery.isLoading, 200);

  const appendScanToQueue = (rawValue?: string) => {
    const payload = (rawValue ?? receiveScanData).trim();
    if (!payload) {
      setScanInputError("Please scan 2D barcode first.");
      return;
    }
    if (!receivePartNo || !receiveDoNo) {
      setScanInputError("Please select component part and DO number.");
      return;
    }
    const key = `${receivePartNo}|${receiveDoNo}|${payload}`;
    const queuedDuplicate = scanQueue.some(
      (row) => row.part_number === receivePartNo && row.do_number === receiveDoNo && row.scan_data === payload
    );
    if (queuedDuplicate || submittedScanCacheRef.current.has(key)) {
      setScanInputError("Duplicate scan detected. This barcode is already in queue/submitted.");
      setReceiveScanData("");
      requestAnimationFrame(() => scanInputRef.current?.focus());
      return;
    }
    setScanQueue((prev) => [
      ...prev,
      {
        part_number: receivePartNo,
        do_number: receiveDoNo,
        scan_data: payload,
      },
    ]);
    setReceiveScanData("");
    setScanInputError(null);
    requestAnimationFrame(() => scanInputRef.current?.focus());
  };

  const importBulkScans = () => {
    const rows = bulkScanData
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!rows.length) {
      setScanInputError("Please paste at least one 2D barcode line.");
      return;
    }
    if (!receivePartNo || !receiveDoNo) {
      setScanInputError("Please select component part and DO number.");
      return;
    }
    const queued = new Set(scanQueue.map((row) => `${row.part_number}|${row.do_number}|${row.scan_data}`));
    const nextRows: Array<{ part_number: string; do_number: string; scan_data: string }> = [];
    let skipped = 0;
    for (const scan of rows) {
      const key = `${receivePartNo}|${receiveDoNo}|${scan}`;
      if (queued.has(key) || submittedScanCacheRef.current.has(key)) {
        skipped += 1;
        continue;
      }
      queued.add(key);
      nextRows.push({
        part_number: receivePartNo,
        do_number: receiveDoNo,
        scan_data: scan,
      });
    }
    if (!nextRows.length) {
      setScanInputError("All pasted scans are duplicates.");
      return;
    }
    setScanQueue((prev) => [...prev, ...nextRows]);
    setBulkScanData("");
    setScanInputError(null);
    toast.success(`Added ${nextRows.length} scan(s) to queue${skipped ? `, skipped ${skipped} duplicate(s)` : ""}.`);
    requestAnimationFrame(() => scanInputRef.current?.focus());
  };

  const queueGroupSummary = useMemo(() => {
    const map = new Map<string, { part_number: string; do_number: string; count: number }>();
    for (const row of scanQueue) {
      const key = `${row.part_number}|${row.do_number}`;
      const current = map.get(key);
      if (current) {
        current.count += 1;
      } else {
        map.set(key, { part_number: row.part_number, do_number: row.do_number, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.part_number === b.part_number) return a.do_number.localeCompare(b.do_number);
      return a.part_number.localeCompare(b.part_number);
    });
  }, [scanQueue]);

  const selectedPairQueuedCount = useMemo(
    () => scanQueue.filter((row) => row.part_number === receivePartNo && row.do_number === receiveDoNo).length,
    [scanQueue, receivePartNo, receiveDoNo]
  );

  useEffect(() => {
    if (tab !== "HISTORY") {
      setOpenDetails(false);
    }
  }, [tab]);

  if (!canUsePage) {
    return (
      <Card>
        <CardHeader titleText="Authorized Access Required" />
        <div style={{ padding: "1rem" }}>This role is not allowed to submit material request.</div>
      </Card>
    );
  }

  return (
    <Page
      header={<Bar startContent={<Title level="H2">Production Material Request</Title>} />}
      backgroundDesign="List"
      style={{ height: "100%" }}
    >
      {anyError ? <MessageStrip design="Negative" hideCloseButton>{formatApiError(anyError)}</MessageStrip> : null}
      {sectionNotSet ? (
        <MessageStrip design="Critical" hideCloseButton style={{ marginBottom: "0.5rem" }}>
          Your user account has no section assigned. Please contact an administrator to set your section before creating requests.
        </MessageStrip>
      ) : null}
      <TabContainer tabLayout="Standard" collapsed onTabSelect={(e) => setTab(e.detail.tab.getAttribute("data-key") as TabKey)}>
        <Tab text="Request Form" icon="form" selected={tab === "FORM"} data-key="FORM" />
        <TabSeparator />
        <Tab text="History" icon="history" selected={tab === "HISTORY"} data-key="HISTORY" />
      </TabContainer>
      <div style={{ padding: "1rem" }}>
      {showFormLoading ? <BusyIndicator active /> : null}

      {tab === "FORM" ? (
        <Card>
            <div style={{ padding: "1rem" }}>
                <div style={{ border: "1px solid var(--sapGroup_ContentBorderColor)", borderRadius: "var(--sapElement_BorderCornerRadius)", padding: "1.5rem", width: "100%", boxSizing: "border-box" }}>
                    <FlexBox style={{ gap: "1.5rem", marginBottom: "2rem", width: "100%" }} alignItems={FlexBoxAlignItems.Start}>
                        <img src="/logo.png" alt="MMI Logo" style={{ height: "4rem", width: "auto", objectFit: "contain" }} />
                        <FlexBox direction={FlexBoxDirection.Column}>
                            <Title level="H3" style={{ fontStyle: "italic", marginBottom: "0.25rem" }}>MMI Precision Assembly (Thailand) Co., Ltd.</Title>
                            <Text>888 Moo 1, Mittraphap Road, Tambon Naklang, Amphur Sungnoen, Nakornratchasima 30380 Thailand</Text>
                            <FlexBox style={{ marginTop: "0.25rem" }}>
                                <Text>TEL : (6644) 000188 &nbsp;&nbsp; FAX : (6644) 000199</Text>
                            </FlexBox>
                        </FlexBox>
                    </FlexBox>

                    <FlexBox justifyContent={FlexBoxJustifyContent.Center} style={{ marginBottom: "1.5rem" }}>
                        <Title level="H2" style={{ textDecoration: "underline" }}>DIRECT MATERIAL ISSUE VOUCHER</Title>
                    </FlexBox>

                    <Form layout="S1 M2 L2 XL2" labelSpan="M4 L4 XL4">
                        <FormGroup headerText="Document Details">
                            <FormItem labelContent={<Label>NO.</Label>}>
                                <Text style={{ color: "var(--sapNegativeElementColor)", fontWeight: "bold" }}>{nextNumbersQuery.data?.request_no ?? "-"}</Text>
                            </FormItem>
                            <FormItem labelContent={<Label>DMI. NO.</Label>}>
                                <Text style={{ color: "var(--sapNegativeElementColor)", fontWeight: "bold" }}>{nextNumbersQuery.data?.dmi_no ?? "-"}</Text>
                            </FormItem>
                            <FormItem labelContent={<Label>DATE</Label>}>
                                <Text>{formatDate(nextNumbersQuery.data?.generated_at ?? new Date().toISOString())}</Text>
                            </FormItem>
                        </FormGroup>
                        <FormGroup headerText="Requestor Details">
                            <FormItem labelContent={<Label>DEPARTMENT</Label>}>
                                <Text>{departmentDisplay}</Text>
                            </FormItem>
                            <FormItem labelContent={<Label showColon required for="cost-center-select">COST CENTER</Label>}>
                                <Select
                                    id="cost-center-select"
                                    onChange={(e) => setSelectedCostCenterId(e.detail.selectedOption.getAttribute("data-value") ?? "")}
                                >
                                    <Option data-value="" selected={!selectedCostCenterId}>Select Cost Center</Option>
                                    {(meta?.allowed_cost_centers ?? []).map((cc) => (
                                        <Option
                                            key={cc.cost_center_id}
                                            data-value={cc.cost_center_id}
                                            selected={selectedCostCenterId === cc.cost_center_id}
                                        >
                                            {cc.group_code ? `${cc.group_code} | ` : ""}{cc.cost_code}{cc.short_text ? ` — ${cc.short_text}` : ""}
                                        </Option>
                                    ))}
                                </Select>
                            </FormItem>
                        </FormGroup>
                    </Form> 
                    
                    <div style={{ marginTop: "1rem" }}>
                        <Table
                            headerRow={
                                <TableHeaderRow>
                                    <TableHeaderCell width="50px"><Label style={{ fontWeight: "bold" }}>ITEM</Label></TableHeaderCell>
                                    <TableHeaderCell><Label style={{ fontWeight: "bold" }}>MODEL</Label></TableHeaderCell>
                                    <TableHeaderCell><Label style={{ fontWeight: "bold" }}>COMPONENT PART NO.</Label></TableHeaderCell>
                                    <TableHeaderCell><Label style={{ fontWeight: "bold" }}>DESCRIPTION</Label></TableHeaderCell>
                                    <TableHeaderCell width="100px"><Label style={{ fontWeight: "bold" }}>QTY</Label></TableHeaderCell>
                                    <TableHeaderCell width="80px"><Label style={{ fontWeight: "bold" }}>UOM</Label></TableHeaderCell>
                                    <TableHeaderCell><Label style={{ fontWeight: "bold" }}>REMARKS</Label></TableHeaderCell>
                                </TableHeaderRow>
                            }
                        >
                            {lines.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Label>{idx + 1}</Label></TableCell>
                        <TableCell>
                          <Select
                            onChange={(e) => onModelChange(idx, e.detail.selectedOption.getAttribute("data-value")!)}
                          >
                            <Option data-value="">Select Model</Option>
                            {modelOptions.map((model) => (
                              <Option key={model.model_id} selected={line.model_id === model.model_id} data-value={model.model_id}>
                                {model.model_code}
                              </Option>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            disabled={!line.model_id}
                            onChange={(e) => onPartNumberChange(idx, e.detail.selectedOption.getAttribute("data-value")!)}
                          >
                            <Option data-value="">{line.model_id ? "Select Component Part Number" : "Select model first"}</Option>
                            {(componentOptionsByModel.get(line.model_id) ?? []).map((item) => (
                              <Option key={`${item.model_id}-${item.part_number}`} selected={line.part_number === item.part_number} data-value={item.part_number}>
                                {item.part_number} {item.component_name ? `- ${item.component_name}` : ""}
                              </Option>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Label>{line.description || "-"}</Label>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="Number"
                            value={line.requested_qty?.toString() ?? ""}
                            onInput={(e) => updateLine(idx, { requested_qty: e.target.value ? Number(e.target.value) : undefined })}
                          />
                        </TableCell>
                        <TableCell>
                          <Label>{line.uom || "PCS"}</Label>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.remarks}
                            onInput={(e) => updateLine(idx, { remarks: e.target.value })}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </Table>

                <FlexBox style={{ marginTop: "0.5rem", gap: "0.5rem" }}>
                    <Button
                        icon="add"
                        design="Transparent"
                        onClick={() => setLines((prev) => [...prev, blankLine(prev.length + 1)])}
                    >
                        Add Item
                    </Button>
                    <Button
                        icon="less"
                        design="Transparent"
                        onClick={() => setLines((prev) => (prev.length <= 1 ? prev : prev.slice(0, -1)))}
                    >
                        Remove Last
                    </Button>
                </FlexBox>

                <Grid defaultSpan="XL6 L6 M6 S12" style={{ marginTop: "1.5rem", border: "1px solid var(--sapGroup_ContentBorderColor)", borderRadius: "var(--sapElement_BorderCornerRadius)", overflow: "hidden", width: "100%" }}>
                    <div style={{ borderRight: "1px solid var(--sapGroup_ContentBorderColor)" }}>
                        <div style={{ background: "var(--sapGroup_TitleBackground)", padding: "0.5rem 0.75rem" }}>
                            <Text style={{ fontSize: "0.75rem", fontWeight: "bold" }}>ISSUED BY</Text>
                        </div>
                        <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "0.75rem", gap: "1rem" }}>
                            <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "0.5rem" }}>
                                <Text style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem" }}>NAME :</Text>
                                <div style={{ flex: 1, borderBottom: "1px dotted var(--sapContent_LabelColor)", height: "1.25rem" }}>&nbsp;</div>
                            </FlexBox>
                            <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "0.5rem" }}>
                                <Text style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem" }}>DATE :</Text>
                                <div style={{ flex: 1, borderBottom: "1px dotted var(--sapContent_LabelColor)", height: "1.25rem" }}>&nbsp;</div>
                            </FlexBox>
                        </FlexBox>
                    </div>
                    <div>
                        <div style={{ background: "var(--sapGroup_TitleBackground)", padding: "0.5rem 0.75rem" }}>
                            <Text style={{ fontSize: "0.75rem", fontWeight: "bold" }}>RECEIVED BY</Text>
                        </div>
                        <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "0.75rem", gap: "1rem" }}>
                            <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "0.5rem" }}>
                                <Text style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem" }}>NAME :</Text>
                                <div style={{ flex: 1, borderBottom: "1px dotted var(--sapContent_LabelColor)", height: "1.25rem" }}>&nbsp;</div>
                            </FlexBox>
                            <FlexBox alignItems={FlexBoxAlignItems.End} style={{ gap: "0.5rem" }}>
                                <Text style={{ color: "var(--sapContent_LabelColor)", minWidth: "3.5rem" }}>DATE :</Text>
                                <div style={{ flex: 1, borderBottom: "1px dotted var(--sapContent_LabelColor)", height: "1.25rem" }}>&nbsp;</div>
                            </FlexBox>
                        </FlexBox>
                    </div>
                </Grid>

                <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} alignItems={FlexBoxAlignItems.Center} style={{ marginTop: "1rem" }}>
                    <Text style={{ fontSize: "0.75rem", color: "var(--sapContent_LabelColor)" }}>
                        White - STORE &nbsp; Blue - MATERIALS &nbsp; Pink - RECEIVER
                    </Text>
                    <Button
                        design="Emphasized"
                        onClick={() => {
                            setConfirmSubmitOpen(true);
                        }}
                        disabled={createMutation.isPending || lines.every((line) => !line.part_number) || hasInvalidRequestedQty || sectionNotSet}
                    >
                        {createMutation.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                </FlexBox>
            </div>
            </div>
            </div>
        </Card>
      ) : null}
      {tab === "HISTORY" ? (
        openDetails ? (
          <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.75rem", animation: "var(--ui5-element-show-animation)", width: "100%" }}>
            <Card header={<CardHeader 
                titleText={`Request Detail ${detailsQuery.data?.request_no ? ` - ${detailsQuery.data.request_no}` : ""}`}
                action={
                    <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                        <Button
                            design="Transparent"
                            icon="nav-back"
                            onClick={() => {
                                setOpenDetails(false);
                                setSelectedId(null);
                            }}
                        >
                            Back to History
                        </Button>
                        <StatusBadge status={detailsQuery.data?.status ?? "REQUESTED"} />
                    </FlexBox>
                }
            />} />
            
            {showDetailsLoading ? (
              <BusyIndicator active />
            ) : detailsQuery.data ? (
              <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.75rem", width: "100%" }}>
                <MaterialRequestVoucherView detail={detailsQuery.data} />
                {detailsQuery.data.status === "ISSUED" ? (
                  <Card header={<CardHeader titleText="Production Receive From Forklift (High-Volume 2D Scan)" subtitleText={`Total queued: ${scanQueue.length} | Current Part/DO: ${selectedPairQueuedCount}`} />}>
                    <div style={{ padding: "1rem" }}>
                      <Grid defaultSpan="XL4 L4 M12 S12" style={{ gap: "1rem", width: "100%" }}>
                        <div style={{ gridColumn: "span 8" }}>
                           <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem", padding: "1rem", background: "var(--sapGroup_ContentBackground)", border: "1px solid var(--sapGroup_ContentBorderColor)", borderRadius: "var(--sapElement_BorderCornerRadius)", width: "100%", boxSizing: "border-box" }}>
                            <Grid defaultSpan="XL6 L6 M6 S12" style={{ gap: "0.75rem" }}>
                                <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.25rem" }}>
                                    <Label>Component Part No.</Label>
                                    <Select
                                        style={{ width: "100%" }}
                                        onChange={(e) => setReceivePartNo(e.detail.selectedOption.getAttribute("data-value")!)}
                                    >
                                        <Option data-value="">Select part number</Option>
                                        {Array.from(new Set(receiptOptions.map((row) => row.part_number))).map((part) => (
                                        <Option key={part} selected={receivePartNo === part} data-value={part}>
                                            {part}
                                        </Option>
                                        ))}
                                    </Select>
                                </FlexBox>
                                <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.25rem" }}>
                                    <Label>DO No.</Label>
                                    <Select
                                        style={{ width: "100%" }}
                                        disabled={!receivePartNo}
                                        onChange={(e) => setReceiveDoNo(e.detail.selectedOption.getAttribute("data-value")!)}
                                    >
                                        <Option data-value="">Select DO number</Option>
                                        {availableDoByPart.map((doNo) => (
                                        <Option key={doNo} selected={receiveDoNo === doNo} data-value={doNo}>
                                            {doNo}
                                        </Option>
                                        ))}
                                    </Select>
                                </FlexBox>
                            </Grid>
                            
                            <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.25rem" }}>
                                <Label>2D Barcode Scan (scanner gun: Enter each pack)</Label>
                                <FlexBox style={{ gap: "0.5rem" }}>
                                    <Input
                                        style={{ flex: 1 }}
                                        ref={scanInputRef}
                                        value={receiveScanData}
                                        onInput={(e) => setReceiveScanData(e.target.value)}
                                        onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            appendScanToQueue();
                                        }
                                        }}
                                        placeholder="Scan vendor 2D barcode"
                                    />
                                    <Button
                                        icon="scan"
                                        onClick={() => appendScanToQueue()}
                                        disabled={!receivePartNo || !receiveDoNo || !receiveScanData.trim()}
                                    >
                                        Add
                                    </Button>
                                </FlexBox>
                            </FlexBox>
                            
                            <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.25rem" }}>
                                <Label>Bulk paste (one barcode per line)</Label>
                                <TextArea
                                    value={bulkScanData}
                                    onInput={(e) => setBulkScanData(e.target.value)}
                                    placeholder={"*P760049400-P*EA*Q160..."}
                                    rows={3}
                                    style={{ width: "100%" }}
                                />
                                <FlexBox justifyContent={FlexBoxJustifyContent.End} style={{ marginTop: "0.25rem" }}>
                                    <Button
                                        design="Transparent"
                                        onClick={importBulkScans}
                                        disabled={!bulkScanData.trim() || !receivePartNo || !receiveDoNo}
                                    >
                                        Import Lines
                                    </Button>
                                </FlexBox>
                            </FlexBox>
                          </FlexBox>
                        </div>
                        
                        <div style={{ gridColumn: "span 4" }}>
                            <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.5rem", padding: "1.25rem", background: "var(--sapGroup_ContentBackground)", border: "1px solid var(--sapGroup_ContentBorderColor)", borderRadius: "var(--sapElement_BorderCornerRadius)", height: "100%", width: "100%", boxSizing: "border-box" }}>
                                <Text style={{ fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", color: "var(--sapContent_LabelColor)" }}>Queue Summary by Part / DO</Text>
                                <div style={{ maxHeight: "200px", overflow: "auto", border: "1px solid var(--sapGroup_ContentBorderColor)", borderRadius: "var(--sapElement_BorderCornerRadius)" }}>
                                    <Table
                                        headerRow={
                                            <TableHeaderRow>
                                                <TableHeaderCell><Label>Part No.</Label></TableHeaderCell>
                                                <TableHeaderCell><Label>DO No.</Label></TableHeaderCell>
                                                <TableHeaderCell><Label>Scans</Label></TableHeaderCell>
                                            </TableHeaderRow>
                                        }
                                    >
                                        {queueGroupSummary.length ? (
                                        queueGroupSummary.map((row) => (
                                            <TableRow key={`${row.part_number}-${row.do_number}`}>
                                            <TableCell><Label>{row.part_number}</Label></TableCell>
                                            <TableCell><Label>{row.do_number}</Label></TableCell>
                                            <TableCell><Label style={{ fontWeight: "bold" }}>{row.count}</Label></TableCell>
                                            </TableRow>
                                        ))
                                        ) : (
                                        <TableRow>
                                            <TableCell><Label>No queue summary</Label></TableCell>
                                            <TableCell />
                                            <TableCell />
                                        </TableRow>
                                        )}
                                    </Table>
                                </div>
                            </FlexBox>
                        </div>
                      </Grid>

                      <div style={{ marginTop: "1rem" }}>
                        {scanInputError ? (
                            <MessageStrip design="Negative" hideCloseButton>{scanInputError}</MessageStrip>
                        ) : null}
                        
                        <Card header={<CardHeader titleText={`Scanned Items Queue (${scanQueue.length})`} />} style={{ marginTop: "0.5rem" }}>
                            <div style={{ padding: "1rem" }}>
                                <div style={{ maxHeight: "300px", overflow: "auto", border: "1px solid var(--sapGroup_ContentBorderColor)", borderRadius: "var(--sapElement_BorderCornerRadius)" }}>
                                    <Table
                                        headerRow={
                                            <TableHeaderRow>
                                                <TableHeaderCell><Label>#</Label></TableHeaderCell>
                                                <TableHeaderCell><Label>Part No.</Label></TableHeaderCell>
                                                <TableHeaderCell><Label>DO No.</Label></TableHeaderCell>
                                                <TableHeaderCell><Label>2D Data</Label></TableHeaderCell>
                                                <TableHeaderCell><Label>Action</Label></TableHeaderCell>
                                            </TableHeaderRow>
                                        }
                                    >
                                        {scanQueue.length ? (
                                        scanQueue.map((row, idx) => (
                                            <TableRow key={`${row.part_number}-${row.do_number}-${idx}`}>
                                            <TableCell><Label>{idx + 1}</Label></TableCell>
                                            <TableCell><Label>{row.part_number}</Label></TableCell>
                                            <TableCell><Label>{row.do_number}</Label></TableCell>
                                            <TableCell><Label>{row.scan_data}</Label></TableCell>
                                            <TableCell>
                                                <Button
                                                design="Transparent"
                                                icon="delete"
                                                onClick={() =>
                                                    setScanQueue((prev) => prev.filter((_, rowIdx) => rowIdx !== idx))
                                                }
                                                />
                                            </TableCell>
                                            </TableRow>
                                        ))
                                        ) : (
                                        <TableRow>
                                            <TableCell><Label>No scans queued yet</Label></TableCell>
                                            <TableCell />
                                            <TableCell />
                                            <TableCell />
                                            <TableCell />
                                        </TableRow>
                                        )}
                                    </Table>
                                </div>
                                
                                <FlexBox style={{ marginTop: "0.5rem", gap: "0.5rem" }}>
                                    <Button
                                    design="Transparent"
                                    onClick={() => {
                                        setScanQueue((prev) => prev.slice(0, -1));
                                        requestAnimationFrame(() => scanInputRef.current?.focus());
                                    }}
                                    disabled={!scanQueue.length}
                                    >
                                    Undo Last
                                    </Button>
                                    <Button
                                    design="Transparent"
                                    onClick={() => {
                                        setScanQueue([]);
                                        setScanInputError(null);
                                        requestAnimationFrame(() => scanInputRef.current?.focus());
                                    }}
                                    disabled={!scanQueue.length}
                                    >
                                    Clear Queue
                                    </Button>
                                </FlexBox>

                                <Grid defaultSpan="XL8 L8 M12 S12" style={{ marginTop: "1rem", gap: "0.5rem" }}>
                                    <div style={{ gridColumn: "span 8" }}>
                                        <Input
                                            style={{ width: "100%" }}
                                            value={receiveRemarks}
                                            onInput={(e) => setReceiveRemarks(e.target.value)}
                                            placeholder="Receive remarks (optional)"
                                        />
                                    </div>
                                    <div style={{ gridColumn: "span 4" }}>
                                        <FlexBox style={{ gap: "0.5rem" }} justifyContent={FlexBoxJustifyContent.End}>
                                            <Button
                                                design="Transparent"
                                                icon="print"
                                                onClick={() => window.print()}
                                            >
                                                Print
                                            </Button>
                                            <Button
                                                design="Emphasized"
                                                onClick={() => {
                                                    if (!detailsQuery.data?.id) return;
                                                    if (!scanQueue.length) {
                                                    setScanInputError("Please scan at least one pack before confirm.");
                                                    return;
                                                    }
                                                    confirmReceiptMutation.mutate({
                                                    id: detailsQuery.data.id,
                                                    scans: scanQueue,
                                                    remarks: receiveRemarks.trim() || undefined,
                                                    });
                                                }}
                                                disabled={
                                                    confirmReceiptMutation.isPending ||
                                                    !scanQueue.length
                                                }
                                            >
                                                {confirmReceiptMutation.isPending ? "Confirming..." : `Confirm Receipt (${scanQueue.length})`}
                                            </Button>
                                        </FlexBox>
                                    </div>
                                </Grid>
                            </div>
                        </Card>
                      </div>
                    </div>
                  </Card>
                ) : null}
              </FlexBox>
            ) : (
              <FlexBox justifyContent={FlexBoxJustifyContent.Center} style={{ padding: "2rem" }}>
                <Text>No details loaded.</Text>
              </FlexBox>
            )}
          </FlexBox>
        ) : showRequestTableLoading ? (
          <BusyIndicator active />
        ) : (
          <div style={{ padding: "1rem" }}>
            <DataTable data={requestsQuery.data ?? []} columns={columns} />
          </div>
        )
      ) : null}
      </div>
      
      <Dialog 
        open={confirmSubmitOpen} 
        headerText="Confirm submit request"
        onClose={() => setConfirmSubmitOpen(false)}
      >
        <div style={{ padding: "1rem" }}>
            Submit this material request now?
        </div>
        <div slot="footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", padding: "0.5rem" }}>
            <Button design="Transparent" onClick={() => setConfirmSubmitOpen(false)}>Cancel</Button>
            <Button design="Emphasized" onClick={() => {
                setConfirmSubmitOpen(false);
                createMutation.mutate();
            }}>
                Submit
            </Button>
        </div>
      </Dialog>
    </Page>
  );
}
