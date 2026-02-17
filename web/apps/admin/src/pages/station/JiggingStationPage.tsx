import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";

import { StationHeader } from "../../components/shared/StationHeader";
import { FullscreenResultOverlay } from "../../components/shared/FullscreenResultOverlay";
import { ScanInput } from "../../components/shared/ScanInput";
import { 
    Page, 
    Bar, 
    Title, 
    Card, 
    CardHeader, 
    FlexBox, 
    FlexBoxDirection, 
    FlexBoxAlignItems, 
    Button, 
    Label, 
    Select, 
    Option,
    Grid,
    Text,
    BusyIndicator
} from "@ui5/webcomponents-react";
import { StatusBadge } from "../../components/shared/StatusBadge";

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

  if (heartbeatQuery.isLoading) return <BusyIndicator active text="Preparing jigging station..." />;
  if (heartbeatQuery.error) return <Text style={{ padding: "2rem" }}>Station unavailable. Please verify connectivity.</Text>;

  return (
    <Page
      backgroundDesign="List"
      header={
        <Bar
          startContent={<Title level="H2">Jigging / Wash Station</Title>}
          endContent={<StatusBadge status={heartbeatQuery.data?.status || "active"} />}
        />
      }
      style={{ height: "100%" }}
    >
      <div style={{ padding: "1rem", width: "100%", boxSizing: "border-box" }}>
        <StationHeader
            stationName={heartbeatQuery.data?.station?.name}
            processName={heartbeatQuery.data?.process?.name}
            deviceStatus={heartbeatQuery.data?.status}
        />

        <Grid defaultSpan="XL8 L8 M12 S12" vSpacing="1rem" hSpacing="1rem" style={{ marginTop: "1rem", width: "100%" }}>
            
            <div style={{ gridColumn: "span 8" }}>
                <Card header={<CardHeader titleText="Operations" />}>
                    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
                        
                        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem" }}>
                            <Label style={{ fontWeight: "bold" }}>Dispatch</Label>
                            <FlexBox style={{ gap: "1rem" }} alignItems={FlexBoxAlignItems.Center}>
                                <div style={{ flex: 1 }}>
                                    <ScanInput value={dispatchCode} onChange={setDispatchCode} onSubmit={() => mutation.mutate({ eventType: "DISPATCH_CREATED", payload: { dispatch_code: dispatchCode } })} placeholder="Dispatch code" />
                                </div>
                                <Button design="Emphasized" onClick={() => mutation.mutate({ eventType: "DISPATCH_CREATED", payload: { dispatch_code: dispatchCode } })} disabled={!dispatchCode.trim() || mutation.isPending}>
                                    CREATE
                                </Button>
                            </FlexBox>
                            <FlexBox style={{ gap: "0.5rem" }}>
                                <Button design="Transparent" icon="accept" onClick={() => mutation.mutate({ eventType: "DISPATCH_CONFIRMED", payload: { dispatch_id: dispatchId } })} disabled={!dispatchId.trim() || mutation.isPending}>
                                    CONFIRMED
                                </Button>
                                <Button design="Transparent" icon="undo" onClick={() => mutation.mutate({ eventType: "DISPATCH_RETURNED", payload: { dispatch_id: dispatchId } })} disabled={!dispatchId.trim() || mutation.isPending}>
                                    RETURNED
                                </Button>
                            </FlexBox>
                        </FlexBox>

                        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem" }}>
                            <Label style={{ fontWeight: "bold" }}>Plate Wash1</Label>
                            <FlexBox style={{ gap: "1rem" }} alignItems={FlexBoxAlignItems.Center}>
                                <div style={{ flex: 1 }}>
                                    <ScanInput value={plateId} onChange={setPlateId} onSubmit={() => mutation.mutate({ eventType: "PLATE_LOADED", payload: {} })} placeholder="Plate ID" />
                                </div>
                                <Button design="Emphasized" onClick={() => mutation.mutate({ eventType: "PLATE_LOADED", payload: {} })} disabled={mutation.isPending}>
                                    LOAD
                                </Button>
                            </FlexBox>
                            <FlexBox style={{ gap: "0.5rem" }}>
                                <Button design="Transparent" icon="play" onClick={() => mutation.mutate({ eventType: "WASH1_START", payload: { plate_id: plateId }, unitId: plateId })} disabled={!plateId.trim() || mutation.isPending}>
                                    WASH1 START
                                </Button>
                                <Button design="Transparent" icon="stop" onClick={() => mutation.mutate({ eventType: "WASH1_END", payload: { plate_id: plateId }, unitId: plateId })} disabled={!plateId.trim() || mutation.isPending}>
                                    WASH1 END
                                </Button>
                            </FlexBox>
                        </FlexBox>

                        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem" }}>
                            <Label style={{ fontWeight: "bold" }}>Jig Wash2</Label>
                            <FlexBox style={{ gap: "1rem" }} alignItems={FlexBoxAlignItems.Center}>
                                <Select value={jigType} onChange={(e) => setJigType(e.target.value)} style={{ width: "200px" }}>
                                    <Option value="PIN430_JIG">PIN430_JIG</Option>
                                    <Option value="PIN300_JIG">PIN300_JIG</Option>
                                    <Option value="SHROUD_JIG">SHROUD_JIG</Option>
                                    <Option value="CRASH_STOP_JIG">CRASH_STOP_JIG</Option>
                                </Select>
                                <div style={{ flex: 1 }}>
                                    <ScanInput value={jigId} onChange={setJigId} onSubmit={() => mutation.mutate({ eventType: "JIG_LOADED", payload: { jig_type: jigType, qty_total: 120 } })} placeholder="Jig ID" />
                                </div>
                                <Button design="Emphasized" onClick={() => mutation.mutate({ eventType: "JIG_LOADED", payload: { jig_type: jigType, qty_total: 120 } })} disabled={mutation.isPending}>
                                    LOAD
                                </Button>
                            </FlexBox>
                            <FlexBox style={{ gap: "0.5rem", flexWrap: "wrap" }}>
                                <Button design="Transparent" icon="play" onClick={() => mutation.mutate({ eventType: "WASH2_START", payload: { jig_id: jigId }, unitId: jigId })} disabled={!jigId.trim() || mutation.isPending}>
                                    WASH2 START
                                </Button>
                                <Button design="Transparent" icon="stop" onClick={() => mutation.mutate({ eventType: "WASH2_END", payload: { jig_id: jigId }, unitId: jigId })} disabled={!jigId.trim() || mutation.isPending}>
                                    WASH2 END
                                </Button>
                                <Button design="Transparent" icon="undo" onClick={() => mutation.mutate({ eventType: "JIG_RETURNED", payload: { jig_id: jigId }, unitId: jigId })} disabled={!jigId.trim() || mutation.isPending}>
                                    RETURNED
                                </Button>
                            </FlexBox>
                        </FlexBox>
                    </div>
                </Card>
            </div>

            <div style={{ gridColumn: "span 4" }}>
                <Card header={<CardHeader titleText="Session Details" />}>
                   <div style={{ padding: "1rem" }}>
                        <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "1rem" }}>
                            <FlexBox direction={FlexBoxDirection.Column}>
                                <Label>Dispatch ID:</Label>
                                <Text style={{ fontWeight: "bold" }}>{dispatchId || "-"}</Text>
                            </FlexBox>
                            <FlexBox direction={FlexBoxDirection.Column}>
                                <Label>Plate ID:</Label>
                                <Text style={{ fontWeight: "bold" }}>{plateId || "-"}</Text>
                            </FlexBox>
                            <FlexBox direction={FlexBoxDirection.Column}>
                                <Label>Jig ID:</Label>
                                <Text style={{ fontWeight: "bold" }}>{jigId || "-"}</Text>
                            </FlexBox>
                            <div style={{ marginTop: "1rem", fontSize: "0.875rem", color: "var(--sapContent_LabelColor)" }}>
                                Use IDs returned from each PASS step for next operation.
                            </div>
                        </FlexBox>
                   </div>
                </Card>
            </div>

        </Grid>
      </div>

      <FullscreenResultOverlay
        open={overlay.open}
        mode={overlay.mode}
        title={overlay.title}
        description={overlay.description}
        onClose={() => setOverlay((prev) => ({ ...prev, open: false }))}
      />
    </Page>
  );
}
