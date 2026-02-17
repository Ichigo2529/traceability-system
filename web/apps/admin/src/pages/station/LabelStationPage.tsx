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

      await publishEvent({
        event_id: genEventId(),
        event_type: "LABEL_GENERATE_REQUEST",
        unit_id: targetAssyId,
        payload: { assy_id: targetAssyId },
        created_at_device: new Date().toISOString(),
      }, { allowOfflineQueue: false });

      const generated = await sdk.event.generateLabels(targetAssyId);

      await publishEvent({
        event_id: genEventId(),
        event_type: "LABELS_GENERATED",
        unit_id: targetAssyId,
        payload: { assy_id: targetAssyId, label_count: generated.labels.length },
        created_at_device: new Date().toISOString(),
      }, { allowOfflineQueue: false });
      return generated.labels;
    },
    onSuccess: (rows) => {
      setLabels(rows);
      setOverlay({ open: true, mode: "PASS", title: "LABEL PASS", description: `Generated ${rows.length} labels` });
    },
    onError: (err) => {
      setOverlay({ open: true, mode: "NG", title: "LABEL NG", description: formatStationError(err, "Label generation failed") });
    },
  });

  const canGenerate = assyId.trim() && checked.component && checked.qty && checked.layout;

  if (heartbeatQuery.isLoading) return <LoadingSkeleton label="Preparing label station..." />;
  if (heartbeatQuery.error) return <ErrorState title="Label station offline" description="Device is not registered or token is invalid." />;
  if (heartbeatQuery.data?.status === "disabled") return <ErrorState title="Device Disabled" description="This station is disabled by admin." />;

  return (
    <PageStack>
      <PageHeader title="Label Station" description="Generate and confirm tray labels before packing." />
      <StationHeader
        stationName={heartbeatQuery.data?.station?.name || "Unassigned"}
        processName={heartbeatQuery.data?.process?.name || "Unassigned"}
        deviceStatus={heartbeatQuery.data?.status || "active"}
      />
      <div className="admin-label-layout">
        <Card className="admin-label-main-card">
          <CardHeader>
            <CardTitle>Label Generation</CardTitle>
          </CardHeader>
          <CardContent className="admin-label-content">
            <ScanInput value={assyId} onChange={setAssyId} onSubmit={() => generateMutation.mutate(assyId.trim())} placeholder="Scan ASSY ID" />
            <div className="admin-label-checklist">
              <p className="admin-label-checklist-title">Checklist</p>
              <label className="admin-label-checklist-row">
                <Checkbox checked={Boolean(checked.component)} onCheckedChange={(v) => setChecked((prev) => ({ ...prev, component: Boolean(v) }))} />
                Components validated
              </label>
              <label className="admin-label-checklist-row">
                <Checkbox checked={Boolean(checked.qty)} onCheckedChange={(v) => setChecked((prev) => ({ ...prev, qty: Boolean(v) }))} />
                Quantity verified (6 trays)
              </label>
              <label className="admin-label-checklist-row">
                <Checkbox checked={Boolean(checked.layout)} onCheckedChange={(v) => setChecked((prev) => ({ ...prev, layout: Boolean(v) }))} />
                Label layout confirmed
              </label>
            </div>
            <Button onClick={() => generateMutation.mutate(assyId.trim())} disabled={!canGenerate || generateMutation.isPending}>
              {generateMutation.isPending ? "Generating..." : "Generate Labels"}
            </Button>
            {labels.length ? (
              <div className="admin-label-table-shell">
                <table className="admin-label-table">
                  <thead className="admin-label-table-head">
                    <tr>
                      <th className="admin-label-th">Tray</th>
                      <th className="admin-label-th">Serial</th>
                      <th className="admin-label-th">Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labels.map((label) => (
                      <tr key={label.tray_id} className="admin-label-row">
                        <td className="admin-label-td admin-label-td--mono">{label.tray_id}</td>
                        <td className="admin-label-td">{label.serial}</td>
                        <td className="admin-label-td admin-label-td--mono">{label.payload}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Station Summary</CardTitle>
          </CardHeader>
          <CardContent className="admin-label-summary-content">
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
