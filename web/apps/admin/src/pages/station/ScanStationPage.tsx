import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../context/AuthContext";
import { 
    DynamicPage,
    DynamicPageTitle,
    DynamicPageHeader,
    Title, 
    Button, 
    Card, 
    CardHeader, 
    Label, 
    MessageStrip, 
    FlexBox, 
    FlexBoxAlignItems,
    FlexBoxDirection,
    Grid,
    Table,
    TableHeaderRow,
    TableHeaderCell,
    TableRow,
    TableCell,
    Text
} from "@ui5/webcomponents-react";
import { ScanComponent } from "../../components/patterns/ScanComponent";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { FullscreenResultOverlay } from "../../components/shared/FullscreenResultOverlay";
import { useStationEvent } from "../../hooks/useStationEvent";
import { formatStationError } from "../../lib/station-errors";
import { formatTime } from "../../lib/datetime";

type ScanRow = {
  assyId: string;
  step: string;
  at: string;
  result: "PASS" | "NG";
  reason?: string;
};

const ASSEMBLY_STEPS = [
  "PRESS_FIT_PIN430_DONE",
  "PRESS_FIT_PIN300_DONE",
  "PRESS_FIT_SHROUD_DONE",
  "CRASH_STOP_DONE",
  "IONIZER_DONE",
  "FVMI_PASS",
  "FVMI_FAIL",
] as const;

function beep(type: "pass" | "ng") {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.type = "sine";
  oscillator.frequency.value = type === "pass" ? 1040 : 240;
  gain.gain.value = 0.2;
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.12);
}

function genEventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ScanStationPage() {
  const navigate = useNavigate();
  const { publishEvent } = useStationEvent();
  const [assyId, setAssyId] = useState("");
  const [step, setStep] = useState<(typeof ASSEMBLY_STEPS)[number]>("PRESS_FIT_PIN430_DONE");
  const [quantity, setQuantity] = useState(0);
  const [history, setHistory] = useState<ScanRow[]>([]);
  const [overlay, setOverlay] = useState<{ open: boolean; mode: "PASS" | "NG"; title: string; description?: string }>({
    open: false,
    mode: "PASS",
    title: "",
  });

  const heartbeatQuery = useQuery({
    queryKey: ["scan-heartbeat"],
    queryFn: () => sdk.device.heartbeat(),
    retry: false,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!heartbeatQuery.error) return;
    const err = heartbeatQuery.error as { code?: string };
    if (err.code === "DEVICE_NOT_REGISTERED") {
      navigate("/station/register", { replace: true });
    }
  }, [heartbeatQuery.error, navigate]);

  const eventMutation = useMutation({
    mutationFn: async (targetAssyId: string) => {
      const result = await publishEvent({
        event_id: genEventId(),
        event_type: step,
        unit_id: targetAssyId,
        payload: {
          assy_id: targetAssyId,
          process: heartbeatQuery.data?.process?.name || "ASSEMBLY",
        },
        created_at_device: new Date().toISOString(),
      });
      return result;
    },
    onSuccess: (result, targetAssyId) => {
      const row: ScanRow = { assyId: targetAssyId, step, at: formatTime(new Date()), result: "PASS" };
      setHistory((prev) => [row, ...prev].slice(0, 5));
      setQuantity((v) => v + 1);
      setOverlay({
        open: true,
        mode: "PASS",
        title: "PASS",
        description: result.queued ? "Network unstable: queued for sync." : "Assembly step accepted.",
      });
      beep("pass");
      setTimeout(() => setOverlay((s) => ({ ...s, open: false })), 700);
      setAssyId("");
    },
    onError: (err, targetAssyId) => {
      const reason = formatStationError(err, "Validation rejected");
      const row: ScanRow = { assyId: targetAssyId, step, at: formatTime(new Date()), result: "NG", reason };
      setHistory((prev) => [row, ...prev].slice(0, 5));
      setOverlay({ open: true, mode: "NG", title: "NG", description: reason });
      beep("ng");
    },
  });

  const processName = heartbeatQuery.data?.process?.name || "Unassigned Process";
  const stationName = heartbeatQuery.data?.station?.name || "Unassigned Station";
  const deviceStatus = heartbeatQuery.data?.status || "active";

  const statusSummary = useMemo(() => {
    const pass = history.filter((h) => h.result === "PASS").length;
    const ng = history.filter((h) => h.result === "NG").length;
    return { pass, ng };
  }, [history]);

  if (heartbeatQuery.isLoading) return <div style={{ padding: "2rem", textAlign: "center" }}>Connecting station...</div>;
  if (heartbeatQuery.error) return <MessageStrip design="Negative">Station unavailable. Register device and verify assignment.</MessageStrip>;
  if (deviceStatus === "disabled") return <MessageStrip design="Negative">Device Disabled. This terminal has been disabled by admin.</MessageStrip>;

  return (
    <DynamicPage
      titleArea={
        <DynamicPageTitle 
          heading={<Title level="H2">Assembly Station</Title>}
          actionsBar={<StatusBadge status={deviceStatus} />}
        />
      }
      headerArea={
        <DynamicPageHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "2rem" }}>
                    <FlexBox direction={FlexBoxDirection.Column}>
                        <Label>Station</Label>
                        <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{stationName}</span>
                    </FlexBox>
                    <FlexBox direction={FlexBoxDirection.Column}>
                        <Label>Process</Label>
                        <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{processName}</span>
                    </FlexBox>
                </FlexBox>
                
                <FlexBox direction={FlexBoxDirection.Column} alignItems={FlexBoxAlignItems.End}>
                    <Label>Current Quantity</Label>
                    <Title level="H1" style={{ fontSize: "3rem", lineHeight: "1", margin: 0 }}>{quantity}</Title>
                </FlexBox>
            </div>
        </DynamicPageHeader>
      }
      style={{ height: "100vh" }}
      showFooter={false}
    >
      <div style={{ padding: "1rem", width: "100%", boxSizing: "border-box" }}>
         <Grid defaultSpan="XL4 L4 M12 S12" vSpacing="1rem" hSpacing="1rem" style={{ width: "100%" }}>
             {/* Step Control */}
             <Card header={<CardHeader titleText="Step Control" />} style={{ gridColumn: "span 4" }}>
                 <div style={{ padding: "1rem" }}>
                    <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.5rem" }}>
                        {ASSEMBLY_STEPS.map((item) => (
                            <Button 
                                key={item} 
                                design={step === item ? "Emphasized" : "Transparent"} 
                                onClick={() => setStep(item)}
                                style={{ justifyContent: "flex-start" }}
                            >
                                {item}
                            </Button>
                        ))}
                        <div style={{ marginTop: "1rem", fontSize: "0.875rem", color: "var(--sapContent_LabelColor)" }}>
                            Selected step: {step}
                        </div>
                    </FlexBox>
                 </div>
             </Card>

             {/* Main Scan Area */}
             <div style={{ gridColumn: "span 8", display: "flex", flexDirection: "column", gap: "1rem" }}>
                 
                 <ScanComponent 
                    label="ASSY Scan"
                    placeholder="Scan ASSY ID"
                    onScan={async (scannedValue) => {
                        const code = scannedValue.trim();
                        
                        // Client-side validations
                        if (history[0]?.assyId === code && history[0]?.step === step) {
                            const reason = "Duplicate step scan detected.";
                             const row: ScanRow = { assyId: code, step, at: formatTime(new Date()), result: "NG", reason: "Duplicate scan" };
                            setHistory((prev) => [row, ...prev].slice(0, 5));
                            setOverlay({ open: true, mode: "NG", title: "NG", description: "Duplicate scan" });
                            beep("ng");
                            return { success: false, message: reason };
                        }

                        if (!code.includes("-") && code.length < 16) {
                             return { success: false, message: "ASSY ID format seems invalid." };
                        }

                        try {
                            const result = await eventMutation.mutateAsync(code);
                            return { success: true, message: result.queued ? "Queued for sync" : "Scan accepted" };
                        } catch (err) {
                            const reason = formatStationError(err, "Validation rejected");
                            // Mutation onError handled history/beep, so just return false here for the component state
                            return { success: false, message: reason };
                        }
                    }}
                 />

                 {/* History Table */}
                 <Card header={<CardHeader titleText="Last 5 Scans" />} style={{ width: "100%" }}>
                     <Table
                        headerRow={
                            <TableHeaderRow>
                                <TableHeaderCell><Label>Time</Label></TableHeaderCell>
                                <TableHeaderCell><Label>ASSY ID</Label></TableHeaderCell>
                                <TableHeaderCell><Label>Step</Label></TableHeaderCell>
                                <TableHeaderCell><Label>Result</Label></TableHeaderCell>
                                <TableHeaderCell><Label>Reason</Label></TableHeaderCell>
                            </TableHeaderRow>
                        }
                     >
                        {history.map((row) => (
                            <TableRow key={`${row.assyId}-${row.step}-${row.at}`}>
                                <TableCell><Label>{row.at}</Label></TableCell>
                                <TableCell><Label style={{ fontFamily: "monospace" }}>{row.assyId}</Label></TableCell>
                                <TableCell><Label>{row.step}</Label></TableCell>
                                <TableCell><StatusBadge status={row.result} /></TableCell>
                                <TableCell><Label>{row.reason || "-"}</Label></TableCell>
                            </TableRow>
                        ))}
                     </Table>
                 </Card>

                 {/* Batch Result */}
                 <Card header={<CardHeader titleText="Batch Result" />}>
                     <div style={{ padding: "1rem" }}>
                        <FlexBox style={{ gap: "2rem" }}>
                            <Text>PASS: <span style={{ fontWeight: "bold", color: "var(--sapPositiveColor)" }}>{statusSummary.pass}</span></Text>
                            <Text>NG: <span style={{ fontWeight: "bold", color: "var(--sapNegativeColor)" }}>{statusSummary.ng}</span></Text>
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
    </DynamicPage>
  );
}
