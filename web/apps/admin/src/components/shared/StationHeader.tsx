import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOfflineQueue } from "@traceability/offline-queue";
import { sdk } from "../../context/AuthContext";
import { 
    Card, 
    CardHeader, 
    FlexBox, 
    FlexBoxAlignItems, 
    FlexBoxJustifyContent, 
    Icon, 
    Label, 
    Text 
} from "@ui5/webcomponents-react";
import { StatusBadge } from "./StatusBadge";
import { formatTime } from "../../lib/datetime";
import "@ui5/webcomponents-icons/dist/sys-enter-2.js";
import "@ui5/webcomponents-icons/dist/sys-cancel-2.js";
import "@ui5/webcomponents-icons/dist/factory.js";
import "@ui5/webcomponents-icons/dist/employee.js";
import "@ui5/webcomponents-icons/dist/calendar.js";

export function StationHeader({
  stationName,
  processName,
  deviceStatus,
}: {
  stationName?: string;
  processName?: string;
  deviceStatus?: string;
}) {
  const { isOnline, pendingCount } = useOfflineQueue();
  const operatorQuery = useQuery({
    queryKey: ["station-header-operator"],
    queryFn: () => sdk.device.getOperator(),
    retry: false,
  });
  const heartbeatQuery = useQuery({
    queryKey: ["station-header-heartbeat"],
    queryFn: () => sdk.device.heartbeat(),
    retry: false,
    refetchInterval: 15000,
  });

  const effectiveStation = useMemo(
    () => stationName || heartbeatQuery.data?.station?.name || "-",
    [heartbeatQuery.data?.station?.name, stationName]
  );
  const effectiveProcess = useMemo(
    () => processName || heartbeatQuery.data?.process?.name || "-",
    [heartbeatQuery.data?.process?.name, processName]
  );
  const lineCode = heartbeatQuery.data?.machine?.line_code || "-";
  const shiftDay = heartbeatQuery.data?.shift_day || "-";
  const serverTime = formatTime(heartbeatQuery.data?.server_time);

  return (
    <Card header={<CardHeader titleText="Station Connectivity & Info" />} style={{ width: "100%", boxSizing: "border-box" }}>
      <div style={{ padding: "0.75rem 1rem" }}>
        <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} alignItems={FlexBoxAlignItems.Center} style={{ gap: "1rem" }}>
            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "1.5rem" }}>
                <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                    <Icon name={isOnline ? "sys-enter-2" : "sys-cancel-2"} design={isOnline ? "Positive" : "Negative"} />
                    <Label style={{ fontWeight: "bold" }}>{isOnline ? "ONLINE" : "OFFLINE"}</Label>
                </FlexBox>

                <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                    <Icon name="factory" />
                    <Text style={{ fontWeight: "bold" }}>{effectiveStation}</Text>
                </FlexBox>

                <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                    <Label>Process:</Label>
                    <Text style={{ fontWeight: "bold" }}>{effectiveProcess}</Text>
                </FlexBox>

                <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                    <Icon name="employee" />
                    <Text style={{ fontWeight: "bold" }}>{operatorQuery.data?.display_name || "No operator"}</Text>
                </FlexBox>
            </FlexBox>

            <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.75rem" }}>
                <Icon name="calendar" />
                <Label>Shift Day: {shiftDay}</Label>
                <div style={{ padding: "0.25rem 0.5rem", borderRadius: "1rem", background: "var(--sapGroup_TitleBackground)", fontSize: "0.75rem" }}>
                    Line {lineCode}
                </div>
                <div style={{ padding: "0.25rem 0.5rem", borderRadius: "1rem", background: "var(--sapGroup_TitleBackground)", fontSize: "0.75rem" }}>
                    Srv {serverTime}
                </div>
                <div style={{ padding: "0.25rem 0.5rem", borderRadius: "1rem", background: pendingCount > 0 ? "var(--sapErrorBackground)" : "var(--sapSuccessBackground)", color: pendingCount > 0 ? "var(--sapNegativeElementColor)" : "var(--sapPositiveElementColor)", fontWeight: "bold", fontSize: "0.75rem" }}>
                    Queue {pendingCount}
                </div>
                {deviceStatus ? <StatusBadge status={deviceStatus} /> : null}
            </FlexBox>
        </FlexBox>
      </div>
    </Card>
  );
}
