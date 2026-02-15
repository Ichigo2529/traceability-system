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
    <div className="fixed right-4 top-4 z-[70] w-[360px] rounded-md border border-slate-300 bg-white/95 p-3 text-xs shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-slate-800">Eden Fallback Monitor</p>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">DEV</span>
      </div>
      <p className="text-[11px] text-slate-600">
        Strict preset: <span className="font-medium text-slate-800">{info.strictPreset || "none"}</span>
      </p>
      <p className="mb-2 text-[11px] text-slate-600">
        Strict scopes:{" "}
        <span className="font-medium text-slate-800">
          {info.strictScopes.length ? info.strictScopes.join(", ") : "none"}
        </span>
      </p>
      <div className="max-h-40 space-y-1 overflow-auto rounded border border-slate-200 bg-slate-50 p-2">
        {stats.length ? (
          stats.map((item) => (
            <div key={item.scope} className="flex items-center justify-between">
              <span className="truncate text-slate-700">{item.scope}</span>
              <span className="rounded bg-slate-200 px-1.5 py-0.5 font-semibold text-slate-700">{item.count}</span>
            </div>
          ))
        ) : (
          <p className="text-slate-500">No fallback recorded</p>
        )}
      </div>
    </div>
  );
}

