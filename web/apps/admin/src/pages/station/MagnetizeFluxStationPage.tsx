import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";

import { StationHeader } from "../../components/shared/StationHeader";
import { FullscreenResultOverlay } from "../../components/shared/FullscreenResultOverlay";
import { ScanInput } from "../../components/shared/ScanInput";
import { ErrorState, LoadingSkeleton } from "../../components/shared/States";
import { StatusBadge } from "../../components/shared/StatusBadge";

import { useStationEvent } from "../../hooks/useStationEvent";
import { formatStationError } from "../../lib/station-errors";
import { PageStack } from "@traceability/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function genEventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function MagnetizeFluxStationPage() {
  const navigate = useNavigate();
  const { publishEvent } = useStationEvent();
  const [assyId, setAssyId] = useState("");
  const [overlay, setOverlay] = useState<{ open: boolean; mode: "PASS" | "NG"; title: string; description?: string }>({
    open: false,
    mode: "PASS",
    title: "",
  });

  const heartbeatQuery = useQuery({
    queryKey: ["magnetize-heartbeat"],
    queryFn: () => sdk.device.heartbeat(),
    retry: false,
  });

  useEffect(() => {
    if (!heartbeatQuery.error) return;
    const err = heartbeatQuery.error as { code?: string };
    if (err.code === "DEVICE_NOT_REGISTERED") navigate("/station/register", { replace: true });
  }, [heartbeatQuery.error, navigate]);

  const mutation = useMutation({
    mutationFn: async (eventType: "MAGNETIZE_DONE" | "FLUX_PASS" | "FLUX_FAIL") =>
      publishEvent({
        event_id: genEventId(),
        event_type: eventType,
        unit_id: assyId,
        payload: { assy_id: assyId },
        created_at_device: new Date().toISOString(),
      }),
    onSuccess: (result, eventType) => {
      setOverlay({
        open: true,
        mode: eventType === "FLUX_FAIL" ? "NG" : "PASS",
        title: eventType,
        description: result.queued ? "Event queued offline" : "Event accepted",
      });
    },
    onError: (err) => {
      setOverlay({ open: true, mode: "NG", title: "NG", description: formatStationError(err, "Event rejected") });
    },
  });

  if (heartbeatQuery.isLoading) return <LoadingSkeleton label="Preparing magnetize/flux station..." />;
  if (heartbeatQuery.error)
    return (
      <ErrorState title="Magnetize/Flux station offline" description="Device is not registered or token is invalid." />
    );
  if (heartbeatQuery.data?.status === "disabled")
    return <ErrorState title="Device Disabled" description="This station is disabled by admin." />;

  return (
    <PageStack>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Magnetize / Flux Station</h1>
          <p className="text-sm text-muted-foreground">Transition ASSY through magnetize and flux decision.</p>
        </div>
      </div>
      <StationHeader
        stationName={heartbeatQuery.data?.station?.name || "Unassigned"}
        processName={heartbeatQuery.data?.process?.name || "Unassigned"}
        deviceStatus={heartbeatQuery.data?.status || "active"}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle>Flux Decision</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4">
            <ScanInput
              value={assyId}
              onChange={setAssyId}
              onSubmit={() => mutation.mutate("MAGNETIZE_DONE")}
              placeholder="Scan ASSY ID"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => mutation.mutate("MAGNETIZE_DONE")} disabled={!assyId.trim() || mutation.isPending}>
                MAGNETIZE_DONE
              </Button>
              <Button
                variant="secondary"
                onClick={() => mutation.mutate("FLUX_PASS")}
                disabled={!assyId.trim() || mutation.isPending}
              >
                FLUX_PASS
              </Button>
              <Button
                variant="destructive"
                onClick={() => mutation.mutate("FLUX_FAIL")}
                disabled={!assyId.trim() || mutation.isPending}
              >
                FLUX_FAIL (HOLD)
              </Button>
            </div>
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
