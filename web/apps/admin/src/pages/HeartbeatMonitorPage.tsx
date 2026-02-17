import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sdk } from "../context/AuthContext";
import { PageLayout, Section, StatCard } from "@traceability/ui";
import {
    Grid,
    Select,
    Option,
    Icon,
    ObjectStatus,
    FlexBox,
    FlexBoxAlignItems,
    BusyIndicator,
} from "@ui5/webcomponents-react";
import { DataTable } from "../components/shared/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import type { DeviceInfo } from "@traceability/sdk";
import "@ui5/webcomponents-icons/dist/search.js";
import "@ui5/webcomponents-icons/dist/heart.js";
import "@ui5/webcomponents-icons/dist/status-positive.js";
import "@ui5/webcomponents-icons/dist/status-inactive.js";
import "@ui5/webcomponents-icons/dist/connected.js";
import "@ui5/webcomponents-icons/dist/disconnected.js";
import "@ui5/webcomponents-icons/dist/iphone.js";

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

// Icon wrappers for StatCard
const IconTotal = (props: any) => <Icon name="iphone" {...props} />;
const IconOnline = (props: any) => <Icon name="connected" {...props} />;
const IconOffline = (props: any) => <Icon name="disconnected" {...props} />;

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
        header: "Device",
        accessorFn: (row) => (row.device_code || "") + (row.name || ""),
        cell: ({ row }) => (
            <FlexBox direction="Column">
                <span style={{ fontWeight: "bold" }}>{row.original.device_code || "-"}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--sapContent_LabelColor)" }}>{row.original.name || "-"}</span>
            </FlexBox>
        ),
      },
      {
        header: "Machine",
        accessorKey: "assigned_machine.name",
        cell: ({ row }) => <span style={{ fontSize: "0.875rem" }}>{row.original.assigned_machine?.name || "-"}</span>,
      },
      {
        header: "Station",
        accessorKey: "assigned_station.name",
        cell: ({ row }) => <span style={{ fontSize: "0.875rem" }}>{row.original.assigned_station?.name || "-"}</span>,
      },
      {
        header: "Process",
        accessorKey: "assigned_process.name",
        cell: ({ row }) => <span style={{ fontSize: "0.875rem" }}>{row.original.assigned_process?.name || "-"}</span>,
      },
      {
        header: "IP Address",
        accessorKey: "ip_address",
        cell: ({ row }) => <span style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{row.original.ip_address || "-"}</span>,
      },
      {
        header: "Heartbeat",
        accessorFn: (row) => row.last_heartbeat_at,
        cell: ({ row }) => <span style={{ fontSize: "0.875rem" }}>{relativeTime(row.original.last_heartbeat_at)}</span>,
      },
      {
        header: "Status",
        id: "status",
        cell: ({ row }) => {
            const online = isOnline(row.original.last_heartbeat_at, onlineWindowMinutes);
            return (
                <ObjectStatus
                    state={online ? "Positive" : "Critical"}
                    icon={<Icon name={online ? "status-positive" : "status-inactive"} />}
                    inverted
                >
                    {online ? "ONLINE" : "OFFLINE"}
                </ObjectStatus>
            );
        },
      },
    ],
    [onlineWindowMinutes]
  );

  return (
    <PageLayout
      title="Heartbeat Monitor"
      subtitle={`Live device status monitoring | Online window: ${onlineWindowMinutes}m`}
      icon="heart"
      iconColor="var(--icon-purple)"
     >
      <Section title="Overview" variant="card">
         <Grid defaultSpan="XL4 L4 M12 S12" vSpacing="1rem" hSpacing="1rem" style={{ padding: "0" }}>
            <StatCard
                icon={IconTotal}
                label="Total Devices"
                value={summary.total.toString()}
            />
            <StatCard
                icon={IconOnline}
                label="Online"
                value={summary.online.toString()}
                trend="up"
                trendValue="Active"
            />
            <StatCard
                icon={IconOffline}
                label="Offline"
                value={summary.offline.toString()}
                trend={summary.offline > 0 ? "down" : "neutral"}
                trendValue={summary.offline > 0 ? "Alert" : "Stable"}
            />
        </Grid>
      </Section>

      <Section title="Device Status" variant="card">
        {isLoading ? (
             <div style={{ padding: "3rem", display: "flex", justifyContent: "center" }}>
                 <BusyIndicator active text="Loading devices..." />
             </div>
        ) : (
        <DataTable
            data={filteredData}
            columns={columns}
            filterPlaceholder="Search devices by code, name, ip..."
            actions={
                <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                    <Select onChange={(e) => setStatusFilter((e.target.selectedOption as any).dataset.value)}>
                        <Option value="all" data-value="all" selected={statusFilter === "all"}>All Status</Option>
                        <Option value="online" data-value="online" selected={statusFilter === "online"}>Online</Option>
                        <Option value="offline" data-value="offline" selected={statusFilter === "offline"}>Offline</Option>
                    </Select>
                    <Select onChange={(e) => setLineFilter((e.target.selectedOption as any).dataset.value)}>
                        <Option value="all" data-value="all" selected={lineFilter === "all"}>All Machines</Option>
                        {lineOptions.map((line) => (
                            <Option key={line} value={line} data-value={line} selected={lineFilter === line}>
                                {line}
                            </Option>
                        ))}
                    </Select>
                </FlexBox>
            }
        />
        )}
      </Section>
    </PageLayout>
  );
}
