import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import "@ui5/webcomponents-icons/dist/connected.js";
import "@ui5/webcomponents-icons/dist/disconnected.js";
import "@ui5/webcomponents-icons/dist/iphone.js";
import { 
  DynamicPage,
  DynamicPageTitle,
  Title, 
  Grid,
  Label,
  FlexBox,
  FlexBoxDirection,
  FlexBoxAlignItems,
  FlexBoxJustifyContent,
  ObjectStatus,
  Card,
  CardHeader,
  Icon
} from "@ui5/webcomponents-react";
import { DataTable } from "../components/shared/DataTable";
import { sdk } from "../context/AuthContext";
import type { DeviceInfo } from "@traceability/sdk";
import { formatDateTime } from "../lib/datetime";

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

  const tableData = useMemo(() => deviceRows.map(d => {
      const last = d.last_seen ? new Date(d.last_seen).getTime() : 0;
      const isOnline = last ? (Date.now() - last) / 1000 <= 60 : false;
      return {
          ...d,
          isOnline
      };
  }), [deviceRows]);

  return (
    <DynamicPage
      titleArea={
        <DynamicPageTitle
          heading={<Title level="H3">Device Dashboard</Title>}
          subheading={<Label>Real-time device status and quick actions</Label>}
        />
      }
      showFooter={false}
      style={{ height: "100%" }}
    >
      <div style={{ padding: "1rem", width: "100%", boxSizing: "border-box" }}>
        <Grid defaultSpan="XL4 L4 M12 S12" vSpacing="1rem" hSpacing="1rem" style={{ width: "100%" }}>
            {/* Stats Cards */}
            <StatsCard 
                icon="connected" 
                label="Online Devices" 
                value={isLoading ? "..." : String(summary.online)} 
                color="var(--sapPositiveColor)"
            />
            <StatsCard 
                icon="disconnected" 
                label="Offline Devices" 
                value={isLoading ? "..." : String(summary.offline)} 
                color="var(--sapCriticalColor)"
            />
            <StatsCard 
                icon="iphone"
                label="Registered Devices" 
                value={isLoading ? "..." : String(summary.total)} 
                color="var(--sapContent_LabelColor)"
            />
        </Grid>

        <div style={{ marginTop: "1rem", marginBottom: "1rem", width: "100%" }}>
            <Title level="H5" style={{ marginBottom: "0.5rem", marginLeft: 0 }}>Quick Actions</Title>
            <Grid defaultSpan="XL3 L3 M6 S12" vSpacing="1rem" hSpacing="1rem" style={{ width: "100%" }}>
                <ShortcutCard label="Users & Roles" description="Manage access and permissions" onClick={() => navigate("/admin/users")} />
                <ShortcutCard label="Machines" description="Configure machines and stations" onClick={() => navigate("/admin/machines")} />
                <ShortcutCard label="Models" description="Product models management" onClick={() => navigate("/admin/models")} />
                <ShortcutCard label="Audit Logs" description="View system activity logs" onClick={() => navigate("/admin/audit-logs")} />
            </Grid>
        </div>

        <Card header={<CardHeader titleText="Device Status Overview" />} style={{ width: "100%" }}>
            <div style={{ padding: "1rem", width: "100%", boxSizing: "border-box" }}>
                <DataTable
                    data={tableData}
                    columns={[
                        { header: "Fingerprint", accessorKey: "id" as any, cell: (item: any) => <span style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>{item.fingerprint ?? item.id}</span> },
                        { header: "Machine", accessorKey: "assigned_machine" as any, cell: (item: any) => item.assigned_machine?.name ?? <span style={{ fontStyle: "italic", color: "var(--sapContent_LabelColor)" }}>Unassigned</span> },
                        { header: "Last Seen", accessorKey: "last_seen" as any, cell: (item: any) => formatDateTime(item.last_seen) },
                        { header: "Status", accessorKey: "id" as any, cell: (item: any) => ( 
                            <ObjectStatus state={item.isOnline ? "Success" as any : "Error" as any}>
                                {item.isOnline ? "ONLINE" : "OFFLINE"}
                            </ObjectStatus>
                        )}
                    ]}
                />
            </div>
        </Card>
      </div>
    </DynamicPage>
  );
}

function StatsCard({ icon, label, value, color }: any) {
  return (
    <Card>
        <div style={{ padding: "1rem" }}>
            <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} alignItems={FlexBoxAlignItems.Center}>
                <FlexBox direction={FlexBoxDirection.Column}>
                    <Label>{label}</Label>
                    <Title level="H2" style={{ color: color, margin: 0 }}>{value}</Title>
                </FlexBox>
                <Icon name={icon} style={{ width: "2.5rem", height: "2.5rem", color: color, opacity: 0.8 }} />
            </FlexBox>
        </div>
    </Card>
  );
}

function ShortcutCard({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
    return (
        <Card style={{ cursor: "pointer" }} header={<CardHeader titleText={label} subtitleText={description} interactive onClick={onClick} />}>
        </Card>
    )
}
