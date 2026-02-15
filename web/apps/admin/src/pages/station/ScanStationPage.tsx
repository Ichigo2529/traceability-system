import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { StationHeader } from "../../components/shared/StationHeader";
import { FullscreenResultOverlay } from "../../components/shared/FullscreenResultOverlay";
import { ScanInput } from "../../components/shared/ScanInput";
import { BigCounter } from "../../components/shared/BigCounter";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { ErrorState, LoadingSkeleton } from "../../components/shared/States";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useStationEvent } from "../../hooks/useStationEvent";
import { formatStationError } from "../../lib/station-errors";
import { formatTime } from "../../lib/datetime";

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
  const scanRef = useRef<HTMLInputElement>(null);
  const [assyId, setAssyId] = useState("");
  const [step, setStep] = useState<(typeof ASSEMBLY_STEPS)[number]>("PRESS_FIT_PIN430_DONE");
  const [quantity, setQuantity] = useState(0);
  const [history, setHistory] = useState<ScanRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
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
      setOverlay({
        open: true,
        mode: "PASS",
        title: "PASS",
        description: result.queued ? "Network unstable: queued for sync." : "Assembly step accepted.",
      });
      beep("pass");
      setTimeout(() => setOverlay((s) => ({ ...s, open: false })), 700);
      setAssyId("");
      scanRef.current?.focus();
    },
    onError: (err, targetAssyId) => {
      const reason = formatStationError(err, "Validation rejected");
      const row: ScanRow = { assyId: targetAssyId, step, at: formatTime(new Date()), result: "NG", reason };
      setHistory((prev) => [row, ...prev].slice(0, 5));
      setOverlay({ open: true, mode: "NG", title: "NG", description: reason });
      beep("ng");
    },
  });

  const processName = heartbeatQuery.data?.process?.name || "Unassigned Process";
  const stationName = heartbeatQuery.data?.station?.name || "Unassigned Station";
  const deviceStatus = heartbeatQuery.data?.status || "active";

  const submitScan = () => {
    const code = assyId.trim();
    if (!code || eventMutation.isPending) return;

    const nextWarnings: string[] = [];
    if (history[0]?.assyId === code && history[0]?.step === step) nextWarnings.push("Duplicate step scan detected.");
    if (!code.includes("-") && code.length < 16) nextWarnings.push("ASSY ID format seems invalid.");

    setWarnings(nextWarnings);

    if (nextWarnings.some((w) => w.toLowerCase().includes("duplicate"))) {
      const row: ScanRow = { assyId: code, step, at: formatTime(new Date()), result: "NG", reason: "Duplicate scan" };
      setHistory((prev) => [row, ...prev].slice(0, 5));
      setOverlay({ open: true, mode: "NG", title: "NG", description: "Duplicate scan" });
      beep("ng");
      return;
    }

    eventMutation.mutate(code);
  };

  const statusSummary = useMemo(() => {
    const pass = history.filter((h) => h.result === "PASS").length;
    const ng = history.filter((h) => h.result === "NG").length;
    return { pass, ng };
  }, [history]);

  if (heartbeatQuery.isLoading) return <LoadingSkeleton label="Connecting station..." />;
  if (heartbeatQuery.error) return <ErrorState title="Station unavailable" description="Register device and verify assignment before scanning." />;
  if (deviceStatus === "disabled") return <ErrorState title="Device Disabled" description="This terminal has been disabled by admin." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Assembly Station" description={`${stationName} / ${processName}`} />
      <StationHeader stationName={stationName} processName={processName} deviceStatus={deviceStatus} />

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="xl:col-span-3 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Step Control</CardTitle>
              <StatusBadge status={deviceStatus} />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                {ASSEMBLY_STEPS.map((item) => (
                  <Button key={item} variant={step === item ? "default" : "outline"} onClick={() => setStep(item)}>
                    {item}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Selected step: {step}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ASSY Scan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScanInput ref={scanRef} value={assyId} onChange={setAssyId} onSubmit={submitScan} placeholder="Scan ASSY ID" />
              <div className="flex gap-2">
                <Button onClick={submitScan} disabled={eventMutation.isPending || !assyId}>
                  {eventMutation.isPending ? "Submitting..." : "Submit Step"}
                </Button>
                <Button variant="outline" onClick={() => setAssyId("")}>Clear</Button>
              </div>
              {warnings.length ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Last 5 Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">ASSY ID</th>
                      <th className="px-3 py-2 text-left">Step</th>
                      <th className="px-3 py-2 text-left">Result</th>
                      <th className="px-3 py-2 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={`${row.assyId}-${row.step}-${row.at}`} className="border-t">
                        <td className="px-3 py-2">{row.at}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.assyId}</td>
                        <td className="px-3 py-2 text-xs">{row.step}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={row.result === "PASS" ? "ok" : "ng"} />
                        </td>
                        <td className="px-3 py-2">{row.reason || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <BigCounter label="Current Quantity" value={quantity} />
          <Card>
            <CardHeader>
              <CardTitle>Batch Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>PASS: {statusSummary.pass}</p>
              <p>NG: {statusSummary.ng}</p>
              <p className="text-muted-foreground">Events use catalog types and include device signature headers.</p>
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
    </div>
  );
}
