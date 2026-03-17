import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Wifi, WifiOff, Smartphone } from "lucide-react";
import { DataTable } from "../components/shared/DataTable";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { sdk } from "../context/AuthContext";
import type { DeviceInfo } from "@traceability/sdk";
import { formatDateTime } from "../lib/datetime";

type DeviceRow = DeviceInfo & { isOnline?: boolean };

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => sdk.admin.getDevices(),
  });

  const deviceRows = devices as DeviceInfo[];

  const summary = useMemo(() => {
    const now = Date.now();
    let online = 0;
    for (const d of deviceRows) {
      const last = d.last_seen ? new Date(d.last_seen).getTime() : 0;
      const diffSec = last ? (now - last) / 1000 : Infinity;
      if (diffSec <= 60) online += 1;
    }
    return {
      online,
      offline: deviceRows.length - online,
      total: deviceRows.length,
    };
  }, [deviceRows]);

  const tableData = useMemo<DeviceRow[]>(
    () =>
      deviceRows.map((d) => {
        const last = d.last_seen ? new Date(d.last_seen).getTime() : 0;
        const isOnline = last ? (Date.now() - last) / 1000 <= 60 : false;
        return { ...d, isOnline };
      }),
    [deviceRows]
  );

  const columns = useMemo<ColumnDef<DeviceRow>[]>(
    () => [
      {
        id: "fingerprint",
        header: "Fingerprint",
        accessorKey: "id",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.fingerprint ?? row.original.id}</span>,
      },
      {
        id: "machine",
        header: "Machine",
        accessorKey: "assigned_machine",
        cell: ({ row }) =>
          row.original.assigned_machine?.name ?? <span className="italic text-muted-foreground">Unassigned</span>,
      },
      {
        id: "last_seen",
        header: "Last Seen",
        accessorKey: "last_seen",
        cell: ({ row }) => formatDateTime(row.original.last_seen),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className={`text-sm font-medium ${row.original.isOnline ? "text-green-600" : "text-destructive"}`}>
            {row.original.isOnline ? "ONLINE" : "OFFLINE"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b">
        <h3 className="text-lg font-semibold m-0">Device Dashboard</h3>
        <p className="text-sm text-muted-foreground m-0 mt-1">Real-time device status and quick actions</p>
      </div>

      <div className="p-4 w-full box-border flex-1 overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <StatsCard
            icon={Wifi}
            label="Online Devices"
            value={isLoading ? "..." : String(summary.online)}
            className="text-green-600"
          />
          <StatsCard
            icon={WifiOff}
            label="Offline Devices"
            value={isLoading ? "..." : String(summary.offline)}
            className="text-destructive"
          />
          <StatsCard
            icon={Smartphone}
            label="Registered Devices"
            value={isLoading ? "..." : String(summary.total)}
            className="text-muted-foreground"
          />
        </div>

        <div className="mb-4">
          <h5 className="text-sm font-medium mb-2">Quick Actions</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <ShortcutCard
              label="Users & Roles"
              description="Manage access and permissions"
              onClick={() => navigate("/admin/users")}
            />
            <ShortcutCard
              label="Machines"
              description="Configure machines and stations"
              onClick={() => navigate("/admin/machines")}
            />
            <ShortcutCard
              label="Models"
              description="Product models management"
              onClick={() => navigate("/admin/models")}
            />
            <ShortcutCard
              label="Audit Logs"
              description="View system activity logs"
              onClick={() => navigate("/admin/audit-logs")}
            />
          </div>
        </div>

        <Card className="w-full">
          <CardHeader>
            <h3 className="text-base font-semibold">Device Status Overview</h3>
          </CardHeader>
          <CardContent>
            <DataTable data={tableData} columns={columns} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className={`text-2xl font-bold ${className ?? ""}`}>{value}</span>
          </div>
          <Icon className={`w-10 h-10 opacity-80 ${className ?? ""}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function ShortcutCard({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <Card className="cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-md" onClick={onClick}>
      <CardHeader>
        <h4 className="text-sm font-semibold">{label}</h4>
        <p className="text-sm text-muted-foreground m-0">{description}</p>
      </CardHeader>
    </Card>
  );
}
