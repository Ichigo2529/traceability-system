import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Wifi, WifiOff, Smartphone, ChevronRight, Users, Factory, Package, ScrollText } from "lucide-react";
import { DataTable } from "../components/shared/DataTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { sdk } from "../context/AuthContext";
import type { DeviceInfo } from "@traceability/sdk";
import { formatDateTime } from "../lib/datetime";

type DeviceRow = DeviceInfo & { isOnline?: boolean };

const SHORTCUTS: { label: string; description: string; to: string; icon: typeof Users }[] = [
  { label: "Users & roles", description: "Access and permissions", to: "/admin/users", icon: Users },
  { label: "Machines", description: "Machines and stations", to: "/admin/machines", icon: Factory },
  { label: "Models", description: "Product models", to: "/admin/models", icon: Package },
  { label: "Audit logs", description: "System activity", to: "/admin/audit-logs", icon: ScrollText },
];

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
        cell: ({ row }) => (
          <span className="font-mono text-sm text-foreground">{row.original.fingerprint ?? row.original.id}</span>
        ),
      },
      {
        id: "machine",
        header: "Machine",
        accessorKey: "assigned_machine",
        cell: ({ row }) =>
          row.original.assigned_machine?.name ?? (
            <span className="text-sm italic text-muted-foreground">Unassigned</span>
          ),
      },
      {
        id: "last_seen",
        header: "Last seen",
        accessorKey: "last_seen",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDateTime(row.original.last_seen)}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.isOnline ? <Badge variant="success">Online</Badge> : <Badge variant="danger">Offline</Badge>,
      },
    ],
    []
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border py-5 pl-4 pr-4 sm:pl-5 sm:pr-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Device dashboard</h1>
          <p className="text-sm text-muted-foreground">Device status and shortcuts</p>
        </div>
      </header>

      <div className="box-border min-h-0 flex-1 overflow-auto py-5 pl-4 pr-4 sm:pl-5 sm:pr-6">
        <div className="flex w-full flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={Wifi} label="Online devices" value={summary.online} loading={isLoading} variant="success" />
            <StatCard
              icon={WifiOff}
              label="Offline devices"
              value={summary.offline}
              loading={isLoading}
              variant="muted"
            />
            <StatCard
              icon={Smartphone}
              label="Registered devices"
              value={summary.total}
              loading={isLoading}
              variant="default"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
              <CardDescription>Open common admin areas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {SHORTCUTS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Button
                      key={s.to}
                      type="button"
                      variant="outline"
                      className="h-auto justify-start gap-3 py-3 pr-4 pl-4"
                      onClick={() => navigate(s.to)}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
                        <Icon className="size-4 text-muted-foreground" aria-hidden />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
                        <span className="font-medium">{s.label}</span>
                        <span className="text-xs font-normal text-muted-foreground">{s.description}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Device status</CardTitle>
              <CardDescription>Recent connectivity by device</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable data={tableData} columns={columns} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  variant,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
  loading: boolean;
  variant: "success" | "muted" | "default";
}) {
  const tone =
    variant === "success" ? "text-primary" : variant === "muted" ? "text-muted-foreground" : "text-foreground";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/50">
          <Icon className={`size-4 ${tone}`} aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-9 w-12" /> : null}
        {!loading ? <p className={`text-3xl font-semibold tabular-nums tracking-tight ${tone}`}>{value}</p> : null}
      </CardContent>
    </Card>
  );
}
