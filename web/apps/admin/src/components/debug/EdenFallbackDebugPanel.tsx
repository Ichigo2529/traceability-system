import { useEffect, useMemo, useState } from "react";
import { getEdenFallbackDebugInfo, getEdenFallbackStats } from "../../lib/eden-fallback";

type FallbackStat = {
  scope: string;
  count: number;
};

export function EdenFallbackDebugPanel() {
  const info = useMemo(() => getEdenFallbackDebugInfo(), []);
  const [stats, setStats] = useState<FallbackStat[]>([]);

  useEffect(() => {
    const refresh = () => setStats(getEdenFallbackStats().slice(0, 8));
    refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => window.clearInterval(timer);
  }, []);

  if (!import.meta.env.DEV || !info.debugEnabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-lg border border-border bg-background/95 p-3 text-xs shadow-lg backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-foreground">Eden Fallback Monitor</p>
        <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 text-xs font-bold text-yellow-700">DEV</span>
      </div>
      <p className="text-muted-foreground">
        Strict preset: <span className="font-medium text-foreground">{info.strictPreset || "none"}</span>
      </p>
      <p className="mb-2 text-muted-foreground">
        Strict scopes:{" "}
        <span className="font-medium text-foreground">
          {info.strictScopes.length ? info.strictScopes.join(", ") : "none"}
        </span>
      </p>
      <div className="flex flex-col gap-1">
        {stats.length ? (
          stats.map((item) => (
            <div key={item.scope} className="flex items-center justify-between rounded bg-muted px-2 py-1">
              <span className="truncate text-muted-foreground">{item.scope}</span>
              <span className="ml-2 font-bold text-foreground">{item.count}</span>
            </div>
          ))
        ) : (
          <p className="text-center text-muted-foreground">No fallback recorded</p>
        )}
      </div>
    </div>
  );
}
