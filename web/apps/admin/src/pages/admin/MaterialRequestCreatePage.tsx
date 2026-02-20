import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialRequestCatalogItem } from "@traceability/sdk";
import { useAuth } from "../../context/AuthContext";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { formatDate } from "../../lib/datetime";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  Select,
  Option,
  Label,
  FlexBox,
  MessageStrip,
  Table,
  TableRow,
  TableCell,
  TableHeaderRow,
  TableHeaderCell,
  Form,
  FormItem,
  Text,
  FlexBoxDirection,
  Bar,
  Title
} from "@ui5/webcomponents-react";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { useMaterialRequestMeta } from "../../hooks/useMaterialRequestMeta";
import {
  createMaterialRequest,
  getMaterialRequestCatalog,
  getMaterialRequestNextNumbers,
} from "../../lib/material-api";

import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/nav-back.js";
import "@ui5/webcomponents-icons/dist/create-form.js";

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

export function MaterialRequestCreatePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();
  
  const [selectedCostCenterId, setSelectedCostCenterId] = useState("");
  const [headerRemarks] = useState("");
  const [lines, setLines] = useState<LineForm[]>([blankLine(1)]);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const { meta, sectionNotSet } = useMaterialRequestMeta();
  const defaultSetRef = useRef(false);

  useEffect(() => {
    if (meta?.default_cost_center_id && !defaultSetRef.current) {
      setSelectedCostCenterId(meta.default_cost_center_id);
      defaultSetRef.current = true;
    }
  }, [meta?.default_cost_center_id]);

  const catalogQuery = useQuery({
    queryKey: ["material-request-catalog-admin"],
    queryFn: getMaterialRequestCatalog,
  });

  const nextNumbersQuery = useQuery({
    queryKey: ["material-request-next-numbers-admin"],
    queryFn: getMaterialRequestNextNumbers,
    refetchOnWindowFocus: true,
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

  const sectionDisplay = meta?.section
    ? `${meta.section.section_name} (${meta.section.section_code})`
    : `${user?.display_name ?? "-"}${user?.department ? ` / ${user.department}` : ""}`;
    
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
      showToast(`Request submitted: ${created.request_no}${created.dmi_no ? ` (${created.dmi_no})` : ""}`);
      await queryClient.invalidateQueries({ queryKey: ["admin-material-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["material-request-next-numbers-admin"] });
      navigate("/admin/material-requests");
    },
    onError: (err: any) => {
      const code = err?.error_code;
      if (code === "SECTION_NOT_SET") {
        showToast("Error: Your user has no section assigned. Contact an administrator.");
      } else if (code === "COST_CENTER_DEFAULT_NOT_SET") {
        showToast("Error: No default cost center set for your section. Contact an administrator.");
      } else if (code === "INVALID_COST_CENTER") {
        showToast("Error: Selected cost center is not allowed for your section.");
        setSelectedCostCenterId(meta?.default_cost_center_id ?? "");
      } else {
        showToast(err.message || "Failed to create request");
      }
    }
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

  const anyError = catalogQuery.error ?? nextNumbersQuery.error ?? createMutation.error;

  return (
    <PageLayout
      title="New Material Request"
      icon="create-form"
      iconColor="blue"
      showBackButton
      onBackClick={() => navigate("/admin/material-requests")}
    >
      <div className="page-container motion-safe:animate-fade-in">
        <ApiErrorBanner message={anyError ? formatApiError(anyError) : undefined} />
        
        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem", flex: 1 }}>
             {sectionNotSet && (
               <MessageStrip design="Critical" hideCloseButton style={{ marginBottom: "0.5rem" }}>
                 Your user account has no section assigned. You cannot create requests.
               </MessageStrip>
             )}
             
             {/* Header Info */}
             <div style={{ padding: "1.5rem", background: "var(--sapObjectHeader_Background)", border: "1px solid var(--sapList_BorderColor)", borderRadius: "var(--sapElement_BorderCornerRadius)" }}>
                 <Title level="H4" style={{ marginBottom: "1rem" }}>Request Header</Title>
                 <Form layout="S1 M3 L5 XL5" labelSpan="S12 M12 L12 XL12">
                     <FormItem labelContent={<Label>NO.</Label>}>
                         <Text style={{ color: "var(--sapNegativeColor)", fontWeight: "bold" }}>
                            {nextNumbersQuery.data?.request_no ?? "-"}
                         </Text>
                     </FormItem>
                     <FormItem labelContent={<Label>DMI. NO.</Label>}>
                         <Text style={{ color: "var(--sapNegativeColor)", fontWeight: "bold" }}>
                            {nextNumbersQuery.data?.dmi_no ?? "-"}
                         </Text>
                     </FormItem>
                     <FormItem labelContent={<Label>DATE</Label>}>
                         <Text>
                            {formatDate(nextNumbersQuery.data?.generated_at ?? new Date().toISOString())}
                         </Text>
                     </FormItem>
                     <FormItem labelContent={<Label>SECTION</Label>}>
                         <Text>
                            {sectionDisplay || "-"}
                         </Text>
                     </FormItem>
                     <FormItem labelContent={<Label required showColon>COST CENTER</Label>}>
                         <Select
                             id="admin-cc-select"
                             disabled={sectionNotSet}
                             onChange={(e) => setSelectedCostCenterId(e.detail.selectedOption.getAttribute("data-value") ?? "")}
                             style={{ width: "100%" }}
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
                 </Form>
             </div>

             {/* Items Table */}
             <div style={{ flex: 1, border: "1px solid var(--sapList_BorderColor)", borderRadius: "var(--sapElement_BorderCornerRadius)", overflow: "hidden" }}>
                 <div style={{ padding: "1rem", background: "var(--sapGroup_TitleBackground)", borderBottom: "1px solid var(--sapList_BorderColor)" }}>
                    <Title level="H5">Request Items</Title>
                 </div>
                 <Table
                    headerRow={
                        <TableHeaderRow>
                            <TableHeaderCell width="3rem"><Label>Item</Label></TableHeaderCell>
                            <TableHeaderCell width="12rem"><Label>Model</Label></TableHeaderCell>
                            <TableHeaderCell width="14rem"><Label>Part No.</Label></TableHeaderCell>
                            <TableHeaderCell><Label>Description</Label></TableHeaderCell>
                            <TableHeaderCell width="8rem"><Label>Qty</Label></TableHeaderCell>
                            <TableHeaderCell width="6rem"><Label>UOM</Label></TableHeaderCell>
                            <TableHeaderCell width="12rem"><Label>Remarks</Label></TableHeaderCell>
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
                 <FlexBox style={{ gap: "0.5rem", padding: "1rem", borderTop: "1px solid var(--sapList_BorderColor)" }}>
                     <Button icon="add" onClick={() => setLines((prev) => [...prev, blankLine(prev.length + 1)])}>Add Item</Button>
                     <Button icon="delete" design="Transparent" disabled={lines.length <= 1} onClick={() => setLines((prev) => (prev.length <= 1 ? prev : prev.slice(0, -1)))}>Remove Last</Button>
                 </FlexBox>
             </div>

            <Bar 
                design="FloatingFooter" 
                endContent={
                    <>
                        <Button design="Transparent" onClick={() => navigate("/admin/material-requests")}>Cancel</Button>
                        <Button
                            design="Emphasized"
                            onClick={() => setConfirmSubmitOpen(true)}
                            disabled={createMutation.isPending || lines.every((line) => !line.part_number) || hasInvalidRequestedQty || sectionNotSet}
                        >
                            {createMutation.isPending ? "Submitting..." : "Submit Request"}
                        </Button>
                    </>
                } 
            />
        </FlexBox>
      </div>

      <ConfirmDialog
        open={confirmSubmitOpen}
        title="Confirm Submit Request"
        description="Are you sure you want to submit this material request now?"
        confirmText="Submit"
        submitting={createMutation.isPending}
        onCancel={() => setConfirmSubmitOpen(false)}
        onConfirm={() => createMutation.mutate()}
      />
      
      <ToastComponent />
    </PageLayout>
  );
}
