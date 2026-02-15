import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { PageHeader } from "../components/shared/PageHeader";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { EmptyState } from "../components/shared/States";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [lineFilter, setLineFilter] = useState<string>("all");

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

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return devices.filter((d) => {
      const online = isOnline(d.last_heartbeat_at, onlineWindowMinutes);
      if (statusFilter === "online" && !online) return false;
      if (statusFilter === "offline" && online) return false;

      if (lineFilter !== "all") {
        if ((d.assigned_machine?.name ?? "") !== lineFilter) return false;
      }

      if (!keyword) return true;
      const haystack = [
        d.device_code,
        d.name,
        d.assigned_station?.name,
        d.assigned_process?.name,
        d.assigned_machine?.name,
        d.ip_address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [devices, lineFilter, onlineWindowMinutes, search, statusFilter]);

  const summary = useMemo(() => {
    const online = devices.filter((d) => isOnline(d.last_heartbeat_at, onlineWindowMinutes)).length;
    return {
      total: devices.length,
      online,
      offline: Math.max(0, devices.length - online),
    };
  }, [devices, onlineWindowMinutes]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Heartbeat Monitor"
        description={`Device online window: ${onlineWindowMinutes} minute(s)`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Devices</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Online</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-green-600">{summary.online}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Offline</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-600">{summary.offline}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search device code, station, process, IP..."
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "online" | "offline")}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          <Select value={lineFilter} onValueChange={setLineFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Machine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All machines</SelectItem>
              {lineOptions.map((line) => (
                <SelectItem key={line} value={line}>
                  {line}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Device Heartbeat Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading devices...</div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No devices found" description="Adjust filters and try again." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Device</th>
                    <th className="px-3 py-2 text-left">Machine</th>
                    <th className="px-3 py-2 text-left">Station</th>
                    <th className="px-3 py-2 text-left">Process</th>
                    <th className="px-3 py-2 text-left">IP</th>
                    <th className="px-3 py-2 text-left">Heartbeat</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const online = isOnline(d.last_heartbeat_at, onlineWindowMinutes);
                    return (
                      <tr key={d.id} className="border-t">
                        <td className="px-3 py-2 font-medium">
                          {d.device_code || "-"}
                          <div className="text-xs text-muted-foreground">{d.name || "-"}</div>
                        </td>
                        <td className="px-3 py-2">{d.assigned_machine?.name || "-"}</td>
                        <td className="px-3 py-2">{d.assigned_station?.name || "-"}</td>
                        <td className="px-3 py-2">{d.assigned_process?.name || "-"}</td>
                        <td className="px-3 py-2 font-mono text-xs">{d.ip_address || "-"}</td>
                        <td className="px-3 py-2">
                          {relativeTime(d.last_heartbeat_at)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
                              online ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {online ? "ONLINE" : "OFFLINE"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
