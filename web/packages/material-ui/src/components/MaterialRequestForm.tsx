import React, { useMemo, useState } from "react";
import { MaterialRequestCatalogItem, MaterialRequestMeta } from "@traceability/sdk";
import {
  BusyIndicator,
  Button,
  Dialog,
  FlexBox,
  FlexBoxAlignItems,
  FlexBoxDirection,
  FlexBoxJustifyContent,
  Form,
  FormItem,
  Input,
  Label,
  MessageStrip,
  Option,
  Select,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  Text,
  Title,
} from "@ui5/webcomponents-react";
import type { MaterialRequestFormErrors } from "../lib/materialRequestSchema";

export type MaterialRequestLineForm = {
  item_no: number;
  model_id: string;
  part_number: string;
  description: string;
  requested_qty?: number;
  uom: string;
  remarks: string;
};

type MaterialRequestFormProps = {
  lines: MaterialRequestLineForm[];
  setLines: (next: MaterialRequestLineForm[] | ((prev: MaterialRequestLineForm[]) => MaterialRequestLineForm[])) => void;
  selectedCostCenterId: string;
  setSelectedCostCenterId: (value: string) => void;
  meta: MaterialRequestMeta | null;
  sectionNotSet?: boolean;
  catalog: MaterialRequestCatalogItem[];
  catalogLoading?: boolean;
  requestNo?: string;
  dmiNo?: string;
  generatedAt?: string;
  requestorName?: string;
  departmentName?: string;
  sectionDisplay?: string;
  disableSubmit?: boolean;
  onSubmit?: () => void;
  submitLabel?: string;
  onCancel?: () => void;
  formatDate: (iso: string) => string;
  disabled?: boolean;
  /** Validation errors from zod schema — passed in by parent after validate attempt */
  formErrors?: MaterialRequestFormErrors;
};

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

