import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wifi, WifiOff, User, CalendarClock, Factory } from "lucide-react";
import { useOfflineQueue } from "@traceability/offline-queue";
import { sdk } from "../../context/AuthContext";
import { Card, CardContent } from "../ui/card";
import { StatusBadge } from "./StatusBadge";
import { formatTime } from "../../lib/datetime";

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
    <Card>
      <CardContent className="grid gap-3 p-4 md:grid-cols-5">
        <div className="flex items-center gap-2 text-sm">
          {isOnline ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
          <span>{isOnline ? "Online" : "Offline"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Factory className="h-4 w-4 text-slate-500" />
          <span>{effectiveStation}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Process:</span>
          <span>{effectiveProcess}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-slate-500" />
          <span>{operatorQuery.data?.display_name || "No operator"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CalendarClock className="h-4 w-4 text-slate-500" />
          <span>Shift Day {shiftDay}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">Line {lineCode}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">Srv {serverTime}</span>
          <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs">Queue {pendingCount}</span>
          {deviceStatus ? <StatusBadge status={deviceStatus} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}
