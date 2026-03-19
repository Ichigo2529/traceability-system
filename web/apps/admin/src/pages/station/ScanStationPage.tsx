import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { ScanInput } from "../../components/shared/ScanInput";
import { StationActionBar, StationActionButton } from "../../components/shared/StationActionBar";
import { StationHeader } from "../../components/shared/StationHeader";
import { StationResultFeedback, type StationResultFeedbackState } from "../../components/shared/StationResultFeedback";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { FullscreenResultOverlay } from "../../components/shared/FullscreenResultOverlay";
import { ErrorState, LoadingSkeleton } from "../../components/shared/States";
import { useStationEvent } from "../../hooks/useStationEvent";
import { formatStationError } from "../../lib/station-errors";
import { formatTime } from "../../lib/datetime";
import { PageStack } from "@traceability/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type ScanRow = {
  assyId: string;
  step: string;
  at: string;
  result: "PASS" | "NG";
  reason?: string;
};

const ASSEMBLY_STEPS = [
  "PRESS_FIT_PIN430_DONE",
  "PRESS_FIT_PIN300_DONE",
  "PRESS_FIT_SHROUD_DONE",
  "CRASH_STOP_DONE",
  "IONIZER_DONE",
  "FVMI_PASS",
  "FVMI_FAIL",
] as const;

const STEP_LABELS: Record<(typeof ASSEMBLY_STEPS)[number], string> = {
  PRESS_FIT_PIN430_DONE: "Press Fit PIN430",
  PRESS_FIT_PIN300_DONE: "Press Fit PIN300",
  PRESS_FIT_SHROUD_DONE: "Press Fit Shroud",
  CRASH_STOP_DONE: "Crash Stop",
  IONIZER_DONE: "Ionizer",
  FVMI_PASS: "FVMI Pass",
  FVMI_FAIL: "FVMI Hold",
};

function beep(type: "pass" | "ng") {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.type = "sine";
  oscillator.frequency.value = type === "pass" ? 1040 : 240;
  gain.gain.value = 0.2;
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.12);
}

function genEventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ScanStationPage() {
  const navigate = useNavigate();
  const { publishEvent } = useStationEvent();
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [assyId, setAssyId] = useState("");
  const [step, setStep] = useState<(typeof ASSEMBLY_STEPS)[number]>("PRESS_FIT_PIN430_DONE");
  const [quantity, setQuantity] = useState(0);
  const [history, setHistory] = useState<ScanRow[]>([]);
  const [latestResult, setLatestResult] = useState<StationResultFeedbackState | null>(null);
  const [overlay, setOverlay] = useState<{ open: boolean; mode: "PASS" | "NG"; title: string; description?: string }>({
    open: false,
    mode: "PASS",
    title: "",
  });

  const heartbeatQuery = useQuery({
    queryKey: ["scan-heartbeat"],
    queryFn: () => sdk.device.heartbeat(),
    retry: false,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!heartbeatQuery.error) return;
    const err = heartbeatQuery.error as { code?: string };
    if (err.code === "DEVICE_NOT_REGISTERED") {
      navigate("/station/register", { replace: true });
    }
  }, [heartbeatQuery.error, navigate]);

  const eventMutation = useMutation({
    mutationFn: async (targetAssyId: string) => {
      const result = await publishEvent({
        event_id: genEventId(),
        event_type: step,
        unit_id: targetAssyId,
        payload: {
          assy_id: targetAssyId,
          process: heartbeatQuery.data?.process?.name || "ASSEMBLY",
        },
        created_at_device: new Date().toISOString(),
      });
      return result;
    },
    onSuccess: (result, targetAssyId) => {
      const row: ScanRow = { assyId: targetAssyId, step, at: formatTime(new Date()), result: "PASS" };
      setHistory((prev) => [row, ...prev].slice(0, 5));
      setQuantity((v) => v + 1);
      const nextResult = {
        mode: "PASS" as const,
        title: result.queued ? "Queued Offline" : "Step Accepted",
        description: result.queued ? `${STEP_LABELS[step]} was queued for sync.` : `${STEP_LABELS[step]} was accepted.`,
      };
      setLatestResult(nextResult);
      setOverlay({ open: true, ...nextResult });
      beep("pass");
      setTimeout(() => setOverlay((s) => ({ ...s, open: false })), 700);
      setAssyId("");
      setTimeout(() => scanInputRef.current?.focus(), 100);
    },
    onError: (err, targetAssyId) => {
      const reason = formatStationError(err, "Validation rejected");
      const row: ScanRow = { assyId: targetAssyId, step, at: formatTime(new Date()), result: "NG", reason };
      setHistory((prev) => [row, ...prev].slice(0, 5));
      const nextResult = { mode: "NG" as const, title: "Validation Failed", description: reason };
      setLatestResult(nextResult);
      setOverlay({ open: true, ...nextResult });
      beep("ng");
      setTimeout(() => scanInputRef.current?.focus(), 100);
    },
  });

  const processName = heartbeatQuery.data?.process?.name || "Unassigned Process";
  const stationName = heartbeatQuery.data?.station?.name || "Unassigned Station";
  const deviceStatus = heartbeatQuery.data?.status || "active";

  const statusSummary = useMemo(() => {
    const pass = history.filter((h) => h.result === "PASS").length;
    const ng = history.filter((h) => h.result === "NG").length;
    return { pass, ng };
  }, [history]);

  if (heartbeatQuery.isLoading) return <LoadingSkeleton label="Connecting assembly station..." />;
  if (heartbeatQuery.error)
    return (
      <ErrorState
        title="Assembly station offline"
        description="Register the device and verify the station assignment."
      />
    );
  if (deviceStatus === "disabled")
    return <ErrorState title="Device Disabled" description="This terminal has been disabled by the administrator." />;

  const submitScan = async () => {
    const code = assyId.trim();
    if (!code || eventMutation.isPending) return;

    if (history[0]?.assyId === code && history[0]?.step === step) {
      const row: ScanRow = {
        assyId: code,
        step,
        at: formatTime(new Date()),
        result: "NG",
        reason: "Duplicate scan",
      };
      setHistory((prev) => [row, ...prev].slice(0, 5));
      const nextResult = {
        mode: "NG" as const,
        title: "Duplicate Scan",
        description: "This unit was already scanned for the selected step.",
      };
      setLatestResult(nextResult);
      setOverlay({ open: true, ...nextResult });
      beep("ng");
      return;
    }

    if (!code.includes("-") && code.length < 16) {
      const nextResult = {
        mode: "NG" as const,
        title: "Invalid ASSY ID",
        description: "Check the barcode format and scan again.",
      };
      setLatestResult(nextResult);
      setOverlay({ open: true, ...nextResult });
      beep("ng");
      return;
    }

    await eventMutation.mutateAsync(code);
  };

  return (
    <PageStack>
      <PageHeader title="Assembly Station" description="Scan ASSY units and record the current assembly step." />
      <StationHeader stationName={stationName} processName={processName} deviceStatus={deviceStatus} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle>Step Selection</CardTitle>
            <CardDescription>Choose the step before scanning the next unit.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            <StationActionBar className="flex-col">
              {ASSEMBLY_STEPS.map((item) => (
                <StationActionButton
                  key={item}
                  variant={step === item ? "default" : "ghost"}
                  className="justify-start"
                  onClick={() => setStep(item)}
                >
                  {STEP_LABELS[item]}
                </StationActionButton>
              ))}
            </StationActionBar>
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium text-foreground">Selected step</p>
              <p className="text-muted-foreground">{STEP_LABELS[step]}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 xl:col-span-2">
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Scan Workbench</CardTitle>
              <CardDescription>Scanner-first flow with duplicate and format validation.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-4">
              <StationResultFeedback result={latestResult} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="assembly-assy-scan" className="font-semibold">
                  ASSY ID
                </Label>
                <ScanInput
                  ref={scanInputRef}
                  id="assembly-assy-scan"
                  name="assembly-assy-scan"
                  ariaLabel="ASSY ID"
                  value={assyId}
                  onChange={setAssyId}
                  onSubmit={submitScan}
                  disabled={eventMutation.isPending}
                  placeholder="Scan ASSY ID"
                />
              </div>
              <StationActionBar>
                <StationActionButton onClick={submitScan} disabled={!assyId.trim() || eventMutation.isPending}>
                  {eventMutation.isPending ? "Submitting…" : `Submit ${STEP_LABELS[step]}`}
                </StationActionButton>
              </StationActionBar>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Last 5 Scans</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">
                        <Label className="font-medium">Time</Label>
                      </th>
                      <th className="px-4 py-2 text-left font-medium">
                        <Label className="font-medium">ASSY ID</Label>
                      </th>
                      <th className="px-4 py-2 text-left font-medium">
                        <Label className="font-medium">Step</Label>
                      </th>
                      <th className="px-4 py-2 text-left font-medium">
                        <Label className="font-medium">Result</Label>
                      </th>
                      <th className="px-4 py-2 text-left font-medium">
                        <Label className="font-medium">Reason</Label>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={`${row.assyId}-${row.step}-${row.at}`} className="border-b last:border-b-0">
                        <td className="px-4 py-2">{row.at}</td>
                        <td className="px-4 py-2 font-mono">{row.assyId}</td>
                        <td className="px-4 py-2">{STEP_LABELS[row.step as keyof typeof STEP_LABELS] ?? row.step}</td>
                        <td className="px-4 py-2">
                          <StatusBadge status={row.result} />
                        </td>
                        <td className="px-4 py-2">{row.reason ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Shift Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-8 pt-4 text-sm">
              <div>
                <p className="text-muted-foreground">Accepted</p>
                <p className="text-3xl font-bold text-foreground">{quantity}</p>
              </div>
              <div>
                <p className="text-muted-foreground">PASS</p>
                <p className="text-2xl font-bold text-green-600">{statusSummary.pass}</p>
              </div>
              <div>
                <p className="text-muted-foreground">NG</p>
                <p className="text-2xl font-bold text-destructive">{statusSummary.ng}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <FullscreenResultOverlay
        open={overlay.open}
        mode={overlay.mode}
        title={overlay.title}
        description={overlay.description}
        onClose={() => setOverlay((prev) => ({ ...prev, open: false }))}
      />
    </PageStack>
  );
}
