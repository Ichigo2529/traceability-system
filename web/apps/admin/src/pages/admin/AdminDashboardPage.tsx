import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { sdk } from "../../context/AuthContext";
import { PageLayout, Skeleton } from "@traceability/ui";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Package,
  Factory,
  Truck,
  ClipboardCheck,
  History,
  Settings,
  Laptop,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ColorKey = "indigo" | "cyan" | "pink" | "emerald" | "amber" | "teal";

const colorMap: Record<ColorKey, { icon: string; glow: string; ring: string }> = {
  indigo: {
    icon: "bg-gradient-to-br from-indigo-500 to-purple-600",
    glow: "from-indigo-500 to-purple-600",
    ring: "text-indigo-500",
  },
  cyan: {
    icon: "bg-gradient-to-br from-cyan-400 to-blue-500",
    glow: "from-cyan-400 to-blue-500",
    ring: "text-cyan-500",
  },
  pink: {
    icon: "bg-gradient-to-br from-pink-400 to-rose-500",
    glow: "from-pink-400 to-rose-500",
    ring: "text-pink-500",
  },
  emerald: {
    icon: "bg-gradient-to-br from-emerald-400 to-blue-500",
    glow: "from-emerald-400 to-blue-500",
    ring: "text-emerald-500",
  },
  amber: {
    icon: "bg-gradient-to-br from-amber-300 to-red-400",
    glow: "from-amber-300 to-red-400",
    ring: "text-amber-500",
  },
  teal: {
    icon: "bg-gradient-to-br from-teal-400 to-indigo-900",
    glow: "from-teal-400 to-indigo-900",
    ring: "text-teal-500",
  },
};

const QUICK_ACTIONS: { label: string; icon: LucideIcon; to: string; color: ColorKey }[] = [
  { label: "Add User", icon: Users, to: "/admin/users", color: "indigo" },
  { label: "New Model", icon: Package, to: "/admin/models", color: "cyan" },
  { label: "Add Station", icon: Factory, to: "/admin/stations", color: "pink" },
  { label: "Inbound Pack", icon: Truck, to: "/admin/inbound-packs", color: "emerald" },
  { label: "Approvals", icon: ClipboardCheck, to: "/admin/approvals", color: "amber" },
  { label: "Audit Logs", icon: History, to: "/admin/audit-logs", color: "teal" },
];

const ICON_MAP: Record<string, LucideIcon> = {
  group: Users,
  laptop: Laptop,
  factory: Factory,
  product: Package,
  settings: Settings,
};

function ReadinessItem({ pass, text }: { pass: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
          pass ? "bg-emerald-500" : "bg-destructive"
        )}
      >
        {pass ? <Check className="w-3.5 h-3.5 text-white" /> : <X className="w-3.5 h-3.5 text-white" />}
      </div>
      <Label className="text-sm leading-snug">{text}</Label>
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
      text: `Devices assigned to station & process — ${assignedDevices.length} assigned`,
    },
    { pass: models.length > 0, text: `At least one product model configured — ${models.length} found` },
  ];

  const isReady = !readinessLoading && readinessChecks.every((c) => c.pass);

  return (
    <PageLayout
      title="Admin Dashboard"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Quick actions and system health overview</span>
        </div>
      }
      icon="settings"
      iconColor="indigo"
    >
      <div className="max-w-[1400px] mx-auto grid gap-6 w-full mt-2">
        <div className="grid grid-cols-12 gap-6">
          <DashboardStatCard icon="group" label="Users" value={users.length} loading={loadingUsers} color="indigo" />
          <DashboardStatCard
            icon="laptop"
            label="Devices"
            value={devices.length}
            loading={loadingDevices}
            color="emerald"
          />
          <DashboardStatCard
            icon="factory"
            label="Stations"
            value={stations.length}
            loading={loadingStations}
            color="pink"
          />
          <DashboardStatCard icon="product" label="Models" value={models.length} loading={loadingModels} color="cyan" />
        </div>

        <Card className="mt-2 bg-card border border-border shadow-sm">
          <CardHeader className="pb-2">
            <h4 className="text-lg font-semibold m-0">Quick Actions</h4>
            <Label className="opacity-70 text-xs">Jump to common tasks</Label>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
              {QUICK_ACTIONS.map((action) => {
                const IconC = action.icon;
                const colors = colorMap[action.color];
                return (
                  <button
                    key={action.to}
                    type="button"
                    onClick={() => navigate(action.to)}
                    className="flex flex-col items-center gap-2.5 p-4 rounded-xl border bg-card hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-[10px] flex items-center justify-center text-white shadow-sm",
                        colors.icon
                      )}
                    >
                      <IconC className="w-5 h-5" />
                    </div>
                    <Label className="text-[0.78rem] font-semibold text-center cursor-pointer">{action.label}</Label>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-2 bg-card border border-border shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold m-0">System Readiness</h4>
              <Label className="opacity-70 text-xs">Configuration requirements for go-live</Label>
            </div>
            {!readinessLoading && (
              <div
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold text-white",
                  isReady ? "bg-emerald-500" : "bg-destructive"
                )}
              >
                {isReady ? "READY" : "NOT READY"}
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {readinessLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} height="1.5rem" width="100%" />
                ))}
              </div>
            ) : (
              <>
                {readinessChecks.map((check, i) => (
                  <ReadinessItem key={i} pass={check.pass} text={check.text} />
                ))}
                {!isReady && (
                  <Alert variant="destructive" className="mt-4 rounded-lg">
                    <AlertDescription>
                      Complete the items above before going live. Visit{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto font-normal underline"
                        onClick={() => navigate("/admin/readiness")}
                      >
                        Readiness Validator
                      </Button>{" "}
                      for details.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

function DashboardStatCard({
  icon,
  label,
  value,
  color,
  loading,
}: {
  icon: string;
  label: string;
  value: number;
  color: ColorKey;
  loading?: boolean;
}) {
  const IconC = ICON_MAP[icon] ?? Package;
  const colors = colorMap[color];
  return (
    <Card className="col-span-12 xl:col-span-3 lg:col-span-3 md:col-span-6 border border-border overflow-hidden relative bg-card shadow-sm">
      <div className="p-6 relative z-10">
        <div
          className={cn(
            "absolute -top-6 -right-6 w-[120px] h-[120px] rounded-full opacity-[0.06] blur-[20px] bg-gradient-to-br",
            colors.glow
          )}
        />
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <Label className="font-extrabold text-[0.7rem] uppercase tracking-wider opacity-60 text-muted-foreground">
              {label}
            </Label>
            {loading ? (
              <Skeleton height="2.4rem" width="60px" className="my-1" />
            ) : (
              <h2 className="text-4xl font-black my-0.5 text-foreground">{value}</h2>
            )}
            <div className={cn("h-4 w-24 mt-2 opacity-40", colors.ring)}>
              <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full">
                <path
                  d="M0 15 Q 10 5, 20 12 T 40 8 T 60 14 T 80 6 L 100 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-sm",
              colors.icon
            )}
          >
            <IconC className="w-7 h-7" />
          </div>
        </div>
      </div>
    </Card>
  );
}
