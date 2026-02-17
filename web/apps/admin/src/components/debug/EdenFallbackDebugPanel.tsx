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
    <div className="admin-eden-panel">
      <div className="admin-eden-panel-header">
        <p className="admin-eden-panel-title">Eden Fallback Monitor</p>
        <span className="admin-eden-panel-env-chip">DEV</span>
      </div>
      <p className="admin-eden-panel-info-line">
        Strict preset: <span className="admin-eden-panel-info-value">{info.strictPreset || "none"}</span>
      </p>
      <p className="admin-eden-panel-info-line admin-eden-panel-info-line-spaced">
        Strict scopes:{" "}
        <span className="admin-eden-panel-info-value">
          {info.strictScopes.length ? info.strictScopes.join(", ") : "none"}
        </span>
      </p>
      <div className="admin-eden-panel-stats-list">
        {stats.length ? (
          stats.map((item) => (
            <div key={item.scope} className="admin-eden-panel-stat-row">
              <span className="admin-eden-panel-stat-scope">{item.scope}</span>
              <span className="admin-eden-panel-stat-count">{item.count}</span>
            </div>
          ))
        ) : (
          <p className="admin-eden-panel-empty">No fallback recorded</p>
        )}
      </div>
    </div>
  );
}

