import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { reassignMaterial, mapApiError, type ReassignMaterialPayload } from "../../lib/admin-set-api";
import { ConfirmDialog } from "../shared/ConfirmDialog";

const PRESET_REASONS = [
  { value: "Loaded wrong set", label: "Loaded wrong set" },
  { value: "Wrong line", label: "Wrong line" },
  { value: "Wrong machine", label: "Wrong machine" },
  { value: "Material mix-up", label: "Material mix-up" },
  { value: "Recovery after jam", label: "Recovery after jam" },
  { value: "Operator mistake", label: "Operator mistake" },
  { value: "Other", label: "Other" },
] as const;

export type ReassignMaterialDialogProps = {
  open: boolean;
  containerId: string;
  fromSetRunId: string;
  onClose: () => void;
  onSuccess?: (result: { reason: string }) => void;
};

export function ReassignMaterialDialog({
  open,
  containerId,
  fromSetRunId,
  onClose,
  onSuccess,
}: ReassignMaterialDialogProps) {
  const [toSetRunId, setToSetRunId] = useState("");
  const [presetReason, setPresetReason] = useState("");
  const [freeNote, setFreeNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const composedReason = useMemo(() => {
    if (!presetReason) return "";
    const note = freeNote.trim();
    return note ? `${presetReason} - ${note}` : presetReason;
  }, [presetReason, freeNote]);

  const trimmedReason = composedReason.trim();
  const isOther = presetReason === "Other";
  const reasonValid = trimmedReason.length >= 5;
  const formValid =
    toSetRunId.trim().length > 0 && presetReason.length > 0 && reasonValid && (!isOther || freeNote.trim().length > 0);

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

  const handleRequestSubmit = useCallback(() => setShowConfirm(true), []);
  const handleConfirmCancel = useCallback(() => setShowConfirm(false), []);

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
        setApiError(mapApiError(result.error_code ?? "UNKNOWN", result.message));
        setLoading(false);
        return;
      }
      setSuccessMsg(`Container moved successfully\nReason: ${trimmedReason}`);
      setLoading(false);
      setTimeout(() => {
        onSuccess?.({ reason: trimmedReason });
        handleClose();
      }, 1800);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Network error. Please try again.");
      setLoading(false);
    }
  }, [containerId, fromSetRunId, toSetRunId, trimmedReason, handleClose, onSuccess]);

  return (
    <>
      <Dialog open={open && !showConfirm} onOpenChange={(isOpen) => !isOpen && !loading && handleClose()}>
        <DialogContent className="min-w-[420px]" onPointerDownOutside={() => !showConfirm && !loading && handleClose()}>
          <DialogHeader>
            <DialogTitle>Reassign Material</DialogTitle>
            <DialogDescription>Move this container to a different set run with a documented reason.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleRequestSubmit();
            }}
          >
            <div className="flex flex-col gap-4 py-2">
              {loading && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              )}
              {successMsg && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/30">
                  <AlertDescription>
                    <strong>Reassignment completed</strong>
                    <br />
                    {successMsg}
                  </AlertDescription>
                </Alert>
              )}
              {apiError && (
                <Alert variant="destructive">
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="reassign-container-id">Container ID</Label>
                <Input id="reassign-container-id" value={containerId} readOnly />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reassign-source-set-run">Source Set Run</Label>
                <Input id="reassign-source-set-run" value={fromSetRunId} readOnly />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reassign-target-set-run">Target Set Run ID *</Label>
                <Input
                  id="reassign-target-set-run"
                  value={toSetRunId}
                  onChange={(e) => setToSetRunId(e.target.value ?? "")}
                  placeholder="Enter target set_run ID"
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reassign-preset-reason">Reason for reassignment *</Label>
                <Select value={presetReason} onValueChange={setPresetReason} disabled={loading}>
                  <SelectTrigger id="reassign-preset-reason">
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
              {presetReason && (
                <div className="grid gap-2">
                  <Label htmlFor="reassign-free-note">
                    {isOther ? "Please specify reason *" : "Additional note (optional)"}
                  </Label>
                  <Input
                    id="reassign-free-note"
                    value={freeNote}
                    onChange={(e) => setFreeNote(e.target.value ?? "")}
                    placeholder={isOther ? "Describe the reason…" : "Optional note"}
                    disabled={loading}
                  />
                  {isOther && freeNote.trim().length === 0 && (
                    <span className="text-sm text-destructive">Required when "Other" is selected</span>
                  )}
                </div>
              )}
              {trimmedReason && (
                <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                  <strong>Reason:</strong> {trimmedReason}
                  {!reasonValid && <span className="ml-2 text-destructive">(min 5 characters)</span>}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formValid || loading}>
                {loading ? "Reassigning…" : "Reassign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirm}
        title="Confirm Reassignment"
        description="Are you sure you want to reassign this material?"
        confirmText="Yes, Reassign"
        submitting={loading}
        onCancel={handleConfirmCancel}
        onConfirm={handleConfirmedSubmit}
      >
        <div className="rounded-lg border bg-muted/50 p-3 text-sm">
          <div>
            <strong>Container:</strong> {containerId}
          </div>
          <div>
            <strong>From:</strong> {fromSetRunId}
          </div>
          <div>
            <strong>To:</strong> {toSetRunId}
          </div>
          <div>
            <strong>Reason:</strong> {trimmedReason}
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
}
