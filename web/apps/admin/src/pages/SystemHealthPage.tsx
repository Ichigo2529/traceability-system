import { useEffect, useMemo, useState } from "react";
import { 
  Grid,
  ObjectStatus,
  FlexBox,
  FlexBoxDirection,
  FlexBoxAlignItems,
  FlexBoxJustifyContent,
  Label,
  Icon
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/sys-monitor.js";
import "@ui5/webcomponents-icons/dist/accept.js";
import "@ui5/webcomponents-icons/dist/alert.js";
import "@ui5/webcomponents-icons/dist/error.js";
import "@ui5/webcomponents-icons/dist/search.js";
import "@ui5/webcomponents-icons/dist/sort.js";

import { DataTable } from "../components/shared/DataTable";
import { getEdenFallbackDebugInfo, getEdenFallbackStats } from "../lib/eden-fallback";
import { getMaterialRealtimeHealth, subscribeMaterialRealtimeHealth, type MaterialRealtimeHealth } from "../lib/realtime-health";
import { formatDateTime } from "../lib/datetime";
import { PageLayout, Section, StatCard } from "@traceability/ui";

type FallbackStat = {
  scope: string;
  count: number;
};

// Helper to map health status to ValueState strings
function toValueState(status: MaterialRealtimeHealth["status"]): "Success" | "Warning" | "Error" | "None" {
  if (status === "connected" || status === "polling") return "Success";
  if (status === "reconnecting" || status === "connecting") return "Warning";
  if (status === "error") return "Error";
  return "None";
}

// Icon wrappers for StatCard
const IconStrict = (props: any) => <Icon name="accept" {...props} />;
const IconScopes = (props: any) => <Icon name="search" {...props} />;
const IconFallback = (props: any) => <Icon name="alert" {...props} />;
const IconTopScope = (props: any) => <Icon name="sort" {...props} />;

export default function SystemHealthPage() {
  const debugInfo = useMemo(() => getEdenFallbackDebugInfo(), []);
  const [fallbackStats, setFallbackStats] = useState<FallbackStat[]>([]);
  const [realtimeHealth, setRealtimeHealth] = useState<MaterialRealtimeHealth>(getMaterialRealtimeHealth());

  useEffect(() => {
    const refresh = () => setFallbackStats(getEdenFallbackStats());
    refresh();
    const timer = window.setInterval(refresh, 1200);
    const unsub = subscribeMaterialRealtimeHealth((state) => setRealtimeHealth(state));
    return () => {
      window.clearInterval(timer);
      unsub();
    };
  }, []);

  const fallbackTotal = useMemo(() => fallbackStats.reduce((sum, item) => sum + item.count, 0), [fallbackStats]);
  const topScope = fallbackStats[0]?.scope ?? "-";

  // DataTable requires items to have an 'id' property
  const tableData = useMemo(() => fallbackStats.map((s, i) => ({ ...s, id: s.scope || i })), [fallbackStats]);

  return (
    <PageLayout
      title="System Health"
      subtitle="Real-time diagnostics and fallback monitoring."
      icon="sys-monitor"
      iconColor="var(--icon-purple)"
    >
        <Section title="Overview" variant="card">
            <Grid defaultSpan="XL3 L3 M6 S12" vSpacing="1rem" hSpacing="1rem" style={{ padding: "0" }}>
                <StatCard
                    icon={IconStrict}
                    label="Strict Preset"
                    value={debugInfo.strictPreset || "none"}
                />
                <StatCard
                    icon={IconScopes}
                    label="Strict Scopes"
                    value={String(debugInfo.strictScopes.length)}
                />
                <StatCard
                    icon={IconFallback}
                    label="Fallback Events"
                    value={String(fallbackTotal)}
                    trend={fallbackTotal > 0 ? "down" : "neutral"}
                    trendValue={fallbackTotal > 0 ? "Detected" : "Clean"}
                />
                <StatCard
                    icon={IconTopScope}
                    label="Top Fallback Scope"
                    value={topScope}
                />
            </Grid>
        </Section>

        <Section title="Material Request Realtime" variant="card">
            <Grid defaultSpan="XL6 L6 M12 S12" style={{ padding: "0" }}>
                <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.5rem" }}>
                    <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} alignItems={FlexBoxAlignItems.Center}>
                        <Label>Status</Label>
                        <ObjectStatus state={toValueState(realtimeHealth.status) as any} inverted>
                            {realtimeHealth.status.toUpperCase()}
                        </ObjectStatus>
                    </FlexBox>
                    <Label>Mode: {realtimeHealth.mode}</Label>
                    <Label>Last Event: {formatDateTime(realtimeHealth.lastEventAt)}</Label>
                    <Label>Last Error: {formatDateTime(realtimeHealth.lastErrorAt)}</Label>
                </FlexBox>

                <div style={{ padding: "0.5rem", border: "1px solid var(--sapErrorBorderColor)", background: "var(--sapErrorBackground)", borderRadius: "var(--sapElement_BorderCornerRadius)" }}>
                    <Label style={{ color: "var(--sapNegativeColor)", fontWeight: "bold" }}>Latest Error</Label>
                    <div style={{ fontSize: "0.875rem", color: "var(--sapNegativeColor)", wordBreak: "break-all" }}>
                        {realtimeHealth.errorMessage ?? "-"}
                    </div>
                </div>
            </Grid>
        </Section>

        <Section title="Eden Fallback Stats" variant="card">
            <DataTable
                data={tableData}
                columns={[
                    { header: "Scope", accessorKey: "scope" as any },
                    { header: "Count", accessorKey: "count" as any }
                ]}
            />
        </Section>

        <Section title="Strict Config Details" variant="card">
            <FlexBox direction={FlexBoxDirection.Column} style={{ gap: "0.25rem" }}>
                <Label>Preset: {debugInfo.strictPreset || "none"}</Label>
                <Label>Scopes: {debugInfo.strictScopes.length ? debugInfo.strictScopes.join(", ") : "none"}</Label>
                <Label>Debug Panel: {debugInfo.debugEnabled ? "true" : "false"}</Label>
            </FlexBox>
        </Section>
    </PageLayout>
  );
}
