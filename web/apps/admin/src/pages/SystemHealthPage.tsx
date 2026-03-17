import { useEffect, useMemo, useState } from "react";
import { DataTable } from "../components/shared/DataTable";
import { getEdenFallbackDebugInfo, getEdenFallbackStats } from "../lib/eden-fallback";
import {
  getMaterialRealtimeHealth,
  subscribeMaterialRealtimeHealth,
  type MaterialRealtimeHealth,
} from "../lib/realtime-health";
import { formatDateTime } from "../lib/datetime";
import { PageLayout, Section, StatCard } from "@traceability/ui";
import { Check, Search, AlertTriangle, ArrowUpDown } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

type FallbackStat = {
  scope: string;
  count: number;
  id?: string;
};

function toValueState(status: MaterialRealtimeHealth["status"]): "Success" | "Warning" | "Error" | "None" {
  if (status === "connected" || status === "polling") return "Success";
  if (status === "reconnecting" || status === "connecting") return "Warning";
  if (status === "error") return "Error";
  return "None";
}

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

  const tableData = useMemo(() => fallbackStats.map((s, i) => ({ ...s, id: s.scope || String(i) })), [fallbackStats]);

  const columns = useMemo<ColumnDef<FallbackStat>[]>(
    () => [
      { id: "scope", header: "Scope", accessorKey: "scope" },
      { id: "count", header: "Count", accessorKey: "count" },
    ],
    []
  );

  const statusClass =
    toValueState(realtimeHealth.status) === "Success"
      ? "text-green-600 dark:text-green-400"
      : toValueState(realtimeHealth.status) === "Warning"
        ? "text-yellow-600 dark:text-yellow-400"
        : toValueState(realtimeHealth.status) === "Error"
          ? "text-destructive"
          : "text-muted-foreground";

  return (
    <PageLayout
      title="System Health"
      subtitle={
        <div className="flex items-center gap-2">
          <span className="indicator-live" />
          <span>Real-time diagnostics and fallback monitoring.</span>
        </div>
      }
      icon="sys-monitor"
      iconColor="var(--icon-purple)"
    >
      <Section title="Overview" variant="card">
        <div className="grid grid-cols-12 gap-4 p-0">
          <div className="col-span-12 xl:col-span-3 lg:col-span-3 md:col-span-6">
            <StatCard icon={Check} label="Strict Preset" value={debugInfo.strictPreset || "none"} />
          </div>
          <div className="col-span-12 xl:col-span-3 lg:col-span-3 md:col-span-6">
            <StatCard icon={Search} label="Strict Scopes" value={String(debugInfo.strictScopes.length)} />
          </div>
          <div className="col-span-12 xl:col-span-3 lg:col-span-3 md:col-span-6">
            <StatCard
              icon={AlertTriangle}
              label="Fallback Events"
              value={String(fallbackTotal)}
              trend={fallbackTotal > 0 ? "down" : "neutral"}
              trendValue={fallbackTotal > 0 ? "Detected" : "Clean"}
            />
          </div>
          <div className="col-span-12 xl:col-span-3 lg:col-span-3 md:col-span-6">
            <StatCard icon={ArrowUpDown} label="Top Fallback Scope" value={topScope} />
          </div>
        </div>
      </Section>

      <Section
        title={
          <div className="flex items-center gap-2">
            <span className="indicator-live" />
            <span>Material Request Realtime</span>
          </div>
        }
        variant="card"
      >
        <div className="grid grid-cols-12 gap-4 p-0">
          <div className="col-span-12 xl:col-span-6 lg:col-span-6 md:col-span-12 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status</span>
              <span className={`font-medium ${statusClass}`}>{realtimeHealth.status.toUpperCase()}</span>
            </div>
            <p className="text-sm text-muted-foreground m-0">Mode: {realtimeHealth.mode}</p>
            <p className="text-sm text-muted-foreground m-0">
              Last Event: {formatDateTime(realtimeHealth.lastEventAt)}
            </p>
            <p className="text-sm text-muted-foreground m-0">
              Last Error: {formatDateTime(realtimeHealth.lastErrorAt)}
            </p>
            <div className="p-2 border border-destructive/50 bg-destructive/5 rounded-md">
              <p className="text-sm font-semibold text-destructive m-0">Latest Error</p>
              <p className="text-sm text-destructive break-all mt-1">{realtimeHealth.errorMessage ?? "-"}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Eden Fallback Stats" variant="card">
        <DataTable data={tableData} columns={columns} />
      </Section>

      <Section title="Strict Config Details" variant="card">
        <div className="flex flex-col gap-1">
          <p className="text-sm m-0">Preset: {debugInfo.strictPreset || "none"}</p>
          <p className="text-sm m-0">
            Scopes: {debugInfo.strictScopes.length ? debugInfo.strictScopes.join(", ") : "none"}
          </p>
          <p className="text-sm m-0">Debug Panel: {debugInfo.debugEnabled ? "true" : "false"}</p>
        </div>
      </Section>
    </PageLayout>
  );
}
