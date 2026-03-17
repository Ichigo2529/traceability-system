import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { PageLayout, Section, StatCard } from "@traceability/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "../components/shared/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import type { DeviceInfo } from "@traceability/sdk";
import { Smartphone, Wifi, WifiOff } from "lucide-react";

function isOnline(lastHeartbeat: string | null | undefined, onlineWindowMinutes: number) {
  if (!lastHeartbeat) return false;
  const ms = Date.now() - new Date(lastHeartbeat).getTime();
  return ms <= onlineWindowMinutes * 60 * 1000;
}

function relativeTime(ts: string | null | undefined) {
  if (!ts) return "-";
  const deltaSec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const min = Math.floor(deltaSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function HeartbeatMonitorPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [lineFilter, setLineFilter] = useState("all");

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => sdk.admin.getDevices(),
  });

  const { data: heartbeatSettings } = useQuery({
    queryKey: ["settings", "heartbeat"],
    queryFn: () => sdk.admin.getHeartbeatSettings(),
  });

  const onlineWindowMinutes = heartbeatSettings?.online_window_minutes ?? 5;

  const lineOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const d of devices) {
      if (d.assigned_machine?.name) uniq.add(d.assigned_machine.name);
    }
    return Array.from(uniq).sort((a, b) => a.localeCompare(b));
  }, [devices]);

  const filteredData = useMemo(() => {
    return devices.filter((d) => {
      const online = isOnline(d.last_heartbeat_at, onlineWindowMinutes);
      if (statusFilter === "online" && !online) return false;
      if (statusFilter === "offline" && online) return false;
      if (lineFilter !== "all") {
        if ((d.assigned_machine?.name ?? "") !== lineFilter) return false;
      }
      return true;
    });
  }, [devices, lineFilter, onlineWindowMinutes, statusFilter]);

  const summary = useMemo(() => {
    const online = devices.filter((d) => isOnline(d.last_heartbeat_at, onlineWindowMinutes)).length;
    return {
      total: devices.length,
      online,
      offline: Math.max(0, devices.length - online),
    };
  }, [devices, onlineWindowMinutes]);

  const columns = useMemo<ColumnDef<DeviceInfo>[]>(
    () => [
      {
        id: "device",
        header: "Device",
        accessorFn: (row) => (row.device_code || "") + (row.name || ""),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold">{row.original.device_code || "-"}</span>
            <span className="text-xs text-muted-foreground">{row.original.name || "-"}</span>
          </div>
        ),
      },
      {
        id: "machine",
        header: "Machine",
        accessorKey: "assigned_machine.name",
        cell: ({ row }) => <span className="text-sm">{row.original.assigned_machine?.name || "-"}</span>,
      },
      {
        id: "station",
        header: "Station",
        accessorKey: "assigned_station.name",
        cell: ({ row }) => <span className="text-sm">{row.original.assigned_station?.name || "-"}</span>,
      },
      {
        id: "process",
        header: "Process",
        accessorKey: "assigned_process.name",
        cell: ({ row }) => <span className="text-sm">{row.original.assigned_process?.name || "-"}</span>,
      },
      {
        id: "ip_address",
        header: "IP Address",
        accessorKey: "ip_address",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip_address || "-"}</span>,
      },
      {
        id: "heartbeat",
        header: "Heartbeat",
        accessorFn: (row) => row.last_heartbeat_at,
        cell: ({ row }) => <span className="text-sm">{relativeTime(row.original.last_heartbeat_at)}</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const online = isOnline(row.original.last_heartbeat_at, onlineWindowMinutes);
          return (
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                online
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {online ? "ONLINE" : "OFFLINE"}
            </span>
          );
        },
      },
    ],
    [onlineWindowMinutes]
  );

  return (
    <PageLayout
      title="Heartbeat Monitor"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Live device status monitoring | Online window: {onlineWindowMinutes}m</span>
        </div>
      }
      icon="heart"
      iconColor="var(--icon-purple)"
    >
      <Section title="Overview" variant="card">
        <div className="grid grid-cols-12 gap-4 p-0">
          <div className="col-span-12 xl:col-span-4 lg:col-span-4 md:col-span-6">
            <StatCard icon={Smartphone} label="Total Devices" value={summary.total.toString()} />
          </div>
          <div className="col-span-12 xl:col-span-4 lg:col-span-4 md:col-span-6">
            <StatCard icon={Wifi} label="Online" value={summary.online.toString()} trend="up" trendValue="Active" />
          </div>
          <div className="col-span-12 xl:col-span-4 lg:col-span-4 md:col-span-6">
            <StatCard
              icon={WifiOff}
              label="Offline"
              value={summary.offline.toString()}
              trend={summary.offline > 0 ? "down" : "neutral"}
              trendValue={summary.offline > 0 ? "Alert" : "Stable"}
            />
          </div>
        </div>
      </Section>

      <Section title="Device Status" variant="card">
        <DataTable
          data={filteredData}
          columns={columns}
          loading={isLoading}
          filterPlaceholder="Search devices by code, name, ip..."
          actions={
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              <Select value={lineFilter} onValueChange={setLineFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Machines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Machines</SelectItem>
                  {lineOptions.map((line) => (
                    <SelectItem key={line} value={line}>
                      {line}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </Section>
    </PageLayout>
  );
}
