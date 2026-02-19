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
  Icon,
  Button,
  MessageStrip,
} from "@ui5/webcomponents-react";
import { useNavigate } from "react-router-dom";
import { sdk } from "../../context/AuthContext";
import layouts from "../../styles/layouts.module.css";
import { PageLayout, Skeleton } from "@traceability/ui";

// ─── Quick Actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "Add User",        icon: "employee",       to: "/admin/users",       gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { label: "New Model",       icon: "product",        to: "/admin/models",      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { label: "Add Station",     icon: "factory",        to: "/admin/stations",    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { label: "Inbound Pack",    icon: "shipping-status",to: "/admin/inbound-packs",gradient: "linear-gradient(135deg, #2af598 0%, #009efd 100%)" },
  { label: "Approvals",       icon: "approvals",      to: "/admin/approvals",   gradient: "linear-gradient(135deg, #fce38a 0%, #f38181 100%)" },
  { label: "Audit Logs",      icon: "history",        to: "/admin/audit-logs",  gradient: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)" },
];

// ─── Readiness checks ─────────────────────────────────────────────────────────
function ReadinessItem({ pass, text }: { pass: boolean; text: string }) {
  return (
    <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.625rem", padding: "0.5rem 0" }}>
      <div style={{
        width: "1.5rem", height: "1.5rem", borderRadius: "50%",
        background: pass ? "linear-gradient(135deg,#2af598,#009efd)" : "linear-gradient(135deg,#f093fb,#f5576c)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        boxShadow: pass ? "0 2px 8px rgba(42,245,152,0.3)" : "0 2px 8px rgba(240,147,251,0.3)"
      }}>
        <Icon name={pass ? "accept" : "decline"} style={{ width: "0.875rem", height: "0.875rem", color: "white" }} />
      </div>
      <Label style={{ fontSize: "0.875rem", lineHeight: "1.4" }}>{text}</Label>
    </FlexBox>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();

  const { data: users = [], isLoading: loadingUsers }     = useQuery({ queryKey: ["users"],    queryFn: () => sdk.admin.getUsers() });
  const { data: devices = [], isLoading: loadingDevices } = useQuery({ queryKey: ["devices"],  queryFn: () => sdk.admin.getDevices() });
  const { data: stations = [], isLoading: loadingStations }= useQuery({ queryKey: ["stations"],queryFn: () => sdk.admin.getStations() });
  const { data: models = [], isLoading: loadingModels }   = useQuery({ queryKey: ["models"],   queryFn: () => sdk.admin.getModels() });
  const { data: processes = [], isLoading: loadingProcesses } = useQuery({ queryKey: ["processes"], queryFn: () => sdk.admin.getProcesses() });

  // Dynamic readiness checks
  const activeStations  = stations.filter((s: any) => s.is_active !== false);
  const activeProcesses = processes.filter((p: any) => p.is_active !== false);
  const assignedDevices = devices.filter((d: any) => d.station_id && d.process_id);
  const readinessLoading = loadingStations || loadingProcesses || loadingDevices;

  const readinessChecks = [
    { pass: activeStations.length > 0,  text: `At least one active station — ${activeStations.length} found` },
    { pass: activeProcesses.length > 0, text: `At least one active process — ${activeProcesses.length} found` },
    { pass: assignedDevices.length > 0, text: `Devices assigned to station & process — ${assignedDevices.length} assigned` },
    { pass: models.length > 0,          text: `At least one product model configured — ${models.length} found` },
  ];

  const isReady = !readinessLoading && readinessChecks.every((c) => c.pass);

  return (
    <PageLayout
      title="Admin Console"
      subtitle="System Overview & Real-time Stats"
      icon="bbyd-dashboard"
      iconColor="indigo"
    >
      <div className={layouts.content} style={{ marginTop: "0.5rem" }}>

        {/* ── Stat Cards ── */}
        <Grid defaultSpan="XL3 L3 M6 S12" vSpacing="1.5rem" hSpacing="1.5rem">
          <DashboardStatCard
            icon="group"
            label="Users"
            value={users.length}
            loading={loadingUsers}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          />
          <DashboardStatCard
            icon="laptop"
            label="Devices"
            value={devices.length}
            loading={loadingDevices}
            gradient="linear-gradient(135deg, #2af598 0%, #009efd 100%)"
          />
          <DashboardStatCard
            icon="factory"
            label="Stations"
            value={stations.length}
            loading={loadingStations}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          />
          <DashboardStatCard
            icon="product"
            label="Models"
            value={models.length}
            loading={loadingModels}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          />
        </Grid>

        {/* ── Quick Actions ── */}
        <Card
          className={layouts.glassCard}
          header={
            <div style={{ padding: "1.25rem 1.5rem 0.5rem 1.5rem" }}>
              <Title level="H4" style={{ margin: 0 }}>Quick Actions</Title>
              <Label style={{ opacity: 0.55, fontSize: "0.8rem" }}>Jump to common tasks</Label>
            </div>
          }
        >
          <div style={{ padding: "0.75rem 1.5rem 1.5rem 1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.to}
                  onClick={() => navigate(action.to)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: "0.6rem", padding: "1rem 0.5rem",
                    background: "var(--sapBaseColor, rgba(255,255,255,0.6))",
                    border: "1px solid var(--sapContent_BorderColor)",
                    borderRadius: "12px", cursor: "pointer",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    fontFamily: "var(--sapFontFamily)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  <div style={{
                    width: "2.5rem", height: "2.5rem", borderRadius: "10px",
                    background: action.gradient,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                  }}>
                    <Icon name={action.icon} style={{ width: "1.125rem", height: "1.125rem", color: "white" }} />
                  </div>
                  <Label style={{ fontSize: "0.78rem", fontWeight: 600, textAlign: "center", cursor: "pointer", color: "var(--sapTextColor)" }}>
                    {action.label}
                  </Label>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* ── System Readiness ── */}
        <Card
          className={layouts.glassCard}
          header={
            <div style={{ padding: "1.25rem 1.5rem 0.5rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <Title level="H4" style={{ margin: 0 }}>System Readiness</Title>
                <Label style={{ opacity: 0.55, fontSize: "0.8rem" }}>Configuration requirements for go-live</Label>
              </div>
              {!readinessLoading && (
                <div style={{
                  padding: "0.3rem 0.85rem", borderRadius: "99px", fontSize: "0.75rem", fontWeight: 700,
                  background: isReady
                    ? "linear-gradient(135deg,#2af598,#009efd)"
                    : "linear-gradient(135deg,#f093fb,#f5576c)",
                  color: "white",
                  boxShadow: isReady ? "0 2px 8px rgba(42,245,152,0.3)" : "0 2px 8px rgba(240,147,251,0.3)"
                }}>
                  {isReady ? "READY" : "NOT READY"}
                </div>
              )}
            </div>
          }
        >
          <div style={{ padding: "0.5rem 1.5rem 1.5rem 1.5rem" }}>
            {readinessLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} height="1.5rem" width="100%" />)}
              </div>
            ) : (
              <>
                {readinessChecks.map((check, i) => (
                  <ReadinessItem key={i} pass={check.pass} text={check.text} />
                ))}
                {!isReady && (
                  <MessageStrip
                    design="Critical"
                    hideCloseButton
                    style={{ marginTop: "1rem", borderRadius: "8px" }}
                  >
                    Complete the items above before going live. Visit{" "}
                    <Button design="Transparent" onClick={() => navigate("/admin/readiness")} style={{ padding: "0", height: "auto" }}>
                      Readiness Validator
                    </Button>{" "}
                    for details.
                  </MessageStrip>
                )}
              </>
            )}
          </div>
        </Card>

      </div>
    </PageLayout>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function DashboardStatCard({
  icon, label, value, gradient, loading,
}: {
  icon: string; label: string; value: number; gradient: string; loading?: boolean;
}) {
  return (
    <Card className={layouts.glassCard} style={{ border: "none", overflow: "hidden", position: "relative" }}>
      <div style={{ padding: "1.5rem", zIndex: 1, position: "relative" }}>
        <div style={{
          position: "absolute", top: "-30px", right: "-30px",
          width: "120px", height: "120px",
          background: gradient, opacity: 0.08,
          borderRadius: "50%", filter: "blur(20px)"
        }} />
        <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} alignItems={FlexBoxAlignItems.Center}>
          <FlexBox direction={FlexBoxDirection.Column} style={{ flexGrow: 1 }}>
            <Label style={{ fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6, color: "var(--sapContent_LabelColor)" }}>
              {label}
            </Label>
            {loading ? (
              <Skeleton height="2.4rem" width="60px" style={{ margin: "0.1rem 0" }} />
            ) : (
              <Title level="H2" style={{ fontSize: "2.4rem", margin: "0.1rem 0", fontWeight: 900, color: "var(--sapTitleColor)" }}>
                {value}
              </Title>
            )}
            <div style={{ height: "16px", width: "100px", marginTop: "0.5rem", opacity: 0.4 }}>
              <svg viewBox="0 0 100 20" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                <path
                  d="M0 15 Q 10 5, 20 12 T 40 8 T 60 14 T 80 6 L 100 10"
                  fill="none"
                  stroke={gradient.split(",")[1].trim().split(" ")[0]}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </FlexBox>
          <div style={{
            background: gradient, width: "3.5rem", height: "3.5rem",
            borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 8px 20px ${gradient.split(",")[1].trim().split(" ")[0]}33`,
            border: "1px solid rgba(255,255,255,0.2)"
          }}>
            <Icon name={icon} style={{ width: "1.75rem", height: "1.75rem", color: "white" }} />
          </div>
        </FlexBox>
      </div>
    </Card>
  );
}
