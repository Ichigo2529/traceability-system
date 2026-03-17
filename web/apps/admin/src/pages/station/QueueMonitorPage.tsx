import { useState } from "react";
import { useOfflineQueue, useQueuedEvents } from "@traceability/offline-queue";
import { PageHeader } from "../../components/shared/PageHeader";
import { StationHeader } from "../../components/shared/StationHeader";
import { EmptyState } from "../../components/shared/States";
import { ConfirmDialog } from "@traceability/ui";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { formatDateTime } from "../../lib/datetime";
import { PageStack } from "@traceability/ui";

export function QueueMonitorPage() {
  const { queue, isOnline, pendingCount } = useOfflineQueue();
  const queuedEvents = useQueuedEvents();
  const [busy, setBusy] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const retryNow = async () => {
    setBusy(true);
    try {
      await queue.process();
    } finally {
      setBusy(false);
    }
  };

  const removeEvent = async (id: number) => {
    setBusy(true);
    try {
      await queue.deletePending(id);
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    setBusy(true);
    try {
      await queue.clearPending();
    } finally {
      setBusy(false);
      setClearConfirmOpen(false);
    }
  };

  const hasStateTransitionErrors = queuedEvents.some((e) => e.last_error?.includes("INVALID_STATE_TRANSITION"));

  return (
    <PageStack>
      <PageHeader title="Queue Monitor" description="Inspect offline events and control replay behavior." />
      <StationHeader />

      {hasStateTransitionErrors && (
        <Alert className="bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-950/30 dark:border-yellow-700 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some events failed with state transition errors. Remove them or fix the unit state, then use Retry for
            others.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Queue Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge variant={isOnline ? "default" : "secondary"}>Network: {isOnline ? "Online" : "Offline"}</Badge>
          <Badge variant="outline">Pending: {pendingCount}</Badge>
          <Button onClick={retryNow} disabled={busy || !isOnline || pendingCount === 0}>
            Retry Now
          </Button>
          <Button variant="outline" onClick={() => setClearConfirmOpen(true)} disabled={busy || pendingCount === 0}>
            Clear Queue
          </Button>
        </CardContent>
      </Card>

      {!queuedEvents.length ? (
        <EmptyState title="Queue is empty" description="No offline events waiting for replay." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="px-4 py-3 text-left font-semibold text-foreground">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Event</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Unit</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Retries</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Last Error</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Created</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queuedEvents.map((event) => (
                    <tr key={event.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-foreground">{event.id}</td>
                      <td className="px-4 py-3 font-mono text-foreground">{event.event_type}</td>
                      <td className="px-4 py-3 font-mono text-foreground">{event.unit_id || "-"}</td>
                      <td className="px-4 py-3 text-foreground">{event.retry_count}</td>
                      <td className="px-4 py-3 text-muted-foreground">{event.last_error || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(event.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || event.id === undefined}
                          onClick={() => event.id !== undefined && removeEvent(event.id)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear All Queued Events"
        description="This will permanently delete all pending offline events. This action cannot be undone."
        confirmText="Clear All"
        destructive
        submitting={busy}
        onConfirm={clearAll}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </PageStack>
  );
}
