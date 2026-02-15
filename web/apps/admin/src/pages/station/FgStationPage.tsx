import { useEffect, useRef, useState } from "react";
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

export function FgStationPage() {
  const navigate = useNavigate();
  const { publishEvent } = useStationEvent();
  const outerRef = useRef<HTMLInputElement>(null);
  const [outerCode, setOuterCode] = useState("");
  const [outerList, setOuterList] = useState<string[]>([]);
  const [overlay, setOverlay] = useState<{ open: boolean; mode: "PASS" | "NG"; title: string; description?: string }>({
    open: false,
    mode: "PASS",
    title: "",
  });

  const heartbeatQuery = useQuery({
    queryKey: ["fg-heartbeat"],
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

  const mapMutation = useMutation({
    mutationFn: async (ids: string[]) =>
      publishEvent({
        event_id: genEventId(),
        event_type: "FG_PALLET_MAPPED",
        payload: { outer_ids: ids },
        created_at_device: new Date().toISOString(),
      }),
    onSuccess: (result) => {
      setOverlay({
        open: true,
        mode: "PASS",
        title: "PALLET PASS",
        description: result.queued ? "Pallet mapping queued offline." : "Outers mapped to pallet successfully.",
      });
      setOuterList([]);
      setOuterCode("");
      outerRef.current?.focus();
    },
    onError: (err) => {
      setOverlay({ open: true, mode: "NG", title: "PALLET NG", description: formatStationError(err, "Validation failed") });
    },
  });

  const addOuter = () => {
    const value = outerCode.trim();
    if (!value) return;
    if (outerList.includes(value)) {
      setOverlay({ open: true, mode: "NG", title: "Duplicate Outer", description: "Outer already in this pallet draft." });
      return;
    }
    setOuterList((prev) => [value, ...prev].slice(0, 40));
    setOuterCode("");
    outerRef.current?.focus();
  };

  if (heartbeatQuery.isLoading) return <LoadingSkeleton label="Preparing FG station..." />;
  if (heartbeatQuery.error) return <ErrorState title="FG station offline" description="Device is not registered or token is invalid." />;
  if (heartbeatQuery.data?.status === "disabled") return <ErrorState title="Device Disabled" description="This station is disabled by admin." />;

  return (
    <div className="space-y-6">
      <PageHeader title="FG / Shipping Station" description="Scan outer cartons and map to pallet." />
      <StationHeader
        stationName={heartbeatQuery.data?.station?.name || "Unassigned"}
        processName={heartbeatQuery.data?.process?.name || "Unassigned"}
        deviceStatus={heartbeatQuery.data?.status || "active"}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Pallet Mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScanInput ref={outerRef} value={outerCode} onChange={setOuterCode} onSubmit={addOuter} placeholder="Scan OUTER code" />
            <div className="flex gap-2">
              <Button onClick={addOuter} disabled={!outerCode.trim()}>
                Add Outer
              </Button>
              <Button variant="outline" onClick={() => setOuterList([])} disabled={!outerList.length}>
                Clear
              </Button>
              <Button onClick={() => mapMutation.mutate(outerList)} disabled={mapMutation.isPending || outerList.length === 0}>
                {mapMutation.isPending ? "Mapping..." : "Map to Pallet"}
              </Button>
            </div>
            <div className="max-h-72 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Outer Code</th>
                  </tr>
                </thead>
                <tbody>
                  {outerList.map((code, idx) => (
                    <tr key={code} className="border-t">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs">{code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Device status: <StatusBadge status={heartbeatQuery.data?.status || "active"} />
            </p>
            <p>Station: {heartbeatQuery.data?.station?.name || "Unassigned"}</p>
            <p>Process: {heartbeatQuery.data?.process?.name || "Unassigned"}</p>
            <p>Mapped outers (draft): {outerList.length}</p>
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
