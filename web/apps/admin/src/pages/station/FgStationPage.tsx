import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";

import { StationHeader } from "../../components/shared/StationHeader";
import { StationActionBar, StationActionButton } from "../../components/shared/StationActionBar";
import { FullscreenResultOverlay } from "../../components/shared/FullscreenResultOverlay";
import { StationResultFeedback, type StationResultFeedbackState } from "../../components/shared/StationResultFeedback";
import { ScanInput } from "../../components/shared/ScanInput";
import { ErrorState, LoadingSkeleton } from "../../components/shared/States";
import { StatusBadge } from "../../components/shared/StatusBadge";

import { useStationEvent } from "../../hooks/useStationEvent";
import { formatStationError } from "../../lib/station-errors";
import { PageStack } from "@traceability/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [latestResult, setLatestResult] = useState<StationResultFeedbackState | null>(null);
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
      const nextResult = {
        mode: "PASS" as const,
        title: result.queued ? "Queued Offline" : "Pallet Ready",
        description: result.queued
          ? "Pallet mapping was queued for sync."
          : "Outers were mapped to the pallet successfully.",
      };
      setLatestResult(nextResult);
      setOverlay({ open: true, ...nextResult });
      setOuterList([]);
      setOuterCode("");
      outerRef.current?.focus();
    },
    onError: (err) => {
      const nextResult = {
        mode: "NG" as const,
        title: "Pallet Mapping Failed",
        description: formatStationError(err, "Validation failed"),
      };
      setLatestResult(nextResult);
      setOverlay({ open: true, ...nextResult });
    },
  });

  const addOuter = () => {
    const value = outerCode.trim();
    if (!value) return;
    if (outerList.includes(value)) {
      const nextResult = {
        mode: "NG" as const,
        title: "Duplicate Outer",
        description: "This outer is already in the current pallet draft.",
      };
      setLatestResult(nextResult);
      setOverlay({ open: true, ...nextResult });
      return;
    }
    setOuterList((prev) => [value, ...prev].slice(0, 40));
    setOuterCode("");
    setLatestResult({
      mode: "PASS",
      title: "Outer Added",
      description: `${value} added to the pallet draft.`,
    });
    outerRef.current?.focus();
  };

  if (heartbeatQuery.isLoading) return <LoadingSkeleton label="Preparing FG station..." />;
  if (heartbeatQuery.error)
    return <ErrorState title="FG station offline" description="Device is not registered or token is invalid." />;
  if (heartbeatQuery.data?.status === "disabled")
    return <ErrorState title="Device Disabled" description="This station is disabled by admin." />;

  return (
    <PageStack>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">FG / Shipping Station</h1>
          <p className="text-sm text-muted-foreground">Scan outer cartons and map to pallet.</p>
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
            <CardTitle>Pallet Mapping</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-3">
            <StationResultFeedback result={latestResult} />
            <ScanInput
              ref={outerRef}
              name="fg-outer-code"
              ariaLabel="Outer code"
              value={outerCode}
              onChange={setOuterCode}
              onSubmit={addOuter}
              placeholder="Scan OUTER code"
            />
            <StationActionBar>
              <StationActionButton onClick={addOuter} disabled={!outerCode.trim()}>
                Add Outer
              </StationActionButton>
              <StationActionButton variant="secondary" onClick={() => setOuterList([])} disabled={!outerList.length}>
                Clear
              </StationActionButton>
              <StationActionButton
                onClick={() => mapMutation.mutate(outerList)}
                disabled={mapMutation.isPending || outerList.length === 0}
              >
                {mapMutation.isPending ? "Mapping…" : "Map to Pallet"}
              </StationActionButton>
            </StationActionBar>
            <div className="max-h-72 overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="px-3 py-2 text-left font-semibold text-foreground">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-foreground">Outer Code</th>
                  </tr>
                </thead>
                <tbody>
                  {outerList.map((code, idx) => (
                    <tr key={code} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 text-foreground">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs text-foreground">{code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-2 text-sm">
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
    </PageStack>
  );
}
