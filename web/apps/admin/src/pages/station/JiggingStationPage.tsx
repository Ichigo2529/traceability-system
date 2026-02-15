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
import { Button } from "../../components/ui/button";
import { useStationEvent } from "../../hooks/useStationEvent";
import { formatStationError } from "../../lib/station-errors";

function genEventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function JiggingStationPage() {
  const navigate = useNavigate();
  const { publishEvent } = useStationEvent();
  const [dispatchCode, setDispatchCode] = useState("");
  const [dispatchId, setDispatchId] = useState("");
  const [plateId, setPlateId] = useState("");
  const [jigType, setJigType] = useState("PIN430_JIG");
  const [jigId, setJigId] = useState("");
  const [overlay, setOverlay] = useState<{ open: boolean; mode: "PASS" | "NG"; title: string; description?: string }>({
    open: false,
    mode: "PASS",
    title: "",
  });

  const heartbeatQuery = useQuery({
    queryKey: ["jigging-heartbeat"],
    queryFn: () => sdk.device.heartbeat(),
    retry: false,
  });

  useEffect(() => {
    if (!heartbeatQuery.error) return;
    const err = heartbeatQuery.error as { code?: string };
    if (err.code === "DEVICE_NOT_REGISTERED") {
      navigate("/station/register", { replace: true });
    }
  }, [heartbeatQuery.error, navigate]);

  const mutation = useMutation({
    mutationFn: async (args: { eventType: string; payload: Record<string, unknown>; unitId?: string }) =>
      publishEvent({
        event_id: genEventId(),
        event_type: args.eventType,
        unit_id: args.unitId,
        payload: args.payload,
        created_at_device: new Date().toISOString(),
      }),
    onSuccess: (result, vars) => {
      const data = result.queued ? ({} as Record<string, unknown>) : ((result.data ?? {}) as Record<string, unknown>);
      const receivedDispatchId = (data.dispatch_id as string) || "";
      const receivedPlateId = (data.plate_id as string) || "";
      const receivedJigId = (data.jig_id as string) || "";
      if (receivedDispatchId) setDispatchId(receivedDispatchId);
      if (receivedPlateId) setPlateId(receivedPlateId);
      if (receivedJigId) setJigId(receivedJigId);
      setOverlay({
        open: true,
        mode: "PASS",
        title: "PASS",
        description: result.queued ? `${vars.eventType} queued offline` : `${vars.eventType} accepted`,
      });
    },
    onError: (err) => {
      setOverlay({ open: true, mode: "NG", title: "NG", description: formatStationError(err, "Event rejected") });
    },
  });

  if (heartbeatQuery.isLoading) return <LoadingSkeleton label="Preparing jigging station..." />;
  if (heartbeatQuery.error) return <ErrorState title="Jigging station offline" description="Device is not registered or token is invalid." />;
  if (heartbeatQuery.data?.status === "disabled") return <ErrorState title="Device Disabled" description="This station is disabled by admin." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Jigging / Wash Station" description="Dispatch, plate wash, and jig lifecycle events." />
      <StationHeader
        stationName={heartbeatQuery.data?.station?.name || "Unassigned"}
        processName={heartbeatQuery.data?.process?.name || "Unassigned"}
        deviceStatus={heartbeatQuery.data?.status || "active"}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-2">
              <p className="text-sm font-medium">Dispatch</p>
              <ScanInput value={dispatchCode} onChange={setDispatchCode} onSubmit={() => mutation.mutate({ eventType: "DISPATCH_CREATED", payload: { dispatch_code: dispatchCode } })} placeholder="Dispatch code" />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => mutation.mutate({ eventType: "DISPATCH_CREATED", payload: { dispatch_code: dispatchCode } })} disabled={!dispatchCode.trim() || mutation.isPending}>
                  DISPATCH_CREATED
                </Button>
                <Button variant="outline" onClick={() => mutation.mutate({ eventType: "DISPATCH_CONFIRMED", payload: { dispatch_id: dispatchId } })} disabled={!dispatchId.trim() || mutation.isPending}>
                  DISPATCH_CONFIRMED
                </Button>
                <Button variant="outline" onClick={() => mutation.mutate({ eventType: "DISPATCH_RETURNED", payload: { dispatch_id: dispatchId } })} disabled={!dispatchId.trim() || mutation.isPending}>
                  DISPATCH_RETURNED
                </Button>
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-sm font-medium">Plate Wash1</p>
              <ScanInput value={plateId} onChange={setPlateId} onSubmit={() => mutation.mutate({ eventType: "PLATE_LOADED", payload: {} })} placeholder="Plate ID" />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => mutation.mutate({ eventType: "PLATE_LOADED", payload: {} })} disabled={mutation.isPending}>
                  PLATE_LOADED
                </Button>
                <Button variant="outline" onClick={() => mutation.mutate({ eventType: "WASH1_START", payload: { plate_id: plateId }, unitId: plateId })} disabled={!plateId.trim() || mutation.isPending}>
                  WASH1_START
                </Button>
                <Button variant="outline" onClick={() => mutation.mutate({ eventType: "WASH1_END", payload: { plate_id: plateId }, unitId: plateId })} disabled={!plateId.trim() || mutation.isPending}>
                  WASH1_END
                </Button>
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-sm font-medium">Jig Wash2</p>
              <div className="flex gap-2">
                <select className="h-10 rounded-md border px-3 text-sm" value={jigType} onChange={(e) => setJigType(e.target.value)}>
                  <option value="PIN430_JIG">PIN430_JIG</option>
                  <option value="PIN300_JIG">PIN300_JIG</option>
                  <option value="SHROUD_JIG">SHROUD_JIG</option>
                  <option value="CRASH_STOP_JIG">CRASH_STOP_JIG</option>
                </select>
                <ScanInput value={jigId} onChange={setJigId} onSubmit={() => mutation.mutate({ eventType: "JIG_LOADED", payload: { jig_type: jigType, qty_total: 120 } })} placeholder="Jig ID" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => mutation.mutate({ eventType: "JIG_LOADED", payload: { jig_type: jigType, qty_total: 120 } })} disabled={mutation.isPending}>
                  JIG_LOADED
                </Button>
                <Button variant="outline" onClick={() => mutation.mutate({ eventType: "WASH2_START", payload: { jig_id: jigId }, unitId: jigId })} disabled={!jigId.trim() || mutation.isPending}>
                  WASH2_START
                </Button>
                <Button variant="outline" onClick={() => mutation.mutate({ eventType: "WASH2_END", payload: { jig_id: jigId }, unitId: jigId })} disabled={!jigId.trim() || mutation.isPending}>
                  WASH2_END
                </Button>
                <Button variant="outline" onClick={() => mutation.mutate({ eventType: "JIG_RETURNED", payload: { jig_id: jigId }, unitId: jigId })} disabled={!jigId.trim() || mutation.isPending}>
                  JIG_RETURNED
                </Button>
              </div>
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Station Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Device status: <StatusBadge status={heartbeatQuery.data?.status || "active"} />
            </p>
            <p>Station: {heartbeatQuery.data?.station?.name || "Unassigned"}</p>
            <p>Process: {heartbeatQuery.data?.process?.name || "Unassigned"}</p>
            <p className="text-muted-foreground">Use IDs returned from each PASS step for next operation.</p>
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
    </div>
  );
}
