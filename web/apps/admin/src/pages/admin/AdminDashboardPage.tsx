import { useQuery } from "@tanstack/react-query";
import { Boxes, Cpu, Factory, Users } from "lucide-react";
import { sdk } from "../../context/AuthContext";
import { PageHeader } from "../../components/shared/PageHeader";
import { StatCard } from "../../components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function AdminDashboardPage() {
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => sdk.admin.getUsers() });
  const { data: devices = [] } = useQuery({ queryKey: ["devices"], queryFn: () => sdk.admin.getDevices() });
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: () => sdk.admin.getStations() });
  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => sdk.admin.getModels() });

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Console" description="Industrial traceability configuration and governance center." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Users" value={users.length} />
        <StatCard icon={Cpu} label="Devices" value={devices.length} />
        <StatCard icon={Factory} label="Stations" value={stations.length} />
        <StatCard icon={Boxes} label="Models" value={models.length} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>System Readiness</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <p>1. Keep at least one active process and station per line.</p>
          <p>2. Assign each active device to both station and process.</p>
          <p>3. Configure workflow approval levels before releasing revisions.</p>
        </CardContent>
      </Card>
    </div>
  );
}
