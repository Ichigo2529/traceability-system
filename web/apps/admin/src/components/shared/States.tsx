import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Card, CardContent } from "../ui/card";

export function LoadingSkeleton({ label = "Loading..." }: { label?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{label}</span>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed bg-gradient-to-b from-white to-slate-50">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <div className="rounded-full border border-slate-200 bg-white p-3 shadow-sm">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="max-w-lg text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-red-200 bg-red-50/70">
      <CardContent className="flex items-center gap-3 py-4 text-red-800">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
