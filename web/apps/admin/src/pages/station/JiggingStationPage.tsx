import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { StationActionBar, StationActionButton } from "../../components/shared/StationActionBar";
import { StationHeader } from "../../components/shared/StationHeader";
import { FullscreenResultOverlay } from "../../components/shared/FullscreenResultOverlay";
import { StationResultFeedback, type StationResultFeedbackState } from "../../components/shared/StationResultFeedback";
import { ScanInput } from "../../components/shared/ScanInput";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { useStationEvent } from "../../hooks/useStationEvent";
import { formatStationError } from "../../lib/station-errors";
import { ErrorState, LoadingSkeleton } from "../../components/shared/States";
import { PageStack } from "@traceability/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Undo2, Play, Square } from "lucide-react";

function genEventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const JIGGING_ACTION_LABELS = {
  DISPATCH_CREATED: "Create Dispatch",
  DISPATCH_CONFIRMED: "Confirm Dispatch",
  DISPATCH_RETURNED: "Return Dispatch",
  PLATE_LOADED: "Load Plate",
  WASH1_START: "Start Wash 1",
  WASH1_END: "Complete Wash 1",
  JIG_LOADED: "Load Jig",
  WASH2_START: "Start Wash 2",
  WASH2_END: "Complete Wash 2",
  JIG_RETURNED: "Return Jig",
} as const;

