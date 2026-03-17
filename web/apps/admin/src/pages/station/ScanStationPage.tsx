import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";
import { ScanComponent } from "../../components/patterns/ScanComponent";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { FullscreenResultOverlay } from "../../components/shared/FullscreenResultOverlay";
import { useStationEvent } from "../../hooks/useStationEvent";
import { formatStationError } from "../../lib/station-errors";
import { formatTime } from "../../lib/datetime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import layouts from "../../styles/layouts.module.css";

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
  const [, setAssyId] = useState("");
  const [step, setStep] = useState<(typeof ASSEMBLY_STEPS)[number]>("PRESS_FIT_PIN430_DONE");
  const [quantity, setQuantity] = useState(0);
  const [history, setHistory] = useState<ScanRow[]>([]);
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

  const statusSummary = useMemo(() => {
    const pass = history.filter((h) => h.result === "PASS").length;
    const ng = history.filter((h) => h.result === "NG").length;
    return { pass, ng };
  }, [history]);

  if (heartbeatQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
        <span className="ml-3 text-muted-foreground">Connecting station...</span>
      </div>
    );
  }
  if (heartbeatQuery.error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>Station unavailable. Register device and verify assignment.</AlertDescription>
        </Alert>
      </div>
    );
  }
  if (deviceStatus === "disabled") {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>Device Disabled. This terminal has been disabled by admin.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Title bar */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-xl font-semibold">Assembly Station</h2>
        <StatusBadge status={deviceStatus} />
      </header>

      {/* Header area: Station, Process, Quantity */}
      <div className="flex justify-between items-center border-b px-4 py-4">
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-0.5">
            <Label className="text-muted-foreground">Station</Label>
            <span className="font-bold text-lg">{stationName}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <Label className="text-muted-foreground">Process</Label>
            <span className="font-bold text-lg">{processName}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <Label className="text-muted-foreground">Current Quantity</Label>
          <span className="text-4xl font-bold leading-none">{quantity}</span>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 overflow-auto ${layouts.station}`}>
        <div className="grid w-full max-w-[1200px] grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Step Control */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Step Control</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {ASSEMBLY_STEPS.map((item) => (
                <Button
                  key={item}
                  variant={step === item ? "default" : "ghost"}
                  className="justify-start"
                  onClick={() => setStep(item)}
                >
                  {item}
                </Button>
              ))}
              <p className="mt-4 text-sm text-muted-foreground">Selected step: {step}</p>
            </CardContent>
          </Card>

          {/* Main Scan Area + History + Batch Result */}
          <div className="flex flex-col gap-4 lg:col-span-8">
            <ScanComponent
              label="ASSY Scan"
              placeholder="Scan ASSY ID"
              onScan={async (scannedValue) => {
                const code = scannedValue.trim();

                if (history[0]?.assyId === code && history[0]?.step === step) {
                  const row: ScanRow = {
                    assyId: code,
                    step,
                    at: formatTime(new Date()),
                    result: "NG",
                    reason: "Duplicate scan",
                  };
                  setHistory((prev) => [row, ...prev].slice(0, 5));
                  setOverlay({ open: true, mode: "NG", title: "NG", description: "Duplicate scan" });
                  beep("ng");
                  return { success: false, message: "Duplicate step scan detected." };
                }

                if (!code.includes("-") && code.length < 16) {
                  return { success: false, message: "ASSY ID format seems invalid." };
                }

                try {
                  const result = await eventMutation.mutateAsync(code);
                  return { success: true, message: result.queued ? "Queued for sync" : "Scan accepted" };
                } catch (err) {
                  const reason = formatStationError(err, "Validation rejected");
                  return { success: false, message: reason };
                }
              }}
            />

            {/* History Table */}
            <Card>
              <CardHeader>
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
                          <td className="px-4 py-2">{row.step}</td>
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

            {/* Batch Result */}
            <Card>
              <CardHeader>
                <CardTitle>Batch Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-8">
                  <span>
                    PASS: <span className="font-bold text-green-600">{statusSummary.pass}</span>
                  </span>
                  <span>
                    NG: <span className="font-bold text-destructive">{statusSummary.ng}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
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
