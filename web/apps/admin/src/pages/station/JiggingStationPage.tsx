import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";
import { StationHeader } from "../../components/shared/StationHeader";
import { FullscreenResultOverlay } from "../../components/shared/FullscreenResultOverlay";
import { ScanInput } from "../../components/shared/ScanInput";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { useStationEvent } from "../../hooks/useStationEvent";
import { formatStationError } from "../../lib/station-errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Undo2, Play, Square } from "lucide-react";

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

  if (heartbeatQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
        <span className="ml-2 text-sm text-muted-foreground">Preparing jigging station...</span>
      </div>
    );
  }

  if (heartbeatQuery.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-muted-foreground">Station unavailable. Please verify connectivity.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-xl font-semibold">Jigging / Wash Station</h2>
        <StatusBadge status={heartbeatQuery.data?.status || "active"} />
      </header>

      <div className="p-4 w-full box-border flex-1">
        <StationHeader
          stationName={heartbeatQuery.data?.station?.name}
          processName={heartbeatQuery.data?.process?.name}
          deviceStatus={heartbeatQuery.data?.status}
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mt-4 w-full">
          <div className="xl:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle>Operations</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <Label className="font-bold">Dispatch</Label>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <ScanInput
                        value={dispatchCode}
                        onChange={setDispatchCode}
                        onSubmit={() =>
                          mutation.mutate({ eventType: "DISPATCH_CREATED", payload: { dispatch_code: dispatchCode } })
                        }
                        placeholder="Dispatch code"
                      />
                    </div>
                    <Button
                      onClick={() =>
                        mutation.mutate({ eventType: "DISPATCH_CREATED", payload: { dispatch_code: dispatchCode } })
                      }
                      disabled={!dispatchCode.trim() || mutation.isPending}
                    >
                      CREATE
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        mutation.mutate({ eventType: "DISPATCH_CONFIRMED", payload: { dispatch_id: dispatchId } })
                      }
                      disabled={!dispatchId.trim() || mutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      CONFIRMED
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        mutation.mutate({ eventType: "DISPATCH_RETURNED", payload: { dispatch_id: dispatchId } })
                      }
                      disabled={!dispatchId.trim() || mutation.isPending}
                    >
                      <Undo2 className="h-4 w-4 mr-1" />
                      RETURNED
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <Label className="font-bold">Plate Wash1</Label>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <ScanInput
                        value={plateId}
                        onChange={setPlateId}
                        onSubmit={() => mutation.mutate({ eventType: "PLATE_LOADED", payload: {} })}
                        placeholder="Plate ID"
                      />
                    </div>
                    <Button
                      onClick={() => mutation.mutate({ eventType: "PLATE_LOADED", payload: {} })}
                      disabled={mutation.isPending}
                    >
                      LOAD
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        mutation.mutate({ eventType: "WASH1_START", payload: { plate_id: plateId }, unitId: plateId })
                      }
                      disabled={!plateId.trim() || mutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      WASH1 START
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        mutation.mutate({ eventType: "WASH1_END", payload: { plate_id: plateId }, unitId: plateId })
                      }
                      disabled={!plateId.trim() || mutation.isPending}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      WASH1 END
                    </Button>
                  </div>
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
                        value={jigId}
                        onChange={setJigId}
                        onSubmit={() =>
                          mutation.mutate({ eventType: "JIG_LOADED", payload: { jig_type: jigType, qty_total: 120 } })
                        }
                        placeholder="Jig ID"
                      />
                    </div>
                    <Button
                      onClick={() =>
                        mutation.mutate({ eventType: "JIG_LOADED", payload: { jig_type: jigType, qty_total: 120 } })
                      }
                      disabled={mutation.isPending}
                    >
                      LOAD
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        mutation.mutate({ eventType: "WASH2_START", payload: { jig_id: jigId }, unitId: jigId })
                      }
                      disabled={!jigId.trim() || mutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      WASH2 START
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        mutation.mutate({ eventType: "WASH2_END", payload: { jig_id: jigId }, unitId: jigId })
                      }
                      disabled={!jigId.trim() || mutation.isPending}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      WASH2 END
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        mutation.mutate({ eventType: "JIG_RETURNED", payload: { jig_id: jigId }, unitId: jigId })
                      }
                      disabled={!jigId.trim() || mutation.isPending}
                    >
                      <Undo2 className="h-4 w-4 mr-1" />
                      RETURNED
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <Label>Dispatch ID:</Label>
                  <span className="font-semibold">{dispatchId || "-"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Plate ID:</Label>
                  <span className="font-semibold">{plateId || "-"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Jig ID:</Label>
                  <span className="font-semibold">{jigId || "-"}</span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Use IDs returned from each PASS step for next operation.
                </p>
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
