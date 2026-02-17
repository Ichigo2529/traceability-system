import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "../ui/card";

export function StatCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string | number; hint?: string }) {
  return (
    <Card className="admin-stat-card">
      <CardContent className="admin-stat-card-content">
        <div className="admin-stat-card-copy">
          <p className="admin-stat-card-label">{label}</p>
          <p className="admin-stat-card-value">{value}</p>
          {hint ? <p className="admin-stat-card-hint">{hint}</p> : null}
        </div>
        <div className="admin-stat-card-icon-shell">
          <Icon className="admin-stat-card-icon" />
        </div>
      </CardContent>
    </Card>
  );
}