export function JiggingStationPage() {
  const navigate = useNavigate();
  const { publishEvent } = useStationEvent();
  const [dispatchCode, setDispatchCode] = useState("");
  const [dispatchId, setDispatchId] = useState("");
  const [plateId, setPlateId] = useState("");
  const [jigType, setJigType] = useState("PIN430_JIG");
  const [jigId, setJigId] = useState("");
  const [latestResult, setLatestResult] = useState<StationResultFeedbackState | null>(null);
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
      const nextResult = {
        mode: "PASS" as const,
        title: result.queued ? "Queued Offline" : "Accepted",
        description: `${JIGGING_ACTION_LABELS[vars.eventType as keyof typeof JIGGING_ACTION_LABELS] ?? "Station action"} ${
          result.queued ? "was queued for sync." : "was accepted."
        }`,
      };
      setLatestResult(nextResult);
      setOverlay({ open: true, ...nextResult });
    },
    onError: (err) => {
      const nextResult = {
        mode: "NG" as const,
        title: "Action Rejected",
        description: formatStationError(err, "Event rejected"),
      };
      setLatestResult(nextResult);
      setOverlay({ open: true, ...nextResult });
    },
  });

  if (heartbeatQuery.isLoading) return <LoadingSkeleton label="Preparing jigging station..." />;
  if (heartbeatQuery.error) return <ErrorState title="Station Unavailable" description="Please verify connectivity." />;
  if (heartbeatQuery.data?.status === "disabled")
    return <ErrorState title="Device Disabled" description="This station is disabled by admin." />;

  return (
    <PageStack>
      <PageHeader
        title="Jigging / Wash Station"
        description="Create dispatches, load workpieces, and track wash steps."
      />
      <StationHeader
        stationName={heartbeatQuery.data?.station?.name || "Unassigned"}
        processName={heartbeatQuery.data?.process?.name || "Unassigned"}
        deviceStatus={heartbeatQuery.data?.status || "active"}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle>Operations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-8 pt-4">
            <StationResultFeedback result={latestResult} />
            <div className="flex flex-col gap-4">
              <Label className="font-bold">Dispatch</Label>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <ScanInput
                    name="jigging-dispatch-code"
                    ariaLabel="Dispatch code"
                    value={dispatchCode}
                    onChange={setDispatchCode}
                    onSubmit={() =>
                      mutation.mutate({ eventType: "DISPATCH_CREATED", payload: { dispatch_code: dispatchCode } })
                    }
                    placeholder="Dispatch code"
                  />
                </div>
                <StationActionButton
                  onClick={() =>
                    mutation.mutate({ eventType: "DISPATCH_CREATED", payload: { dispatch_code: dispatchCode } })
                  }
                  disabled={!dispatchCode.trim() || mutation.isPending}
                >
                  Create Dispatch
                </StationActionButton>
              </div>
              <StationActionBar>
                <StationActionButton
                  variant="ghost"
                  onClick={() =>
                    mutation.mutate({ eventType: "DISPATCH_CONFIRMED", payload: { dispatch_id: dispatchId } })
                  }
                  disabled={!dispatchId.trim() || mutation.isPending}
                >
                  <Check data-icon="inline-start" />
                  Confirm Dispatch
                </StationActionButton>
                <StationActionButton
                  variant="ghost"
                  onClick={() =>
                    mutation.mutate({ eventType: "DISPATCH_RETURNED", payload: { dispatch_id: dispatchId } })
                  }
                  disabled={!dispatchId.trim() || mutation.isPending}
                >
                  <Undo2 data-icon="inline-start" />
                  Return Dispatch
                </StationActionButton>
              </StationActionBar>
            </div>

            <div className="flex flex-col gap-4">
              <Label className="font-bold">Plate Wash1</Label>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <ScanInput
                    name="jigging-plate-id"
                    ariaLabel="Plate ID"
                    value={plateId}
                    onChange={setPlateId}
                    onSubmit={() => mutation.mutate({ eventType: "PLATE_LOADED", payload: {} })}
                    placeholder="Plate ID"
                  />
                </div>
                <StationActionButton
                  onClick={() => mutation.mutate({ eventType: "PLATE_LOADED", payload: {} })}
                  disabled={mutation.isPending}
                >
                  Load Plate
                </StationActionButton>
              </div>
              <StationActionBar>
                <StationActionButton
                  variant="ghost"
                  onClick={() =>
                    mutation.mutate({ eventType: "WASH1_START", payload: { plate_id: plateId }, unitId: plateId })
                  }
                  disabled={!plateId.trim() || mutation.isPending}
                >
                  <Play data-icon="inline-start" />
                  Start Wash 1
                </StationActionButton>
                <StationActionButton
                  variant="ghost"
                  onClick={() =>
                    mutation.mutate({ eventType: "WASH1_END", payload: { plate_id: plateId }, unitId: plateId })
                  }
                  disabled={!plateId.trim() || mutation.isPending}
                >
                  <Square data-icon="inline-start" />
                  Complete Wash 1
                </StationActionButton>
              </StationActionBar>
            </div>

            <div className="flex flex-col gap-4">
              <Label className="font-bold">Jig Wash2</Label>
              <div className="flex gap-4 items-center flex-wrap">
                <Select value={jigType} onValueChange={setJigType}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIN430_JIG">PIN430_JIG</SelectItem>
                    <SelectItem value="PIN300_JIG">PIN300_JIG</SelectItem>
                    <SelectItem value="SHROUD_JIG">SHROUD_JIG</SelectItem>
                    <SelectItem value="CRASH_STOP_JIG">CRASH_STOP_JIG</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1 min-w-[200px]">
                  <ScanInput
                    name="jigging-jig-id"
                    ariaLabel="Jig ID"
                    value={jigId}
                    onChange={setJigId}
                    onSubmit={() =>
                      mutation.mutate({ eventType: "JIG_LOADED", payload: { jig_type: jigType, qty_total: 120 } })
                    }
                    placeholder="Jig ID"
                  />
                </div>
                <StationActionButton
                  onClick={() =>
                    mutation.mutate({ eventType: "JIG_LOADED", payload: { jig_type: jigType, qty_total: 120 } })
                  }
                  disabled={mutation.isPending}
                >
                  Load Jig
                </StationActionButton>
              </div>
              <StationActionBar>
                <StationActionButton
                  variant="ghost"
                  onClick={() =>
                    mutation.mutate({ eventType: "WASH2_START", payload: { jig_id: jigId }, unitId: jigId })
                  }
                  disabled={!jigId.trim() || mutation.isPending}
                >
                  <Play data-icon="inline-start" />
                  Start Wash 2
                </StationActionButton>
                <StationActionButton
                  variant="ghost"
                  onClick={() => mutation.mutate({ eventType: "WASH2_END", payload: { jig_id: jigId }, unitId: jigId })}
                  disabled={!jigId.trim() || mutation.isPending}
                >
                  <Square data-icon="inline-start" />
                  Complete Wash 2
                </StationActionButton>
                <StationActionButton
                  variant="ghost"
                  onClick={() =>
                    mutation.mutate({ eventType: "JIG_RETURNED", payload: { jig_id: jigId }, unitId: jigId })
                  }
                  disabled={!jigId.trim() || mutation.isPending}
                >
                  <Undo2 data-icon="inline-start" />
                  Return Jig
                </StationActionButton>
              </StationActionBar>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4 text-sm">
            <p>
              Device status: <StatusBadge status={heartbeatQuery.data?.status || "active"} />
            </p>
            <p>Station: {heartbeatQuery.data?.station?.name || "Unassigned"}</p>
            <p>Process: {heartbeatQuery.data?.process?.name || "Unassigned"}</p>
            <div className="flex flex-col gap-1">
              <Label>Dispatch ID</Label>
              <span className="font-semibold">{dispatchId || "-"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Plate ID</Label>
              <span className="font-semibold">{plateId || "-"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Jig ID</Label>
              <span className="font-semibold">{jigId || "-"}</span>
            </div>
            <p className="text-muted-foreground">
              Use the IDs returned from each accepted step for the next operation.
            </p>
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
