import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { PageLayout } from "@traceability/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Barcode, Square } from "lucide-react";
import {
  getScanSession,
  getSessionScans,
  getBatchItems,
  submitScan,
  finalizeSession,
  type ScanEvent,
  type HandoverBatchItem,
} from "../../lib/handover-api";

const resultVariant: Record<string, string> = {
  MATCHED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  DUPLICATE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  NOT_FOUND: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  EXPIRED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  PARSE_ERROR: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  MISMATCH: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function ScanSessionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [barcodeValue, setBarcodeValue] = useState("");
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeRemarks, setFinalizeRemarks] = useState("");
  const [lastResult, setLastResult] = useState<ScanEvent | null>(null);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["scan-session", sessionId],
    queryFn: () => getScanSession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 3000,
  });

  const { data: scans = [] } = useQuery({
    queryKey: ["scan-session-scans", sessionId],
    queryFn: () => getSessionScans(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 2000,
  });

  const { data: batchItems = [] } = useQuery({
    queryKey: ["batch-items", session?.handoverBatchId],
    queryFn: () => getBatchItems(session!.handoverBatchId),
    enabled: !!session?.handoverBatchId,
  });

  const scanMutation = useMutation({
    mutationFn: (barcodeRaw: string) =>
      submitScan(sessionId!, {
        barcodeRaw,
        idempotencyKey: crypto.randomUUID(),
        scannedAtDevice: new Date().toISOString(),
      }),
    onSuccess: (result) => {
      setLastResult(result);
      setBarcodeValue("");
      queryClient.invalidateQueries({ queryKey: ["scan-session-scans", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["scan-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["batch-items", session?.handoverBatchId] });
      if (result.result === "MATCHED") {
        toast.success(`✓ Matched: ${result.parsedPartNumber ?? "OK"}`);
      } else if (result.result === "DUPLICATE") {
        toast.warning(`⚠ Duplicate scan`);
      } else {
        toast.error(`✗ ${result.result}: ${result.resultDetail ?? "Check barcode"}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message);
      setBarcodeValue("");
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeSession(sessionId!, { remarks: finalizeRemarks || undefined }),
    onSuccess: () => {
      toast.success("Session finalized successfully!");
      setFinalizeOpen(false);
      queryClient.invalidateQueries({ queryKey: ["handover-batches"] });
      navigate("/admin/forklift-intake");
    },
    onError: (err: any) => toast.error(err.message),
  });

  useEffect(() => {
    const timer = setTimeout(() => scanInputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!scanMutation.isPending) scanInputRef.current?.focus();
  }, [scanMutation.isPending]);

  const handleScanSubmit = useCallback(() => {
    const raw = barcodeValue.trim();
    if (!raw || scanMutation.isPending) return;
    scanMutation.mutate(raw);
  }, [barcodeValue, scanMutation]);

  const totalExpected = batchItems.reduce((sum: number, i: HandoverBatchItem) => sum + i.expectedPacks, 0);
  const totalScanned = batchItems.reduce((sum: number, i: HandoverBatchItem) => sum + i.scannedPacks, 0);
  const progressPct = totalExpected > 0 ? Math.round((totalScanned / totalExpected) * 100) : 0;
  const isCompleted = session?.status === "COMPLETED";

  if (sessionLoading) {
    return (
      <PageLayout title="Scan Session" subtitle="Loading...">
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
        </div>
      </PageLayout>
    );
  }

  if (!session) {
    return (
      <PageLayout title="Scan Session" subtitle="Session not found">
        <div className="p-4 flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertDescription>Session not found. It may have been finalized or cancelled.</AlertDescription>
          </Alert>
          <Button onClick={() => navigate("/admin/forklift-intake")}>Back to Intake</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Scan Session"
      subtitle={`Batch scan — ${totalScanned}/${totalExpected} packs`}
      showBackButton
      onBackClick={() => navigate("/admin/forklift-intake")}
      headerActions={
        !isCompleted ? (
          <Button variant="destructive" onClick={() => setFinalizeOpen(true)}>
            <Square className="h-4 w-4 mr-2" />
            Finalize Session
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 p-4">
        {isCompleted && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
            <AlertDescription>This session has been finalized.</AlertDescription>
          </Alert>
        )}

        {!isCompleted && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Barcode className="h-5 w-5" />
                Scan Barcode
              </CardTitle>
              <CardDescription>Scan or paste a 2D barcode below</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Input
                  ref={scanInputRef}
                  placeholder="Scan barcode here…"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScanSubmit()}
                  className="flex-1 text-lg"
                />
                <Button onClick={handleScanSubmit} disabled={scanMutation.isPending || !barcodeValue.trim()}>
                  {scanMutation.isPending ? "Scanning…" : "Submit"}
                </Button>
              </div>
              {lastResult && (
                <div className="mt-3">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-sm font-medium ${
                      resultVariant[lastResult.result] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {lastResult.result}
                    {lastResult.parsedPartNumber ? ` — ${lastResult.parsedPartNumber}` : ""}
                    {lastResult.resultDetail ? ` (${lastResult.resultDetail})` : ""}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>
              {totalScanned} / {totalExpected} packs scanned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">{progressPct}%</p>
            <div className="flex gap-8 mt-4">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold">{session.totalScans}</span>
                <span className="text-xs text-muted-foreground">Total Scans</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{session.matchedScans}</span>
                <span className="text-xs text-muted-foreground">Matched</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-destructive">{session.errorScans}</span>
                <span className="text-xs text-muted-foreground">Errors</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {batchItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Expected Items</CardTitle>
              <CardDescription>{batchItems.length} line items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left font-semibold p-3">Part Number</th>
                      <th className="text-left font-semibold p-3">DO Number</th>
                      <th className="text-left font-semibold p-3">Expected</th>
                      <th className="text-left font-semibold p-3">Scanned</th>
                      <th className="text-left font-semibold p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchItems.map((item: HandoverBatchItem) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="p-3 font-semibold">{item.partNumber}</td>
                        <td className="p-3">{item.doNumber}</td>
                        <td className="p-3">
                          {item.expectedPacks} packs / {item.expectedQty} qty
                        </td>
                        <td className="p-3">
                          {item.scannedPacks} packs / {item.scannedQty} qty
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                              item.scannedPacks >= item.expectedPacks
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : item.scannedPacks > 0
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {item.scannedPacks >= item.expectedPacks
                              ? "Complete"
                              : item.scannedPacks > 0
                                ? "Partial"
                                : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Scan History</CardTitle>
            <CardDescription>{scans.length} scans recorded</CardDescription>
          </CardHeader>
          <CardContent>
            {scans.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No scans yet. Start scanning barcodes above.</p>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left font-semibold p-3">Time</th>
                      <th className="text-left font-semibold p-3">Barcode</th>
                      <th className="text-left font-semibold p-3">Part Number</th>
                      <th className="text-left font-semibold p-3">Qty</th>
                      <th className="text-left font-semibold p-3">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...scans].reverse().map((scan: ScanEvent) => (
                      <tr key={scan.id} className="border-b last:border-0">
                        <td className="p-3">{new Date(scan.createdAt).toLocaleTimeString()}</td>
                        <td className="p-3 max-w-[200px] truncate" title={scan.barcodeRaw}>
                          {scan.barcodeRaw}
                        </td>
                        <td className="p-3">{scan.parsedPartNumber ?? "—"}</td>
                        <td className="p-3">{scan.parsedQty ?? "—"}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                              resultVariant[scan.result] ?? "bg-muted text-muted-foreground"
                            }`}
                          >
                            {scan.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalize Scan Session</DialogTitle>
            <DialogDescription>
              You are about to finalize this scan session. This will lock the session and update the handover batch
              status. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-6 py-4">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold">{session?.matchedScans ?? 0}</span>
              <span className="text-xs text-muted-foreground">Matched</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-destructive">{session?.errorScans ?? 0}</span>
              <span className="text-xs text-muted-foreground">Errors</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold">{progressPct}%</span>
              <span className="text-xs text-muted-foreground">Complete</span>
            </div>
          </div>
          {progressPct < 100 && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                Not all expected items have been scanned ({totalScanned}/{totalExpected}).
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Optional remarks</label>
            <Textarea
              placeholder="Optional remarks…"
              value={finalizeRemarks}
              onChange={(e) => setFinalizeRemarks(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFinalizeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending}>
              {finalizeMutation.isPending ? "Finalizing…" : "Confirm Finalize"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
