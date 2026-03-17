import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { StationHeader } from "../../components/shared/StationHeader";
import { FullscreenResultOverlay } from "../../components/shared/FullscreenResultOverlay";
import { ScanInput } from "../../components/shared/ScanInput";
import { ErrorState, LoadingSkeleton } from "../../components/shared/States";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { useStationEvent } from "../../hooks/useStationEvent";
import { formatStationError } from "../../lib/station-errors";
import { ApiError } from "@traceability/sdk";
import { PageStack } from "@traceability/ui";

function genEventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function LabelStationPage() {
  const navigate = useNavigate();
  const { publishEvent, isOnline } = useStationEvent();
  const [assyId, setAssyId] = useState("");
  const [labels, setLabels] = useState<Array<{ tray_id: string; serial: number; payload: string }>>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [overlay, setOverlay] = useState<{ open: boolean; mode: "PASS" | "NG"; title: string; description?: string }>({
    open: false,
    mode: "PASS",
    title: "",
  });

  const heartbeatQuery = useQuery({
    queryKey: ["label-heartbeat"],
    queryFn: () => sdk.device.heartbeat(),
    retry: false,
  });

  useEffect(() => {
    if (!heartbeatQuery.error) return;
    const err = heartbeatQuery.error as { code?: string };
    if (err.code === "DEVICE_NOT_REGISTERED") navigate("/station/register", { replace: true });
  }, [heartbeatQuery.error, navigate]);

  const generateMutation = useMutation({
    mutationFn: async (targetAssyId: string) => {
      if (!isOnline) {
        throw new ApiError("Online required for label generation", "OFFLINE_SERIAL_NOT_ALLOWED", 409);
      }

      await publishEvent(
        {
          event_id: genEventId(),
          event_type: "LABEL_GENERATE_REQUEST",
          unit_id: targetAssyId,
          payload: { assy_id: targetAssyId },
          created_at_device: new Date().toISOString(),
        },
        { allowOfflineQueue: false }
      );

      const generated = await sdk.event.generateLabels(targetAssyId);

      await publishEvent(
        {
          event_id: genEventId(),
          event_type: "LABELS_GENERATED",
          unit_id: targetAssyId,
          payload: { assy_id: targetAssyId, label_count: generated.labels.length },
          created_at_device: new Date().toISOString(),
        },
        { allowOfflineQueue: false }
      );
      return generated.labels;
    },
    onSuccess: (rows) => {
      setLabels(rows);
      setOverlay({ open: true, mode: "PASS", title: "LABEL PASS", description: `Generated ${rows.length} labels` });
    },
    onError: (err) => {
      setOverlay({
        open: true,
        mode: "NG",
        title: "LABEL NG",
        description: formatStationError(err, "Label generation failed"),
      });
    },
  });

  const canGenerate = assyId.trim() && checked.component && checked.qty && checked.layout;

  if (heartbeatQuery.isLoading) return <LoadingSkeleton label="Preparing label station..." />;
  if (heartbeatQuery.error)
    return <ErrorState title="Label station offline" description="Device is not registered or token is invalid." />;
  if (heartbeatQuery.data?.status === "disabled")
    return <ErrorState title="Device Disabled" description="This station is disabled by admin." />;

  return (
    <PageStack>
      <PageHeader title="Label Station" description="Generate and confirm tray labels before packing." />
      <StationHeader
        stationName={heartbeatQuery.data?.station?.name || "Unassigned"}
        processName={heartbeatQuery.data?.process?.name || "Unassigned"}
        deviceStatus={heartbeatQuery.data?.status || "active"}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle>Label Generation</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4">
            <ScanInput
              value={assyId}
              onChange={setAssyId}
              onSubmit={() => generateMutation.mutate(assyId.trim())}
              placeholder="Scan ASSY ID"
            />
            <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-foreground">Checklist</p>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={Boolean(checked.component)}
                  onCheckedChange={(v) => setChecked((prev) => ({ ...prev, component: Boolean(v) }))}
                />
                <Label className="cursor-pointer">Components validated</Label>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={Boolean(checked.qty)}
                  onCheckedChange={(v) => setChecked((prev) => ({ ...prev, qty: Boolean(v) }))}
                />
                <Label className="cursor-pointer">Quantity verified (6 trays)</Label>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={Boolean(checked.layout)}
                  onCheckedChange={(v) => setChecked((prev) => ({ ...prev, layout: Boolean(v) }))}
                />
                <Label className="cursor-pointer">Label layout confirmed</Label>
              </label>
            </div>
            <Button
              onClick={() => generateMutation.mutate(assyId.trim())}
              disabled={!canGenerate || generateMutation.isPending}
            >
              {generateMutation.isPending ? "Generating..." : "Generate Labels"}
            </Button>
            {labels.length > 0 && (
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Tray</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Serial</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labels.map((label) => (
                      <tr key={label.tray_id} className="border-b border-border last:border-b-0 hover:bg-accent/50">
                        <td className="px-4 py-3 font-mono text-xs text-foreground">{label.tray_id}</td>
                        <td className="px-4 py-3 text-foreground">{label.serial}</td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground">{label.payload}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle>Station Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-2 text-sm">
            <p>
              Device status: <StatusBadge status={heartbeatQuery.data?.status || "active"} />
            </p>
            <p>Station: {heartbeatQuery.data?.station?.name || "Unassigned"}</p>
            <p>Process: {heartbeatQuery.data?.process?.name || "Unassigned"}</p>
            <p>Labels generated: {labels.length}</p>
          </CardContent>
        </Card>
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
