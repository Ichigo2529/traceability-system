import { useQuery } from "@tanstack/react-query";
import "@ui5/webcomponents-icons/dist/AllIcons.js";
import { 
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
import layouts from "../../styles/layouts.module.css";
import { PageLayout } from "@traceability/ui";

export function AdminDashboardPage() {
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => sdk.admin.getUsers() });
  const { data: devices = [] } = useQuery({ queryKey: ["devices"], queryFn: () => sdk.admin.getDevices() });
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: () => sdk.admin.getStations() });
  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => sdk.admin.getModels() });

  return (
    <PageLayout
      title="Admin Console"
      subtitle="System Overview & Real-time Stats"
      icon="BusinessSuiteInAppSymbols/dashboard"
      iconColor="var(--icon-indigo)"
    >
      <div className={layouts.content} style={{ marginTop: '0.5rem' }}>
        <Grid defaultSpan="XL3 L3 M6 S12" vSpacing="1.5rem" hSpacing="1.5rem">
          <DashboardStatCard 
            icon="group" 
            label="Users" 
            value={users.length} 
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          />
          <DashboardStatCard 
            icon="iphone" 
            label="Devices" 
            value={devices.length} 
            gradient="linear-gradient(135deg, #2af598 0%, #009efd 100%)"
          />
          <DashboardStatCard 
            icon="factory" 
            label="Stations" 
            value={stations.length} 
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          />
          <DashboardStatCard 
            icon="product" 
            label="Models" 
            value={models.length} 
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          />
        </Grid>
        
        <div style={{ marginTop: "1.5rem" }}>
          <Card
            className={layouts.glassCard}
            header={
              <div style={{ padding: "1.5rem 1.5rem 0.5rem 1.5rem" }}>
                <Title level="H4">System Readiness</Title>
                <Label>Configuration requirements for go-live</Label>
              </div>
            }
          >
            <div style={{ padding: "1rem 1.5rem 1.5rem 1.5rem", display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon name="accept" style={{ color: 'var(--sapPositiveElementColor)' }} />
                  1. Keep at least one active process and station per line.
              </Label>
              <Label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon name="accept" style={{ color: 'var(--sapPositiveElementColor)' }} />
                  2. Assign each active device to both station and process.
              </Label>
              <Label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon name="accept" style={{ color: 'var(--sapPositiveElementColor)' }} />
                  3. Configure workflow approval levels before releasing revisions.
              </Label>
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}

function DashboardStatCard({ icon, label, value, gradient }: { icon: string, label: string, value: number, gradient: string }) {
  return (
    <Card className={layouts.glassCard} style={{ border: 'none', overflow: 'hidden', position: 'relative' }}>
      <div style={{ padding: "1.5rem", zIndex: 1, position: 'relative' }}>
          <div style={{ 
            position: 'absolute', 
            top: '-30px', 
            right: '-30px', 
            width: '120px', 
            height: '120px', 
            background: gradient, 
            opacity: 0.08, 
            borderRadius: '50%',
            filter: 'blur(20px)'
          }} />
          <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} alignItems={FlexBoxAlignItems.Center}>
              <FlexBox direction={FlexBoxDirection.Column}>
                  <Label style={{ fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6, color: 'var(--sapContent_LabelColor)' }}>{label}</Label>
                  <Title level="H2" style={{ fontSize: '2.4rem', margin: '0.1rem 0', fontWeight: 900, color: 'var(--sapTitleColor)' }}>{value}</Title>
              </FlexBox>
              <div style={{ 
                background: gradient, 
                width: '3.5rem',
                height: '3.5rem',
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: `0 8px 20px ${gradient.split(',')[1].trim().split(' ')[0]}33`,
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <Icon name={icon} style={{ width: "1.75rem", height: "1.75rem", color: "white" }} />
              </div>
          </FlexBox>
      </div>
    </Card>
  );
}
