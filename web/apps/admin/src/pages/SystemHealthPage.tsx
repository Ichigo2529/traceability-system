import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { getEdenFallbackDebugInfo, getEdenFallbackStats } from "../lib/eden-fallback";
import { getMaterialRealtimeHealth, subscribeMaterialRealtimeHealth, type MaterialRealtimeHealth } from "../lib/realtime-health";
import { formatDateTime } from "../lib/datetime";

type FallbackStat = {
  scope: string;
  count: number;
};

function statusClass(status: MaterialRealtimeHealth["status"]) {
  if (status === "connected" || status === "polling") return "bg-emerald-100 text-emerald-700";
  if (status === "reconnecting" || status === "connecting") return "bg-amber-100 text-amber-700";
  if (status === "error") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        description="Runtime observability for Eden strict/fallback behavior and material request realtime connection."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Strict Preset</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {debugInfo.strictPreset || "none"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Strict Scopes</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {debugInfo.strictScopes.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Fallback Events</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {fallbackTotal}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Fallback Scope</CardTitle>
          </CardHeader>
          <CardContent className="truncate text-base font-semibold">
            {topScope}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Material Request Realtime</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status</span>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusClass(realtimeHealth.status)}`}>
                {realtimeHealth.status.toUpperCase()}
              </span>
            </div>
            <p><span className="text-muted-foreground">Mode:</span> {realtimeHealth.mode}</p>
            <p><span className="text-muted-foreground">Last Event:</span> {formatDateTime(realtimeHealth.lastEventAt)}</p>
            <p><span className="text-muted-foreground">Last Error:</span> {formatDateTime(realtimeHealth.lastErrorAt)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="mb-1 font-medium text-slate-700">Latest Error</p>
            <p className="text-slate-600">{realtimeHealth.errorMessage ?? "-"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eden Fallback Stats</CardTitle>
        </CardHeader>
        <CardContent>
          {fallbackStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fallback events recorded.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Scope</th>
                    <th className="px-3 py-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {fallbackStats.map((row) => (
                    <tr key={row.scope} className="border-t">
                      <td className="px-3 py-2 font-medium">{row.scope}</td>
                      <td className="px-3 py-2 text-right">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Strict Config</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Preset:</span> {debugInfo.strictPreset || "none"}
          </p>
          <p>
            <span className="font-medium">Scopes:</span>{" "}
            {debugInfo.strictScopes.length ? debugInfo.strictScopes.join(", ") : "none"}
          </p>
          <p>
            <span className="font-medium">Debug Panel Enabled:</span> {debugInfo.debugEnabled ? "true" : "false"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
