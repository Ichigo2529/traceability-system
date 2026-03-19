import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { sdk } from "../../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Package,
  Factory,
  Truck,
  ClipboardCheck,
  History,
  Laptop,
  CheckCircle2,
  XCircle,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

const QUICK_ACTIONS: { label: string; icon: LucideIcon; to: string }[] = [
  { label: "Add User", icon: Users, to: "/admin/users" },
  { label: "New Model", icon: Package, to: "/admin/models" },
  { label: "Add Station", icon: Factory, to: "/admin/stations" },
  { label: "Inbound Pack", icon: Truck, to: "/admin/inbound-packs" },
  { label: "Approvals", icon: ClipboardCheck, to: "/admin/approvals" },
  { label: "Audit Logs", icon: History, to: "/admin/audit-logs" },
];

function ReadinessRow({ pass, text }: { pass: boolean; text: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {pass ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      ) : (
        <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
      )}
      <p className="text-sm leading-snug text-foreground">{text}</p>
    </div>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () => sdk.admin.getUsers(),
  });
  const { data: devices = [], isLoading: loadingDevices } = useQuery({
    queryKey: ["devices"],
    queryFn: () => sdk.admin.getDevices(),
  });
  const { data: stations = [], isLoading: loadingStations } = useQuery({
    queryKey: ["stations"],
    queryFn: () => sdk.admin.getStations(),
  });
  const { data: models = [], isLoading: loadingModels } = useQuery({
    queryKey: ["models"],
    queryFn: () => sdk.admin.getModels(),
  });
  const { data: processes = [], isLoading: loadingProcesses } = useQuery({
    queryKey: ["processes"],
    queryFn: () => sdk.admin.getProcesses(),
  });

  const activeStations = (stations as { is_active?: boolean }[]).filter((s) => s.is_active !== false);
  const activeProcesses = (processes as { is_active?: boolean }[]).filter((p) => p.is_active !== false);
  const assignedDevices = (devices as { station_id?: string | null; process_id?: string | null }[]).filter(
    (d) => !!d.station_id && !!d.process_id
  );
  const readinessLoading = loadingStations || loadingProcesses || loadingDevices;

  const readinessChecks = [
    { pass: activeStations.length > 0, text: `At least one active station — ${activeStations.length} found` },
    { pass: activeProcesses.length > 0, text: `At least one active process — ${activeProcesses.length} found` },
    {
      pass: assignedDevices.length > 0,
      text: `Devices assigned to station and process — ${assignedDevices.length} assigned`,
    },
    { pass: models.length > 0, text: `At least one product model configured — ${models.length} found` },
  ];

  const isReady = !readinessLoading && readinessChecks.every((c) => c.pass);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border py-5 pl-4 pr-4 sm:pl-5 sm:pr-6">
        <div className="flex w-full flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground">Quick actions and system health overview</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto py-5 pl-4 pr-4 sm:pl-5 sm:pr-6">
        <div className="flex w-full flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Users" value={users.length} loading={loadingUsers} icon={Users} />
            <StatCard label="Devices" value={devices.length} loading={loadingDevices} icon={Laptop} />
            <StatCard label="Stations" value={stations.length} loading={loadingStations} icon={Factory} />
            <StatCard label="Models" value={models.length} loading={loadingModels} icon={Package} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Jump to common admin tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.to}
                      type="button"
                      variant="outline"
                      className="h-auto justify-start gap-3 py-3 pr-4 pl-4"
                      onClick={() => navigate(action.to)}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
                        <Icon className="size-4 text-muted-foreground" aria-hidden />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
                        <span className="font-medium">{action.label}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-1.5">
                <CardTitle>System readiness</CardTitle>
                <CardDescription>Configuration checks before go-live</CardDescription>
              </div>
              {!readinessLoading && (
                <Badge variant={isReady ? "success" : "danger"} className="w-fit shrink-0">
                  {isReady ? "Ready" : "Not ready"}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-0">
              {readinessLoading ? (
                <div className="flex flex-col gap-3 py-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <>
                  {readinessChecks.map((check, i) => (
                    <div key={i}>
                      {i > 0 ? <Separator className="my-0" /> : null}
                      <ReadinessRow pass={check.pass} text={check.text} />
                    </div>
                  ))}
                  {!isReady && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertDescription className="flex flex-wrap items-center gap-x-1 gap-y-1">
                        Complete the items above before going live. Open the
                        <Button
                          variant="link"
                          className="h-auto p-0 font-medium"
                          onClick={() => navigate("/admin/readiness")}
                        >
                          Readiness validator
                        </Button>
                        for details.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  icon: Icon,
}: {
  label: string;
  value: number;
  loading?: boolean;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/50">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
