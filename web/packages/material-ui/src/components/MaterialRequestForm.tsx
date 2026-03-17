import React, { useMemo, useState } from "react";
import { MaterialRequestCatalogItem, MaterialRequestMeta } from "@traceability/sdk";
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
  setLines: (
    next: MaterialRequestLineForm[] | ((prev: MaterialRequestLineForm[]) => MaterialRequestLineForm[])
  ) => void;
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

const formGroupStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem", width: "100%" };
const errorTextStyle: React.CSSProperties = { color: "var(--sapNegativeColor)", fontSize: "0.75rem" };
const labelStyle: React.CSSProperties = { fontSize: "0.875rem", fontWeight: 600 };
const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem",
  borderRadius: "4px",
  border: "1px solid var(--sapField_BorderColor)",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem",
  borderRadius: "4px",
  border: "1px solid var(--sapField_BorderColor)",
};

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

  const isQtyInvalidLocal = (line: MaterialRequestLineForm, idx: number) =>
    qtyTouched.has(idx) &&
    line.part_number.trim().length > 0 &&
    (!Number.isFinite(Number(line.requested_qty)) || Number(line.requested_qty) <= 0);

  const getQtyError = (line: MaterialRequestLineForm, idx: number): string | undefined => {
    const schemaErr = formErrors?.lines?.[idx]?.requested_qty;
    if (schemaErr) return schemaErr;
    if (isQtyInvalidLocal(line, idx)) return "Must be > 0";
    return undefined;
  };
  const getModelError = (idx: number) => formErrors?.lines?.[idx]?.model_id;
  const getPartError = (idx: number) => formErrors?.lines?.[idx]?.part_number;
  const ccError = formErrors?.cost_center_id;
  const formLevelError = formErrors?._form;

  const modelOptions = useMemo(() => {
    const map = new Map<string, { model_id: string; model_code: string; model_name: string }>();
    for (const row of catalog) {
      if (!map.has(row.model_id)) {
        map.set(row.model_id, { model_id: row.model_id, model_code: row.model_code, model_name: row.model_name });
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
      {/* Model-switch confirmation dialog */}
      {modelSwitchPending && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              background: "var(--sapGroup_ContentBackground)",
              padding: "1.5rem",
              borderRadius: "8px",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem" }}>Change Model?</h3>
            <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem" }}>
              Changing the model will clear the selected part number and description for this row. Continue?
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setModelSwitchPending(null)}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid var(--sapField_BorderColor)",
                  borderRadius: "4px",
                  background: "transparent",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModelSwitch}
                style={{
                  padding: "0.5rem 1rem",
                  border: "none",
                  borderRadius: "4px",
                  background: "var(--sapButton_Emphasized_Background)",
                  color: "var(--sapButton_Emphasized_TextColor)",
                }}
              >
                Yes, change model
              </button>
            </div>
          </div>
        </div>
      )}

      {sectionNotSet && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "var(--sapCriticalBackground)",
            border: "1px solid var(--sapCriticalBorderColor)",
            borderRadius: "4px",
          }}
        >
          Your user account has no section assigned. You cannot create requests.
        </div>
      )}
      {formLevelError && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "var(--sapCriticalBackground)",
            border: "1px solid var(--sapCriticalBorderColor)",
            borderRadius: "4px",
          }}
        >
          {formLevelError}
        </div>
      )}

      <div
        style={{
          padding: "1.5rem",
          background: "var(--sapObjectHeader_Background)",
          border: "1px solid var(--sapList_BorderColor)",
          borderRadius: "6px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            width: "100%",
            paddingBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
            <img src="/logo.png" alt="MMI Logo" style={{ height: "4.5rem", width: "auto", objectFit: "contain" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <h3
                style={{
                  fontStyle: "italic",
                  marginBottom: "0.25rem",
                  margin: 0,
                  color: "var(--sapTextColor)",
                  fontSize: "1.125rem",
                }}
              >
                MMI Precision Assembly (Thailand) Co., Ltd.
              </h3>
              <p style={{ fontSize: "0.875rem", margin: 0 }}>
                888 Moo 1, Mittraphap Road, Tambon Naklang, Amphur Sungnoen, Nakornratchasima 30380 Thailand
              </p>
              <div style={{ marginTop: "0.25rem", display: "flex", gap: "1rem" }}>
                <span style={{ fontSize: "0.875rem" }}>TEL : (6644) 000188</span>
                <span style={{ fontSize: "0.875rem" }}>FAX : (6644) 000199</span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            width: "100%",
            borderBottom: "2px solid var(--sapGroup_ContentBorderColor)",
            marginBottom: "1.5rem",
          }}
        >
          <h3 style={{ marginBottom: "0.5rem", margin: 0, fontSize: "1.125rem" }}>DIRECT MATERIAL ISSUE VOUCHER</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>NO.</label>
            <span style={{ color: "var(--sapHighlightColor)", fontWeight: "bold" }}>{requestNo ?? "-"}</span>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>DMI. NO.</label>
            <span style={{ color: "var(--sapHighlightColor)", fontWeight: "bold" }}>{dmiNo ?? "-"}</span>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>DATE</label>
            <span>{formatDate(generatedAt ?? new Date().toISOString())}</span>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>REQUESTOR</label>
            <span>{requestorName ?? "-"}</span>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>DEPARTMENT</label>
            <span>{departmentName ?? "-"}</span>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>SECTION</label>
            <span>{sectionDisplay || "-"}</span>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>COST CENTER *</label>
            <select
              id="material-cc-select"
              disabled={sectionNotSet || disabled}
              value={selectedCostCenterId}
              onChange={(e) => setSelectedCostCenterId(e.target.value)}
              style={{ ...selectStyle, borderColor: ccError ? "var(--sapNegativeColor)" : undefined }}
            >
              <option value="">Select Cost Center</option>
              {(meta?.allowed_cost_centers ?? []).map((cc) => (
                <option key={cc.cost_center_id} value={cc.cost_center_id}>
                  {cc.group_code ? `${cc.group_code} | ` : ""}
                  {cc.cost_code}
                  {cc.short_text ? ` — ${cc.short_text}` : ""}
                </option>
              ))}
            </select>
            {ccError && <span style={errorTextStyle}>{ccError}</span>}
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          border: "1px solid var(--sapList_BorderColor)",
          borderRadius: "6px",
          overflow: "hidden",
          background: "var(--sapBaseColor)",
        }}
      >
        <div
          style={{
            padding: "1rem",
            background: "var(--sapBaseColor)",
            borderBottom: "1px solid var(--sapList_BorderColor)",
          }}
        >
          <h4 style={{ margin: 0, fontSize: "1rem" }}>Request Items</h4>
        </div>
        <div style={{ background: "var(--sapBaseColor)", overflowX: "auto", position: "relative" }}>
          {catalogLoading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <span>Loading...</span>
            </div>
          )}
          <table style={{ width: "100%", minWidth: "52rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--sapList_BorderColor)" }}>
                <th style={{ width: "3rem", padding: "0.75rem", textAlign: "center", fontWeight: 600 }}>#</th>
                <th style={{ width: "11rem", padding: "0.75rem", textAlign: "left", fontWeight: 600 }}>Model</th>
                <th style={{ width: "12rem", padding: "0.75rem", textAlign: "left", fontWeight: 600 }}>Part No.</th>
                <th style={{ width: "14rem", padding: "0.75rem", textAlign: "left", fontWeight: 600 }}>Description</th>
                <th style={{ width: "7rem", padding: "0.75rem", textAlign: "left", fontWeight: 600 }}>Qty *</th>
                <th style={{ width: "4.5rem", padding: "0.75rem", textAlign: "center", fontWeight: 600 }}>UOM</th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 600 }}>Remarks</th>
                {!disabled && <th style={{ width: "2.75rem", padding: "0.75rem" }} />}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const qtyErr = getQtyError(line, idx);
                const modelErr = getModelError(idx);
                const partErr = getPartError(idx);
                return (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--sapList_BorderColor)" }}>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <div style={formGroupStyle}>
                        <select
                          value={line.model_id}
                          disabled={disabled}
                          onChange={(e) => onModelChange(idx, e.target.value)}
                          style={{ ...selectStyle, borderColor: modelErr ? "var(--sapNegativeColor)" : undefined }}
                        >
                          <option value="">Select Model</option>
                          {modelOptions.map((model) => (
                            <option key={model.model_id} value={model.model_id}>
                              {model.model_code}
                            </option>
                          ))}
                        </select>
                        {modelErr && <span style={errorTextStyle}>{modelErr}</span>}
                      </div>
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <div style={formGroupStyle}>
                        <select
                          value={line.part_number}
                          disabled={disabled || !line.model_id}
                          onChange={(e) => onPartNumberChange(idx, e.target.value)}
                          style={{ ...selectStyle, borderColor: partErr ? "var(--sapNegativeColor)" : undefined }}
                        >
                          <option value="">{line.model_id ? "Select Component" : "Select model first"}</option>
                          {(componentOptionsByModel.get(line.model_id) ?? []).map((item) => (
                            <option key={`${item.model_id}-${item.part_number}`} value={item.part_number}>
                              {item.part_number} {item.component_name ? `- ${item.component_name}` : ""}
                            </option>
                          ))}
                        </select>
                        {partErr && <span style={errorTextStyle}>{partErr}</span>}
                      </div>
                    </td>
                    <td style={{ padding: "0.5rem", fontSize: "0.875rem" }}>{line.description || "-"}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <div style={formGroupStyle}>
                        <input
                          type="number"
                          value={line.requested_qty ?? ""}
                          onChange={(e) =>
                            updateLine(idx, { requested_qty: e.target.value ? Number(e.target.value) : undefined })
                          }
                          onBlur={() => setQtyTouched((prev) => new Set([...prev, idx]))}
                          disabled={disabled}
                          style={{
                            ...inputStyle,
                            textAlign: "right",
                            borderColor: qtyErr ? "var(--sapNegativeColor)" : undefined,
                          }}
                        />
                        {qtyErr && <span style={errorTextStyle}>{qtyErr}</span>}
                      </div>
                    </td>
                    <td style={{ padding: "0.5rem", textAlign: "center", fontSize: "0.875rem" }}>
                      {line.uom || "PCS"}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <input
                        value={line.remarks}
                        onChange={(e) => updateLine(idx, { remarks: e.target.value })}
                        disabled={disabled}
                        style={inputStyle}
                      />
                    </td>
                    {!disabled && (
                      <td style={{ padding: "0.5rem" }}>
                        <button
                          type="button"
                          title="Remove this row"
                          disabled={lines.length <= 1}
                          onClick={() =>
                            setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
                          }
                          style={{
                            padding: "0.25rem",
                            border: "none",
                            background: "transparent",
                            cursor: lines.length <= 1 ? "not-allowed" : "pointer",
                            opacity: lines.length <= 1 ? 0.5 : 1,
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            borderTop: "1px solid var(--sapList_BorderColor)",
            background: "var(--sapBaseColor)",
          }}
        >
          {!disabled && (
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, blankLine(prev.length + 1)])}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid var(--sapField_BorderColor)",
                borderRadius: "4px",
                background: "transparent",
              }}
            >
              Add Item
            </button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid var(--sapField_BorderColor)",
                  borderRadius: "4px",
                  background: "transparent",
                }}
              >
                Cancel
              </button>
            )}
            {onSubmit && (
              <button
                type="button"
                onClick={onSubmit}
                disabled={disableSubmit}
                style={{
                  padding: "0.5rem 1rem",
                  border: "none",
                  borderRadius: "4px",
                  background: "var(--sapButton_Emphasized_Background)",
                  color: "var(--sapButton_Emphasized_TextColor)",
                  cursor: disableSubmit ? "not-allowed" : "pointer",
                  opacity: disableSubmit ? 0.7 : 1,
                }}
              >
                {submitLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
