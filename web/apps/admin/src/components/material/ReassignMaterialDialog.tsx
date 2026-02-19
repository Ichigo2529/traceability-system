import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  Bar,
  Button,
  Label,
  Input,
  MessageStrip,
  BusyIndicator,
} from "@ui5/webcomponents-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import {
  reassignMaterial,
  mapApiError,
  type ReassignMaterialPayload,
} from "../../lib/admin-set-api";

// ─── Preset reasons ───────────────────────────────────────

const PRESET_REASONS = [
  { value: "Loaded wrong set", label: "Loaded wrong set" },
  { value: "Wrong line", label: "Wrong line" },
  { value: "Wrong machine", label: "Wrong machine" },
  { value: "Material mix-up", label: "Material mix-up" },
  { value: "Recovery after jam", label: "Recovery after jam" },
  { value: "Operator mistake", label: "Operator mistake" },
  { value: "Other", label: "Other" },
] as const;

// ─── Props ────────────────────────────────────────────────

export type ReassignMaterialDialogProps = {
  open: boolean;
  containerId: string;
  fromSetRunId: string;
  /** Called when the dialog should close (cancel or success) */
  onClose: () => void;
  /** Called after a successful reassign so the parent can refresh data */
  onSuccess?: (result: { reason: string }) => void;
};

// ─── Component ────────────────────────────────────────────

