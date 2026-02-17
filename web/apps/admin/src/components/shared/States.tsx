import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Card, CardContent } from "../ui/card";

export function LoadingSkeleton({ label = "Loading..." }: { label?: string }) {
  return (
    <Card className="admin-state-card admin-state-card--loading">
      <CardContent className="admin-state-content admin-state-content--loading">
        <Loader2 className="admin-state-icon admin-state-icon--spin" />
        <span>{label}</span>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="admin-state-card admin-state-card--empty">
      <CardContent className="admin-state-content admin-state-content--empty">
        <div className="admin-state-icon-shell">
          <Inbox className="admin-state-icon admin-state-icon--lg" />
        </div>
        <h3 className="admin-state-title">{title}</h3>
        <p className="admin-state-description">{description}</p>
      </CardContent>
    </Card>
  );
}

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="admin-state-card admin-state-card--error">
      <CardContent className="admin-state-content admin-state-content--error">
        <AlertTriangle className="admin-state-icon admin-state-icon--error" />
        <div>
          <p className="admin-state-error-title">{title}</p>
          <p className="admin-state-error-description">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
