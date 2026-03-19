import { RefObject } from "react";
import { useProductionReceiptScanWorkbench } from "@traceability/material";
import { PackageCheck, ScanLine, ShieldAlert, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScanInput } from "../shared/ScanInput";

type ReceiptWorkbench = ReturnType<typeof useProductionReceiptScanWorkbench>;

const SELECT_NONE = "__none__";

function MetricCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function ProductionReceiptWorkbench({
  workbench,
  scanInputRef,
  isSubmitting,
  onReviewConfirm,
}: {
  workbench: ReceiptWorkbench;
  scanInputRef: RefObject<HTMLInputElement | null>;
  isSubmitting: boolean;
  onReviewConfirm: () => void;
}) {
  const {
    partOptions,
    doOptionsForPart,
    selectedPart,
    setSelectedPart,
    selectedDo,
    setSelectedDo,
    scanData,
    setScanData,
    packCount,
    setPackCount,
    manualMode,
    setManualMode,
    manualReason,
    setManualReason,
    stagedScans,
    coverage,
    feedback,
    addStagedScan,
    removeStagedScan,
    clearStagedScans,
  } = workbench;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receive & Scan</CardTitle>
        <CardDescription>
          Use scanner-first flow for production acknowledgement. Keep the input focused, add packs continuously, and
          review coverage before confirming ACK.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div aria-live="polite" className="sr-only">
          {feedback.message}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard
            title="Required Packs"
            value={String(coverage.requiredCount)}
            description="Expected from issued allocations"
          />
          <MetricCard title="Scanned Packs" value={String(coverage.scannedCount)} description="Staged for ACK review" />
          <MetricCard
            title="Remaining Packs"
            value={String(Math.max(0, coverage.requiredCount - coverage.scannedCount))}
            description={
              coverage.ready ? "Ready to confirm acknowledgement" : "Continue scanning until coverage is complete"
            }
          />
        </div>

        {feedback.type !== "idle" && (
          <Alert variant={feedback.type === "success" ? "default" : "destructive"}>
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
          <div className="space-y-2">
            <Label htmlFor="receipt-part">Part Number</Label>
            <Select
              value={selectedPart || SELECT_NONE}
              onValueChange={(value) => {
                const nextPart = value === SELECT_NONE ? "" : value;
                setSelectedPart(nextPart);
                setSelectedDo("");
              }}
            >
              <SelectTrigger id="receipt-part" className="h-11">
                <SelectValue placeholder="Select part number" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={SELECT_NONE}>Select part number</SelectItem>
                  {partOptions.map((part) => (
                    <SelectItem key={`receipt-part-${part}`} value={part}>
                      {part}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-do">DO Number</Label>
            <Select
              value={selectedDo || SELECT_NONE}
              onValueChange={(value) => setSelectedDo(value === SELECT_NONE ? "" : value)}
            >
              <SelectTrigger id="receipt-do" className="h-11">
                <SelectValue placeholder="Select DO number" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={SELECT_NONE}>Select DO number</SelectItem>
                  {doOptionsForPart.map((row) => (
                    <SelectItem key={`receipt-do-${selectedPart}-${row}`} value={row}>
                      {row}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-pack-count">Pack Count</Label>
            <Input
              id="receipt-pack-count"
              name="receipt-pack-count"
              type="number"
              min={1}
              inputMode="numeric"
              autoComplete="off"
              className="h-11"
              value={packCount}
              onChange={(event) => setPackCount(Math.max(1, Number(event.target.value || 1)))}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{manualMode ? "Manual Fallback" : "Scanner Input"}</p>
              <p className="text-xs text-muted-foreground">
                {manualMode
                  ? "Use only when scanner hardware is unavailable. Every manual row should include a reason."
                  : "Keep the cursor here and scan continuously. Press Enter to stage each barcode."}
              </p>
            </div>
            <Button
              type="button"
              variant={manualMode ? "default" : "outline"}
              onClick={() => setManualMode((value) => !value)}
            >
              {manualMode ? "Manual Fallback On" : "Use Manual Fallback"}
            </Button>
          </div>

          {manualMode ? (
            <div className="space-y-2">
              <Label htmlFor="receipt-manual-reason">Manual Note</Label>
              <Textarea
                id="receipt-manual-reason"
                name="receipt-manual-reason"
                autoComplete="off"
                placeholder="Describe why scanner input was not used…"
                rows={3}
                value={manualReason}
                onChange={(event) => setManualReason(event.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2" onClick={() => scanInputRef.current?.focus()}>
              <Label htmlFor="receipt-scan">2D Barcode Data</Label>
              <ScanInput
                ref={scanInputRef}
                value={scanData}
                onChange={setScanData}
                onSubmit={addStagedScan}
                placeholder="Scan barcode and press Enter…"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" className="min-h-11" onClick={addStagedScan}>
            <ScanLine data-icon="inline-start" aria-hidden="true" />
            Add Scan
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={!coverage.ready || isSubmitting || stagedScans.length === 0}
            onClick={onReviewConfirm}
          >
            <PackageCheck data-icon="inline-start" aria-hidden="true" />
            Review & Confirm ACK
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            disabled={stagedScans.length === 0 || isSubmitting}
            onClick={clearStagedScans}
          >
            Clear All
          </Button>
        </div>

        {coverage.missing.length > 0 && (
          <Alert>
            <ShieldAlert aria-hidden="true" />
            <AlertDescription>
              {coverage.missing.length} pack(s) are still missing from coverage. Continue scanning until the request is
              complete.
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-xl border border-border">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">Staged Scans</p>
            <p className="text-xs text-muted-foreground">Review each staged pack before confirming acknowledgement.</p>
          </div>

          {stagedScans.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground">
              No scans staged yet. Select a part and DO number, then add scanned packs.
            </div>
          ) : (
            <ul className="flex max-h-72 flex-col overflow-y-auto">
              {stagedScans.map((row, index) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {index + 1}. {row.part_number} / {row.do_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.pack_count} pack(s) · {row.source === "MANUAL" ? "Manual fallback" : "Scanner"} ·{" "}
                      {new Date(row.scanned_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {row.reason && <p className="text-xs text-muted-foreground">Reason: {row.reason}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStagedScan(row.id)}
                    aria-label={`Remove staged scan ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
