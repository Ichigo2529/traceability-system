import { useQuery } from "@tanstack/react-query";
import "@ui5/webcomponents-icons/dist/group.js";
import "@ui5/webcomponents-icons/dist/iphone.js";
import "@ui5/webcomponents-icons/dist/factory.js";
import "@ui5/webcomponents-icons/dist/product.js";
import { 
  DynamicPage,
  DynamicPageTitle,
  DynamicPageHeader,
  Title, 
  Grid, 
  Card, 
  FlexBox, 
  FlexBoxJustifyContent, 
  FlexBoxAlignItems,
  FlexBoxDirection,
  Label,
  Icon 
} from "@ui5/webcomponents-react";
import { sdk } from "../../context/AuthContext";

export function AdminDashboardPage() {
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => sdk.admin.getUsers() });
  const { data: devices = [] } = useQuery({ queryKey: ["devices"], queryFn: () => sdk.admin.getDevices() });
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: () => sdk.admin.getStations() });
  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => sdk.admin.getModels() });

  return (
    <DynamicPage
      titleArea={
        <DynamicPageTitle
          heading={<Title level="H3">Admin Console</Title>}
          subheading={<Label>System Overview</Label>}
        />
      }
      headerArea={
        <DynamicPageHeader>
           {/* Placeholder for future global filters */}
        </DynamicPageHeader>
      }
      showFooter={false}
      style={{ height: "100%" }}
    >
      <div style={{ padding: "1rem" }}>
        <Grid defaultSpan="XL3 L3 M6 S12" vSpacing="1rem" hSpacing="1rem">
          <DashboardStatCard icon="group" label="Users" value={users.length} />
          <DashboardStatCard icon="iphone" label="Devices" value={devices.length} />
          <DashboardStatCard icon="factory" label="Stations" value={stations.length} />
          <DashboardStatCard icon="product" label="Models" value={models.length} />
        </Grid>
        
        <div style={{ marginTop: "1rem" }}>
          <Card
            header={
              <div style={{ padding: "1rem 1rem 0 1rem" }}>
                <Title level="H4">System Readiness</Title>
                <Label>Configuration requirements for go-live</Label>
              </div>
            }
          >
            <div style={{ padding: "0.5rem", display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Label>1. Keep at least one active process and station per line.</Label>
              <Label>2. Assign each active device to both station and process.</Label>
              <Label>3. Configure workflow approval levels before releasing revisions.</Label>
            </div>
          </Card>
        </div>
      </div>
    </DynamicPage>
  );
}

function DashboardStatCard({ icon, label, value }: { icon: string, label: string, value: number }) {
  return (
    <Card>
      <div style={{ padding: "1rem" }}>
          <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} alignItems={FlexBoxAlignItems.Center}>
              <FlexBox direction={FlexBoxDirection.Column}>
                  <Label>{label}</Label>
                  <Title level="H2">{value}</Title>
              </FlexBox>
              <Icon name={icon} style={{ width: "2.5rem", height: "2.5rem", opacity: 0.8, color: "var(--sapContent_IconColor)" }} />
          </FlexBox>
      </div>
    </Card>
  );
}