export function MaterialRequestForm({
  lines,
  setLines,
  selectedCostCenterId,
  setSelectedCostCenterId,
  meta,
  sectionNotSet,
  catalog,
  catalogLoading = false,
  requestNo,
  dmiNo,
  generatedAt,
  requestorName,
  departmentName,
  sectionDisplay,
  disableSubmit,
  onSubmit,
  submitLabel = "Submit Request",
  onCancel,
  formatDate,
  disabled = false,
  formErrors,
}: MaterialRequestFormProps) {
  const [qtyTouched, setQtyTouched] = useState<Set<number>>(new Set());
  const [modelSwitchPending, setModelSwitchPending] = useState<{ idx: number; newModelId: string } | null>(null);

  // Local blur-based qty validation (shows error immediately after blur)
  const isQtyInvalidLocal = (line: MaterialRequestLineForm, idx: number) =>
    qtyTouched.has(idx) &&
    line.part_number.trim().length > 0 &&
    (!Number.isFinite(Number(line.requested_qty)) || Number(line.requested_qty) <= 0);

  // Merged: prefer schema error (from submit attempt), fallback to local blur check
  const getQtyError = (line: MaterialRequestLineForm, idx: number): string | undefined => {
    const schemaErr = formErrors?.lines?.[idx]?.requested_qty;
    if (schemaErr) return schemaErr;
    if (isQtyInvalidLocal(line, idx)) return "Must be > 0";
    return undefined;
  };
  const getModelError = (idx: number): string | undefined => formErrors?.lines?.[idx]?.model_id;
  const getPartError = (idx: number): string | undefined => formErrors?.lines?.[idx]?.part_number;
  const ccError = formErrors?.cost_center_id;
  const formLevelError = formErrors?._form;

  const modelOptions = useMemo(() => {
    const map = new Map<string, { model_id: string; model_code: string; model_name: string }>();
    for (const row of catalog) {
      if (!map.has(row.model_id)) {
        map.set(row.model_id, {
          model_id: row.model_id,
          model_code: row.model_code,
          model_name: row.model_name,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.model_code.localeCompare(b.model_code));
  }, [catalog]);

  const componentOptionsByModel = useMemo(() => {
    const mapByModel = new Map<string, Map<string, MaterialRequestCatalogItem>>();
    for (const row of catalog) {
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
  }, [catalog]);

  const catalogByModelPart = useMemo(() => {
    const map = new Map<string, MaterialRequestCatalogItem>();
    for (const row of catalog) {
      const key = `${row.model_id}|${String(row.part_number).toUpperCase()}`;
      if (!map.has(key)) map.set(key, row);
    }
    return map;
  }, [catalog]);

  const updateLine = (index: number, patch: Partial<MaterialRequestLineForm>) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const onModelChange = (index: number, modelId: string) => {
    const existing = lines[index];
    if (existing?.part_number) {
      setModelSwitchPending({ idx: index, newModelId: modelId });
      return;
    }
    updateLine(index, { model_id: modelId, part_number: "", description: "", uom: "PCS" });
  };

  const confirmModelSwitch = () => {
    if (!modelSwitchPending) return;
    updateLine(modelSwitchPending.idx, {
      model_id: modelSwitchPending.newModelId,
      part_number: "",
      description: "",
      uom: "PCS",
    });
    setModelSwitchPending(null);
  };

  const onPartNumberChange = (index: number, partNo: string) => {
    const key = partNo.toUpperCase();
    const modelId = lines[index]?.model_id || "";
    const model = catalogByModelPart.get(`${modelId}|${key}`);
    updateLine(index, {
      part_number: key,
      description:
        [model?.component_name || model?.model_name || "", model?.rm_location ? `Loc ${model.rm_location}` : "", model?.qty_per_assy ? `Use ${model.qty_per_assy}/VCM` : ""]
          .filter(Boolean)
          .join(" | ") || "",
      uom: model?.uom_default ?? "PCS",
    });
  };

  return (
    <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem", flex: 1 }}>
      {/* Model-switch confirmation dialog */}
      <Dialog
        open={Boolean(modelSwitchPending)}
        headerText="Change Model?"
        footer={
          <FlexBox style={{ gap: "0.5rem", padding: "0.5rem" }}>
            <Button design="Emphasized" onClick={confirmModelSwitch}>Yes, change model</Button>
            <Button design="Transparent" onClick={() => setModelSwitchPending(null)}>Cancel</Button>
          </FlexBox>
        }
        onClose={() => setModelSwitchPending(null)}
      >
        <Text style={{ padding: "1rem 0" }}>
          Changing the model will clear the selected part number and description for this row. Continue?
        </Text>
      </Dialog>

      {sectionNotSet && (
        <MessageStrip design="Critical" hideCloseButton>
          Your user account has no section assigned. You cannot create requests.
        </MessageStrip>
      )}
      {formLevelError && (
        <MessageStrip design="Critical" hideCloseButton>
          {formLevelError}
        </MessageStrip>
      )}

      <div
        style={{
          padding: "1.5rem",
          background: "var(--sapObjectHeader_Background)",
          border: "1px solid var(--sapList_BorderColor)",
          borderRadius: "var(--sapElement_BorderCornerRadius)",
        }}
      >
        <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} alignItems={FlexBoxAlignItems.Start} style={{ width: "100%", paddingBottom: "1.5rem" }}>
          <FlexBox style={{ gap: "1.5rem" }} alignItems={FlexBoxAlignItems.Start}>
            <img src="/logo.png" alt="MMI Logo" style={{ height: "4.5rem", width: "auto", objectFit: "contain" }} />
            <FlexBox direction={FlexBoxDirection.Column}>
              <Title level="H3" style={{ fontStyle: "italic", marginBottom: "0.25rem", color: "var(--sapTextColor)" }}>
                MMI Precision Assembly (Thailand) Co., Ltd.
              </Title>
              <Text style={{ fontSize: "0.875rem" }}>
                888 Moo 1, Mittraphap Road, Tambon Naklang, Amphur Sungnoen, Nakornratchasima 30380 Thailand
              </Text>
              <FlexBox style={{ marginTop: "0.25rem", gap: "1rem" }}>
                <Text style={{ fontSize: "0.875rem" }}>TEL : (6644) 000188</Text>
                <Text style={{ fontSize: "0.875rem" }}>FAX : (6644) 000199</Text>
              </FlexBox>
            </FlexBox>
          </FlexBox>
        </FlexBox>

        <div style={{ width: "100%", borderBottom: "2px solid var(--sapGroup_ContentBorderColor)", marginBottom: "1.5rem" }}>
          <Title level="H3" style={{ marginBottom: "0.5rem" }}>
            DIRECT MATERIAL ISSUE VOUCHER
          </Title>
        </div>

        <Form layout="S1 M3 L4 XL4" labelSpan="S12 M12 L12 XL12">
          <FormItem labelContent={<Label>NO.</Label>}>
            <Text style={{ color: "var(--sapHighlightColor)", fontWeight: "bold" }}>{requestNo ?? "-"}</Text>
          </FormItem>
          <FormItem labelContent={<Label>DMI. NO.</Label>}>
            <Text style={{ color: "var(--sapHighlightColor)", fontWeight: "bold" }}>{dmiNo ?? "-"}</Text>
          </FormItem>
          <FormItem labelContent={<Label>DATE</Label>}>
            <Text>{formatDate(generatedAt ?? new Date().toISOString())}</Text>
          </FormItem>
          <FormItem labelContent={<Label>REQUESTOR</Label>}>
            <Text>{requestorName ?? "-"}</Text>
          </FormItem>
          <FormItem labelContent={<Label>DEPARTMENT</Label>}>
            <Text>{departmentName ?? "-"}</Text>
          </FormItem>
          <FormItem labelContent={<Label>SECTION</Label>}>
            <Text>{sectionDisplay || "-"}</Text>
          </FormItem>
          <FormItem labelContent={<Label required showColon>COST CENTER</Label>}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", width: "100%" }}>
              <Select
                id="material-cc-select"
                disabled={sectionNotSet || disabled}
                onChange={(e) => setSelectedCostCenterId(e.detail.selectedOption.getAttribute("data-value") ?? "")}
                valueState={ccError ? "Negative" : "None"}
                valueStateMessage={ccError ? <span>{ccError}</span> : undefined}
                style={{ width: "100%" }}
              >
                <Option data-value="" selected={!selectedCostCenterId}>
                  Select Cost Center
                </Option>
                {(meta?.allowed_cost_centers ?? []).map((cc) => (
                  <Option key={cc.cost_center_id} data-value={cc.cost_center_id} selected={selectedCostCenterId === cc.cost_center_id}>
                    {cc.group_code ? `${cc.group_code} | ` : ""}
                    {cc.cost_code}
                    {cc.short_text ? ` — ${cc.short_text}` : ""}
                  </Option>
                ))}
              </Select>
              {ccError && <Text style={{ color: "var(--sapNegativeColor)", fontSize: "0.75rem" }}>{ccError}</Text>}
            </div>
          </FormItem>
        </Form>
      </div>

      <div
        style={{
          flex: 1,
          border: "1px solid var(--sapList_BorderColor)",
          borderRadius: "var(--sapElement_BorderCornerRadius)",
          overflow: "hidden",
          background: "var(--sapBaseColor)",
        }}
      >
        <div style={{ padding: "1rem", background: "var(--sapBaseColor)", borderBottom: "1px solid var(--sapList_BorderColor)" }}>
          <Title level="H5">Request Items</Title>
        </div>
        <div style={{ background: "var(--sapBaseColor)", overflowX: "auto" }}>
          <BusyIndicator active={catalogLoading} style={{ width: "100%" }}>
            <Table
              style={{ width: "100%", minWidth: "52rem" } as React.CSSProperties}
              headerRow={
                <TableHeaderRow>
                  <TableHeaderCell width="3rem"><Label style={{ textAlign: "center", display: "block" }}>#</Label></TableHeaderCell>
                  <TableHeaderCell width="11rem"><Label>Model</Label></TableHeaderCell>
                  <TableHeaderCell width="12rem"><Label>Part No.</Label></TableHeaderCell>
                  <TableHeaderCell width="14rem"><Label>Description</Label></TableHeaderCell>
                  <TableHeaderCell width="7rem"><Label>Qty *</Label></TableHeaderCell>
                  <TableHeaderCell width="4.5rem"><Label style={{ textAlign: "center", display: "block" }}>UOM</Label></TableHeaderCell>
                  <TableHeaderCell><Label>Remarks</Label></TableHeaderCell>
                  {!disabled && <TableHeaderCell width="2.75rem"><Label></Label></TableHeaderCell>}
                </TableHeaderRow>
              }
            >
              {lines.map((line, idx) => {
                const qtyErr = getQtyError(line, idx);
                const modelErr = getModelError(idx);
                const partErr = getPartError(idx);
                return (
                  <TableRow key={idx}>
                    <TableCell><Label style={{ textAlign: "center", display: "block" }}>{idx + 1}</Label></TableCell>
                    <TableCell>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                        <Select
                          onChange={(e) => {
                            const selected = e.detail.selectedOption as unknown as { value: string };
                            onModelChange(idx, selected.value);
                          }}
                          value={line.model_id}
                          disabled={disabled}
                          valueState={modelErr ? "Negative" : "None"}
                          valueStateMessage={modelErr ? <span>{modelErr}</span> : undefined}
                          style={{ width: "100%" }}
                        >
                          <Option value="">Select Model</Option>
                          {modelOptions.map((model) => (
                            <Option key={model.model_id} value={model.model_id}>
                              {model.model_code}
                            </Option>
                          ))}
                        </Select>
                        {modelErr && <Text style={{ color: "var(--sapNegativeColor)", fontSize: "0.7rem" }}>{modelErr}</Text>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                        <Select
                          onChange={(e) => {
                            const selected = e.detail.selectedOption as unknown as { value: string };
                            onPartNumberChange(idx, selected.value);
                          }}
                          value={line.part_number}
                          disabled={disabled || !line.model_id}
                          valueState={partErr ? "Negative" : "None"}
                          valueStateMessage={partErr ? <span>{partErr}</span> : undefined}
                          style={{ width: "100%" }}
                        >
                          <Option value="">{line.model_id ? "Select Component" : "Select model first"}</Option>
                          {(componentOptionsByModel.get(line.model_id) ?? []).map((item) => (
                            <Option key={`${item.model_id}-${item.part_number}`} value={item.part_number}>
                              {item.part_number} {item.component_name ? `- ${item.component_name}` : ""}
                            </Option>
                          ))}
                        </Select>
                        {partErr && <Text style={{ color: "var(--sapNegativeColor)", fontSize: "0.7rem" }}>{partErr}</Text>}
                      </div>
                    </TableCell>
                    <TableCell><Label wrappingType="Normal">{line.description || "-"}</Label></TableCell>
                    <TableCell>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                        <Input
                          type="Number"
                          value={line.requested_qty?.toString() ?? ""}
                          onInput={(e) => {
                            updateLine(idx, { requested_qty: e.target.value ? Number(e.target.value) : undefined });
                          }}
                          onBlur={() => setQtyTouched((prev) => new Set([...prev, idx]))}
                          valueState={qtyErr ? "Negative" : "None"}
                          valueStateMessage={qtyErr ? <span>{qtyErr}</span> : undefined}
                          disabled={disabled}
                          style={{ width: "100%", textAlign: "right" }}
                        />
                        {qtyErr && (
                          <Text style={{ color: "var(--sapNegativeColor)", fontSize: "0.7rem" }}>
                            {qtyErr}
                          </Text>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Label style={{ textAlign: "center", display: "block" }}>{line.uom || "PCS"}</Label></TableCell>
                    <TableCell>
                      <Input
                        value={line.remarks}
                        onInput={(e) => updateLine(idx, { remarks: e.target.value })}
                        disabled={disabled}
                        style={{ width: "100%" }}
                      />
                    </TableCell>
                    {!disabled && (
                      <TableCell>
                        <Button
                          icon="delete"
                          design="Transparent"
                          tooltip="Remove this row"
                          disabled={lines.length <= 1}
                          onClick={() =>
                            setLines((prev) =>
                              prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)
                            )
                          }
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </Table>
          </BusyIndicator>
        </div>
        <FlexBox
          alignItems={FlexBoxAlignItems.Center}
          style={{
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            borderTop: "1px solid var(--sapList_BorderColor)",
            background: "var(--sapBaseColor)",
          }}
        >
          {!disabled && (
            <Button
              icon="add"
              design="Transparent"
              onClick={() => setLines((prev) => [...prev, blankLine(prev.length + 1)])}
            >
              Add Item
            </Button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {onCancel && (
              <Button design="Transparent" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {onSubmit && (
              <Button design="Emphasized" icon="paper-plane" onClick={onSubmit} disabled={disableSubmit}>
                {submitLabel}
              </Button>
            )}
          </div>
        </FlexBox>
      </div>
    </FlexBox>
  );
}
