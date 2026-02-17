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

function genEventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function BondingStationPage() {
  const navigate = useNavigate();
  const { publishEvent } = useStationEvent();
  const [plateId, setPlateId] = useState("");
  const [magnetPackId, setMagnetPackId] = useState("");
  const [assyId, setAssyId] = useState("");
  const [overlay, setOverlay] = useState<{ open: boolean; mode: "PASS" | "NG"; title: string; description?: string }>({
    open: false,
    mode: "PASS",
    title: "",
  });

  const heartbeatQuery = useQuery({
    queryKey: ["bonding-heartbeat"],
    queryFn: () => sdk.device.heartbeat(),
    retry: false,
  });

  useEffect(() => {
    if (!heartbeatQuery.error) return;
    const err = heartbeatQuery.error as { code?: string };
    if (err.code === "DEVICE_NOT_REGISTERED") navigate("/station/register", { replace: true });
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
      const res = result.queued ? ({} as Record<string, unknown>) : ((result.data ?? {}) as Record<string, unknown>);
      const createdAssy = (res.assy_id as string) || "";
      if (createdAssy) setAssyId(createdAssy);
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

  if (heartbeatQuery.isLoading) return <LoadingSkeleton label="Preparing bonding station..." />;
  if (heartbeatQuery.error) return <ErrorState title="Bonding station offline" description="Device is not registered or token is invalid." />;
  if (heartbeatQuery.data?.status === "disabled") return <ErrorState title="Device Disabled" description="This station is disabled by admin." />;

  return (
    <PageStack>
      <div className="admin-toolbar">
        <div>
          <h1 className="admin-page-title">Bonding Station</h1>
          <p className="text-sm text-gray-500">Validate plate/magnet and create ASSY_120 by bonding.</p>
        </div>
      </div>
      <StationHeader
        stationName={heartbeatQuery.data?.station?.name || "Unassigned"}
        processName={heartbeatQuery.data?.process?.name || "Unassigned"}
        deviceStatus={heartbeatQuery.data?.status || "active"}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 admin-card">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-medium">Bonding Flow</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="admin-stack-2">
              <p className="text-sm font-medium">Plate</p>
              <ScanInput value={plateId} onChange={setPlateId} onSubmit={() => mutation.mutate({ eventType: "BONDING_PLATE_SCANNED", payload: { plate_id: plateId }, unitId: plateId })} placeholder="Scan plate ID" />
            </div>
            <div className="admin-stack-2">
              <p className="text-sm font-medium">Magnet Pack</p>
              <ScanInput value={magnetPackId} onChange={setMagnetPackId} onSubmit={() => mutation.mutate({ eventType: "BONDING_MAGNET_SCANNED", payload: { magnet_pack_id: magnetPackId }, unitId: magnetPackId })} placeholder="Scan magnet pack ID" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="admin-button is-primary"
                onClick={() => mutation.mutate({ eventType: "BONDING_PLATE_SCANNED", payload: { plate_id: plateId }, unitId: plateId })}
                disabled={!plateId.trim() || mutation.isPending}
              >
                BONDING_PLATE_SCANNED
              </button>
              <button
                className="admin-button is-secondary"
                onClick={() => mutation.mutate({ eventType: "BONDING_MAGNET_SCANNED", payload: { magnet_pack_id: magnetPackId }, unitId: magnetPackId })}
                disabled={!magnetPackId.trim() || mutation.isPending}
              >
                BONDING_MAGNET_SCANNED
              </button>
              <button
                className="admin-button is-secondary"
                onClick={() => mutation.mutate({ eventType: "BONDING_START", payload: { plate_id: plateId, magnet_pack_id: magnetPackId } })}
                disabled={!plateId.trim() || !magnetPackId.trim() || mutation.isPending}
              >
                BONDING_START
              </button>
              <button
                className="admin-button is-primary"
                onClick={() => mutation.mutate({ eventType: "BONDING_END", payload: { plate_id: plateId, magnet_pack_id: magnetPackId } })}
                disabled={!plateId.trim() || !magnetPackId.trim() || mutation.isPending}
              >
                BONDING_END
              </button>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-medium">Station Summary</h3>
          </div>
          <div className="p-4 admin-stack-2 text-sm">
            <p>
              Device status: <StatusBadge status={heartbeatQuery.data?.status || "active"} />
            </p>
            <p>Station: {heartbeatQuery.data?.station?.name || "Unassigned"}</p>
            <p>Process: {heartbeatQuery.data?.process?.name || "Unassigned"}</p>
            <p>Latest ASSY ID: {assyId ? <span className="font-mono text-xs">{assyId}</span> : "-"}</p>
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
    </PageStack>
  );
}