export function ReassignMaterialDialog({
  open,
  containerId,
  fromSetRunId,
  onClose,
  onSuccess,
}: ReassignMaterialDialogProps) {
  // Form state
  const [toSetRunId, setToSetRunId] = useState("");
  const [presetReason, setPresetReason] = useState("");
  const [freeNote, setFreeNote] = useState("");

  // UX state
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ─── Derived ─────────────────────────────────────────────

  const composedReason = useMemo(() => {
    if (!presetReason) return "";
    const note = freeNote.trim();
    return note ? `${presetReason} - ${note}` : presetReason;
  }, [presetReason, freeNote]);

  const trimmedReason = composedReason.trim();
  const isOther = presetReason === "Other";
  const reasonValid = trimmedReason.length >= 5;

  const formValid =
    toSetRunId.trim().length > 0 &&
    presetReason.length > 0 &&
    reasonValid &&
    (!isOther || freeNote.trim().length > 0);

  // ─── Reset ──────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setToSetRunId("");
    setPresetReason("");
    setFreeNote("");
    setApiError(null);
    setShowConfirm(false);
    setSuccessMsg(null);
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // ─── Submit flow ────────────────────────────────────────

  const handleRequestSubmit = useCallback(() => {
    setApiError(null);
    setShowConfirm(true);
  }, []);

  const handleConfirmCancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  const handleConfirmedSubmit = useCallback(async () => {
    setShowConfirm(false);
    setLoading(true);
    setApiError(null);

    const payload: ReassignMaterialPayload = {
      container_id: containerId,
      from_set_run_id: fromSetRunId,
      to_set_run_id: toSetRunId.trim(),
      reason: trimmedReason,
    };

    try {
      const result = await reassignMaterial(payload);

      if (!result.success) {
        setApiError(
          mapApiError(result.error_code ?? "UNKNOWN", result.message)
        );
        setLoading(false);
        return;
      }

      setSuccessMsg(`Container moved successfully\nReason: ${trimmedReason}`);
      setLoading(false);

      // Auto-close after brief display
      setTimeout(() => {
        onSuccess?.({ reason: trimmedReason });
        handleClose();
      }, 1800);
    } catch (err: any) {
      setApiError(err?.message ?? "Network error. Please try again.");
      setLoading(false);
    }
  }, [
    containerId,
    fromSetRunId,
    toSetRunId,
    trimmedReason,
    handleClose,
    onSuccess,
  ]);

  // ─── Render ─────────────────────────────────────────────

  return (
    <>
      {/* ─── Main dialog ──────────────────────────────────── */}
      <Dialog
        open={open && !showConfirm}
        headerText="Reassign Material"
        {...({
          onAfterClose: (e: any) => {
            e.stopPropagation();
            if (!showConfirm && !loading) handleClose();
          },
        } as any)}
        footer={
          <Bar
            design="Footer"
            endContent={
              <>
                <Button
                  design="Transparent"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  design="Emphasized"
                  onClick={handleRequestSubmit}
                  disabled={!formValid || loading}
                >
                  {loading ? "Reassigning…" : "Reassign"}
                </Button>
              </>
            }
          />
        }
      >
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", minWidth: 420 }}>
          {/* Loading */}
          {loading && (
            <BusyIndicator active size="Medium" style={{ display: "flex", justifyContent: "center" }} />
          )}

          {/* Success banner */}
          {successMsg && (
            <MessageStrip design="Positive" hideCloseButton style={{ borderRadius: "8px" }}>
              <strong>Reassignment completed</strong>
              <br />
              {successMsg}
            </MessageStrip>
          )}

          {/* Error banner */}
          {apiError && (
            <MessageStrip design="Negative" hideCloseButton style={{ borderRadius: "8px" }}>
              {apiError}
            </MessageStrip>
          )}

          {/* Container ID (readonly) */}
          <div>
            <Label>Container ID</Label>
            <Input value={containerId} readonly style={{ width: "100%" }} />
          </div>

          {/* Source Set Run (readonly) */}
          <div>
            <Label>Source Set Run</Label>
            <Input value={fromSetRunId} readonly style={{ width: "100%" }} />
          </div>

          {/* Target Set Run */}
          <div>
            <Label required>Target Set Run ID</Label>
            <Input
              value={toSetRunId}
              onInput={(e: any) => setToSetRunId(e.target.value ?? "")}
              placeholder="Enter target set_run ID"
              style={{ width: "100%" }}
              disabled={loading}
            />
          </div>

          {/* Reason preset */}
          <div>
            <Label required>Reason for reassignment</Label>
            <Select
              value={presetReason}
              onValueChange={setPresetReason}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason…" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Free-text note */}
          {presetReason && (
            <div>
              <Label required={isOther}>
                {isOther ? "Please specify reason" : "Additional note (optional)"}
              </Label>
              <Input
                value={freeNote}
                onInput={(e: any) => setFreeNote(e.target.value ?? "")}
                placeholder={isOther ? "Describe the reason…" : "Optional note"}
                style={{ width: "100%" }}
                disabled={loading}
              />
              {isOther && freeNote.trim().length === 0 && (
                <span style={{ color: "var(--sapNegativeColor)", fontSize: "0.75rem" }}>
                  Required when "Other" is selected
                </span>
              )}
            </div>
          )}

          {/* Composed reason preview */}
          {trimmedReason && (
            <div
              style={{
                background: "var(--sapBackgroundColor)",
                borderRadius: "8px",
                padding: "0.5rem 0.75rem",
                fontSize: "0.8125rem",
                color: "var(--sapNeutralColor)",
              }}
            >
              <strong>Reason:</strong> {trimmedReason}
              {!reasonValid && (
                <span style={{ color: "var(--sapNegativeColor)", marginLeft: "0.5rem" }}>
                  (min 5 characters)
                </span>
              )}
            </div>
          )}
        </div>
      </Dialog>

      {/* ─── Confirmation dialog ──────────────────────────── */}
      <Dialog
        open={showConfirm}
        headerText="Confirm Reassignment"
        state="Warning"
        {...({
          onAfterClose: (e: any) => {
            e.stopPropagation();
            handleConfirmCancel();
          },
        } as any)}
        footer={
          <Bar
            design="Footer"
            endContent={
              <>
                <Button design="Transparent" onClick={handleConfirmCancel}>
                  Cancel
                </Button>
                <Button design="Emphasized" onClick={handleConfirmedSubmit}>
                  Yes, Reassign
                </Button>
              </>
            }
          />
        }
      >
        <div style={{ padding: "1rem" }}>
          <p style={{ margin: 0, color: "var(--sapTextColor)" }}>
            Are you sure you want to reassign this material?
          </p>
          <div
            style={{
              marginTop: "0.75rem",
              background: "var(--sapBackgroundColor)",
              borderRadius: "8px",
              padding: "0.5rem 0.75rem",
              fontSize: "0.8125rem",
            }}
          >
            <div><strong>Container:</strong> {containerId}</div>
            <div><strong>From:</strong> {fromSetRunId}</div>
            <div><strong>To:</strong> {toSetRunId}</div>
            <div><strong>Reason:</strong> {trimmedReason}</div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
