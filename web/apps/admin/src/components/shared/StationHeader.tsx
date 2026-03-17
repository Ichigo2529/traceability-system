import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOfflineQueue } from "@traceability/offline-queue";
import { sdk } from "../../context/AuthContext";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { formatTime } from "../../lib/datetime";
import { CheckCircle2, XCircle, Factory, User, Calendar } from "lucide-react";

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
    <Card className="w-full box-border">
      <CardHeader>
        <h3 className="text-base font-semibold">Station Connectivity & Info</h3>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-bold">{isOnline ? "ONLINE" : "OFFLINE"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              <span className="font-bold">{effectiveStation}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Process:</span>
              <span className="font-bold">{effectiveProcess}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <span className="font-bold">{operatorQuery.data?.display_name || "No operator"}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5" />
            <span className="text-sm">Shift Day: {shiftDay}</span>
            <span className="rounded-full bg-muted px-2 py-1 text-xs">Line {lineCode}</span>
            <span className="rounded-full bg-muted px-2 py-1 text-xs">Srv {serverTime}</span>
            <span
              className={`rounded-full px-2 py-1 text-xs font-bold ${pendingCount > 0 ? "bg-destructive/20 text-destructive" : "bg-green-500/20 text-green-700 dark:text-green-400"}`}
            >
              Queue {pendingCount}
            </span>
            {deviceStatus ? <StatusBadge status={deviceStatus} /> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
