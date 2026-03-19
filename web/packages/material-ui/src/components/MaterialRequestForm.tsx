import { useMemo, useState } from "react";
import { MaterialRequestCatalogItem, MaterialRequestMeta } from "@traceability/sdk";
import { ConfirmDialog } from "@traceability/ui";
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
  formId?: string;
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
  showFooterActions?: boolean;
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

const inputBase =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const selectBase =
  "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const labelBase = "text-sm font-medium leading-none";
const errorText = "text-xs text-destructive";

export function MaterialRequestForm({
  formId,
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
  showFooterActions = true,
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
    <form
      id={formId}
      className="flex flex-1 flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      {sectionNotSet && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 px-4 py-3 text-sm text-destructive dark:border-destructive"
        >
          Your user account has no section assigned. You cannot create requests.
        </div>
      )}
      {formLevelError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 px-4 py-3 text-sm text-destructive dark:border-destructive"
        >
          {formLevelError}
        </div>
      )}

      {/* Request header */}
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="flex flex-col gap-4 p-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Material Request Draft
            </p>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold leading-none tracking-tight">Prepare Warehouse Request</h3>
              <p className="text-sm text-muted-foreground">
                Build a traceability-safe request with the correct model, component lines, quantity, and cost center
                before sending it for approval and issue.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>NO.</label>
              <span className="font-semibold text-primary">{requestNo ?? "-"}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>DMI. NO.</label>
              <span className="font-semibold text-primary">{dmiNo ?? "-"}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>DATE</label>
              <span className="text-sm">{formatDate(generatedAt ?? new Date().toISOString())}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>REQUESTOR</label>
              <span className="text-sm">{requestorName ?? "-"}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>DEPARTMENT</label>
              <span className="text-sm">{departmentName ?? "-"}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>SECTION</label>
              <span className="text-sm">{sectionDisplay || "-"}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>
                COST CENTER <span className="text-destructive">*</span>
              </label>
              <select
                id="material-cc-select"
                name="material-cost-center"
                disabled={sectionNotSet || disabled}
                value={selectedCostCenterId}
                onChange={(e) => setSelectedCostCenterId(e.target.value)}
                autoComplete="off"
                className={`${selectBase} ${ccError ? "border-destructive focus-visible:ring-destructive" : ""}`}
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
              {ccError && <span className={errorText}>{ccError}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Request Items — shadcn Card + Table */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow">
        <div className="flex flex-col space-y-1.5 border-b bg-muted/30 px-6 py-4">
          <h4 className="font-semibold leading-none tracking-tight">Request Items</h4>
        </div>
        <div className="relative overflow-x-auto">
          {catalogLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
              <span className="text-sm text-muted-foreground">Loading catalog...</span>
            </div>
          )}
          <table className="w-full min-w-[52rem] border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-12 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  #
                </th>
                <th className="w-44 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Model
                </th>
                <th className="w-48 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Part No.
                </th>
                <th className="min-w-56 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </th>
                <th className="w-28 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Qty <span className="text-destructive">*</span>
                </th>
                <th className="w-16 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  UOM
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Remarks
                </th>
                {!disabled && <th className="w-20 px-3 py-3" />}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const qtyErr = getQtyError(line, idx);
                const modelErr = getModelError(idx);
                const partErr = getPartError(idx);
                return (
                  <tr key={idx} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-3 py-2 text-center text-sm">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1.5">
                        <select
                          name={`material-model-${idx}`}
                          value={line.model_id}
                          disabled={disabled}
                          onChange={(e) => onModelChange(idx, e.target.value)}
                          autoComplete="off"
                          className={`${selectBase} ${modelErr ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        >
                          <option value="">Select Model</option>
                          {modelOptions.map((model) => (
                            <option key={model.model_id} value={model.model_id}>
                              {model.model_code}
                            </option>
                          ))}
                        </select>
                        {modelErr && <span className={errorText}>{modelErr}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1.5">
                        <select
                          name={`material-part-number-${idx}`}
                          value={line.part_number}
                          disabled={disabled || !line.model_id}
                          onChange={(e) => onPartNumberChange(idx, e.target.value)}
                          autoComplete="off"
                          className={`${selectBase} ${partErr ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        >
                          <option value="">{line.model_id ? "Select Component" : "Select model first"}</option>
                          {(componentOptionsByModel.get(line.model_id) ?? []).map((item) => (
                            <option key={`${item.model_id}-${item.part_number}`} value={item.part_number}>
                              {item.part_number} {item.component_name ? `- ${item.component_name}` : ""}
                            </option>
                          ))}
                        </select>
                        {partErr && <span className={errorText}>{partErr}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">{line.description || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1.5">
                        <input
                          name={`material-requested-qty-${idx}`}
                          type="number"
                          value={line.requested_qty ?? ""}
                          onChange={(e) =>
                            updateLine(idx, { requested_qty: e.target.value ? Number(e.target.value) : undefined })
                          }
                          onBlur={() => setQtyTouched((prev) => new Set([...prev, idx]))}
                          disabled={disabled}
                          autoComplete="off"
                          className={`${inputBase} text-right ${qtyErr ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        />
                        {qtyErr && <span className={errorText}>{qtyErr}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center text-sm">{line.uom || "PCS"}</td>
                    <td className="px-3 py-2">
                      <input
                        name={`material-remarks-${idx}`}
                        value={line.remarks}
                        onChange={(e) => updateLine(idx, { remarks: e.target.value })}
                        disabled={disabled}
                        autoComplete="off"
                        className={inputBase}
                      />
                    </td>
                    {!disabled && (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          title="Remove this row"
                          disabled={lines.length <= 1}
                          onClick={() =>
                            setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
                          }
                          className="inline-flex h-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
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
        <div className="flex flex-wrap items-center gap-2 border-t bg-muted/20 px-4 py-3">
          {!disabled && (
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, blankLine(prev.length + 1)])}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Add Item
            </button>
          )}
          {showFooterActions && (
            <div className="ml-auto flex items-center gap-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
              )}
              {onSubmit && (
                <button
                  type="submit"
                  disabled={disableSubmit}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                  {submitLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(modelSwitchPending)}
        title="Change model?"
        description="Changing the model will clear the selected part number and description for this row."
        confirmText="Change Model"
        onCancel={() => setModelSwitchPending(null)}
        onConfirm={confirmModelSwitch}
      />
    </form>
  );
}
