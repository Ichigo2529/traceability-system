import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Page,
  Bar,
  Title,
  Button,
  Table,
  TableRow,
  TableCell,
  TableHeaderRow,
  TableHeaderCell,
  FlexBox,
  FlexBoxDirection,
  FlexBoxAlignItems,
  FlexBoxJustifyContent,
  Text,
  BusyIndicator,
  ObjectStatus,
  ProgressIndicator,
  MessageStrip,
  Dialog,
  TextArea,
  Input,
  Card,
  CardHeader,
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/bar-code.js";
import "@ui5/webcomponents-icons/dist/accept.js";
import "@ui5/webcomponents-icons/dist/decline.js";
import "@ui5/webcomponents-icons/dist/navigation-left-arrow.js";
import "@ui5/webcomponents-icons/dist/stop.js";
import { toast } from "sonner";
import {
  getScanSession,
  getSessionScans,
  getBatchItems,
  submitScan,
  finalizeSession,
  type ScanEvent,
  type HandoverBatchItem,
} from "../../lib/handover-api";

export function ScanSessionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [barcodeValue, setBarcodeValue] = useState("");
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeRemarks, setFinalizeRemarks] = useState("");
  const [lastResult, setLastResult] = useState<ScanEvent | null>(null);

  // ── Queries ──────────────────────────────────────────────
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

  // ── Mutations ────────────────────────────────────────────
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

  // ── Auto-focus on scan input ─────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => scanInputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  // Re-focus after each scan
  useEffect(() => {
    if (!scanMutation.isPending) {
      scanInputRef.current?.focus();
    }
  }, [scanMutation.isPending]);

  const handleScanSubmit = useCallback(() => {
    const raw = barcodeValue.trim();
    if (!raw || scanMutation.isPending) return;
    scanMutation.mutate(raw);
  }, [barcodeValue, scanMutation]);

  // ── Derived values ───────────────────────────────────────
  const totalExpected = batchItems.reduce((sum: number, i: HandoverBatchItem) => sum + i.expectedPacks, 0);
  const totalScanned = batchItems.reduce((sum: number, i: HandoverBatchItem) => sum + i.scannedPacks, 0);
  const progressPct = totalExpected > 0 ? Math.round((totalScanned / totalExpected) * 100) : 0;
  const isCompleted = session?.status === "COMPLETED";

  const resultColor = (r: ScanEvent["result"]): string => {
    switch (r) {
      case "MATCHED":    return "Positive";
      case "DUPLICATE":  return "Critical";
      case "NOT_FOUND":  return "Negative";
      case "EXPIRED":    return "Negative";
      case "PARSE_ERROR": return "Negative";
      case "MISMATCH":   return "Negative";
      default:           return "None";
    }
  };

  // ── Loading / Error ──────────────────────────────────────
  if (sessionLoading) {
    return (
      <Page header={<Bar startContent={<Title>Scan Session</Title>} />}>
        <FlexBox justifyContent={FlexBoxJustifyContent.Center} style={{ padding: "3rem" }}>
          <BusyIndicator active />
        </FlexBox>
      </Page>
    );
  }

  if (!session) {
    return (
      <Page header={<Bar startContent={<Title>Scan Session</Title>} />}>
        <MessageStrip design={"Negative" as any} style={{ margin: "1rem" }}>
          Session not found. It may have been finalized or cancelled.
        </MessageStrip>
        <Button onClick={() => navigate("/admin/forklift-intake")} style={{ margin: "1rem" }}>
          Back to Intake
        </Button>
      </Page>
    );
  }

  return (
    <Page
      header={
        <Bar
          startContent={
            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
              <Button
                icon="navigation-left-arrow"
                design="Transparent"
                onClick={() => navigate("/admin/forklift-intake")}
              />
              <Title>Scan Session</Title>
            </FlexBox>
          }
          endContent={
            !isCompleted ? (
              <Button
                icon="stop"
                design="Attention"
                onClick={() => setFinalizeOpen(true)}
              >
                Finalize Session
              </Button>
            ) : undefined
          }
        />
      }
      style={{ height: "100%" }}
    >
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* ── Status Banner ─────────────────────────────── */}
        {isCompleted && (
          <MessageStrip design={"Positive" as any}>
            This session has been finalized.
          </MessageStrip>
        )}

        {/* ── Scan Input ────────────────────────────────── */}
        {!isCompleted && (
          <Card
            header={<CardHeader titleText="Scan Barcode" subtitleText="Scan or paste a 2D barcode below" />}
          >
            <div style={{ padding: "1rem" }}>
              <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.75rem" }}>
                <Input
                  ref={scanInputRef as any}
                  placeholder="Scan barcode here…"
                  value={barcodeValue}
                  onInput={(e: any) => setBarcodeValue(e.target.value)}
                  onKeyDown={(e: any) => {
                    if (e.key === "Enter") handleScanSubmit();
                  }}
                  style={{ flex: 1, fontSize: "1.1rem" }}
                  icon={<span slot="icon" className="ui5-icon" data-name="bar-code" />}
                />
                <Button
                  design="Emphasized"
                  onClick={handleScanSubmit}
                  disabled={scanMutation.isPending || !barcodeValue.trim()}
                >
                  {scanMutation.isPending ? "Scanning…" : "Submit"}
                </Button>
              </FlexBox>

              {/* Last scan result feedback */}
              {lastResult && (
                <div style={{ marginTop: "0.75rem" }}>
                  <ObjectStatus state={resultColor(lastResult.result) as any} showDefaultIcon>
                    {lastResult.result}
                    {lastResult.parsedPartNumber ? ` — ${lastResult.parsedPartNumber}` : ""}
                    {lastResult.resultDetail ? ` (${lastResult.resultDetail})` : ""}
                  </ObjectStatus>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── Progress Summary ──────────────────────────── */}
        <Card header={<CardHeader titleText="Progress" subtitleText={`${totalScanned} / ${totalExpected} packs scanned`} />}>
          <div style={{ padding: "1rem" }}>
            <ProgressIndicator
              value={progressPct}
              displayValue={`${progressPct}%`}
              style={{ width: "100%" }}
            />

            {/* Stats row */}
            <FlexBox style={{ marginTop: "1rem", gap: "2rem" }}>
              <FlexBox direction={FlexBoxDirection.Column} alignItems={FlexBoxAlignItems.Center}>
                <Text style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{session.totalScans}</Text>
                <Text style={{ opacity: 0.6, fontSize: "0.8rem" }}>Total Scans</Text>
              </FlexBox>
              <FlexBox direction={FlexBoxDirection.Column} alignItems={FlexBoxAlignItems.Center}>
                <Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--sapPositiveColor)" }}>{session.matchedScans}</Text>
                <Text style={{ opacity: 0.6, fontSize: "0.8rem" }}>Matched</Text>
              </FlexBox>
              <FlexBox direction={FlexBoxDirection.Column} alignItems={FlexBoxAlignItems.Center}>
                <Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--sapNegativeColor)" }}>{session.errorScans}</Text>
                <Text style={{ opacity: 0.6, fontSize: "0.8rem" }}>Errors</Text>
              </FlexBox>
            </FlexBox>
          </div>
        </Card>

        {/* ── Expected Items ────────────────────────────── */}
        {batchItems.length > 0 && (
          <Card header={<CardHeader titleText="Expected Items" subtitleText={`${batchItems.length} line items`} />}>
            <Table
              headerRow={
                <TableHeaderRow>
                  <TableHeaderCell>Part Number</TableHeaderCell>
                  <TableHeaderCell>DO Number</TableHeaderCell>
                  <TableHeaderCell>Expected</TableHeaderCell>
                  <TableHeaderCell>Scanned</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableHeaderRow>
              }
            >
              {batchItems.map((item: HandoverBatchItem) => (
                <TableRow key={item.id}>
                  <TableCell><Text style={{ fontWeight: "bold" }}>{item.partNumber}</Text></TableCell>
                  <TableCell><Text>{item.doNumber}</Text></TableCell>
                  <TableCell><Text>{item.expectedPacks} packs / {item.expectedQty} qty</Text></TableCell>
                  <TableCell><Text>{item.scannedPacks} packs / {item.scannedQty} qty</Text></TableCell>
                  <TableCell>
                    <ObjectStatus
                      state={(
                        item.scannedPacks >= item.expectedPacks ? "Positive" :
                        item.scannedPacks > 0 ? "Critical" : "None"
                      ) as any}
                    >
                      {item.scannedPacks >= item.expectedPacks ? "Complete" :
                       item.scannedPacks > 0 ? "Partial" : "Pending"}
                    </ObjectStatus>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </Card>
        )}

        {/* ── Scan History ──────────────────────────────── */}
        <Card header={<CardHeader titleText="Scan History" subtitleText={`${scans.length} scans recorded`} />}>
          {scans.length === 0 ? (
            <FlexBox alignItems={FlexBoxAlignItems.Center} justifyContent={FlexBoxJustifyContent.Center} style={{ padding: "2rem", opacity: 0.5 }}>
              <Text>No scans yet. Start scanning barcodes above.</Text>
            </FlexBox>
          ) : (
            <Table
              headerRow={
                <TableHeaderRow>
                  <TableHeaderCell>Time</TableHeaderCell>
                  <TableHeaderCell>Barcode</TableHeaderCell>
                  <TableHeaderCell>Part Number</TableHeaderCell>
                  <TableHeaderCell>Qty</TableHeaderCell>
                  <TableHeaderCell>Result</TableHeaderCell>
                </TableHeaderRow>
              }
            >
              {[...scans].reverse().map((scan: ScanEvent) => (
                <TableRow key={scan.id}>
                  <TableCell><Text>{new Date(scan.createdAt).toLocaleTimeString()}</Text></TableCell>
                  <TableCell>
                    <Text style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {scan.barcodeRaw}
                    </Text>
                  </TableCell>
                  <TableCell><Text>{scan.parsedPartNumber ?? "—"}</Text></TableCell>
                  <TableCell><Text>{scan.parsedQty ?? "—"}</Text></TableCell>
                  <TableCell>
                    <ObjectStatus state={resultColor(scan.result) as any} showDefaultIcon>
                      {scan.result}
                    </ObjectStatus>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>
      </div>

      {/* ── Finalize Dialog ─────────────────────────────── */}
      <Dialog
        open={finalizeOpen}
        headerText="Finalize Scan Session"
        onClose={() => setFinalizeOpen(false)}
        footer={
          <Bar
            endContent={
              <FlexBox style={{ gap: "0.5rem" }}>
                <Button design="Transparent" onClick={() => setFinalizeOpen(false)}>Cancel</Button>
                <Button
                  design="Emphasized"
                  onClick={() => finalizeMutation.mutate()}
                  disabled={finalizeMutation.isPending}
                >
                  {finalizeMutation.isPending ? "Finalizing…" : "Confirm Finalize"}
                </Button>
              </FlexBox>
            }
          />
        }
      >
        <div style={{ padding: "1rem", minWidth: "400px" }}>
          <Text style={{ marginBottom: "1rem", display: "block" }}>
            You are about to finalize this scan session. This will lock the session and
            update the handover batch status. This action cannot be undone.
          </Text>

          <FlexBox style={{ marginBottom: "1rem", gap: "1.5rem" }}>
            <FlexBox direction={FlexBoxDirection.Column}>
              <Text style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{session?.matchedScans ?? 0}</Text>
              <Text style={{ opacity: 0.6, fontSize: "0.8rem" }}>Matched</Text>
            </FlexBox>
            <FlexBox direction={FlexBoxDirection.Column}>
              <Text style={{ fontWeight: "bold", fontSize: "1.2rem", color: "var(--sapNegativeColor)" }}>{session?.errorScans ?? 0}</Text>
              <Text style={{ opacity: 0.6, fontSize: "0.8rem" }}>Errors</Text>
            </FlexBox>
            <FlexBox direction={FlexBoxDirection.Column}>
              <Text style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{progressPct}%</Text>
              <Text style={{ opacity: 0.6, fontSize: "0.8rem" }}>Complete</Text>
            </FlexBox>
          </FlexBox>

          {progressPct < 100 && (
            <MessageStrip design={"Warning" as any} style={{ marginBottom: "1rem" }}>
              Not all expected items have been scanned ({totalScanned}/{totalExpected}).
            </MessageStrip>
          )}

          <TextArea
            placeholder="Optional remarks…"
            value={finalizeRemarks}
            onInput={(e: any) => setFinalizeRemarks(e.target.value)}
            rows={3}
            style={{ width: "100%" }}
          />
        </div>
      </Dialog>
    </Page>
  );
}
