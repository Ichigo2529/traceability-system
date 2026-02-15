import { useState } from "react";
import { useOfflineQueue, useQueuedEvents } from "@traceability/offline-queue";
import { PageHeader } from "../../components/shared/PageHeader";
import { StationHeader } from "../../components/shared/StationHeader";
import { EmptyState } from "../../components/shared/States";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { formatDateTime } from "../../lib/datetime";

export function QueueMonitorPage() {
  const { queue, isOnline, pendingCount } = useOfflineQueue();
  const queuedEvents = useQueuedEvents();
  const [busy, setBusy] = useState(false);

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
    if (!confirm("Clear all queued events?")) return;
    setBusy(true);
    try {
      await queue.clearPending();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Queue Monitor" description="Inspect offline events and control replay behavior." />
      <StationHeader />

      <Card>
        <CardHeader>
          <CardTitle>Queue Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded bg-slate-100 px-2 py-1">Network: {isOnline ? "Online" : "Offline"}</span>
          <span className="rounded bg-slate-100 px-2 py-1">Pending: {pendingCount}</span>
          <Button onClick={retryNow} disabled={busy || !isOnline || pendingCount === 0}>
            Retry Now
          </Button>
          <Button variant="outline" onClick={clearAll} disabled={busy || pendingCount === 0}>
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
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">ID</th>
                    <th className="px-3 py-2 text-left">Event</th>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-left">Retries</th>
                    <th className="px-3 py-2 text-left">Last Error</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queuedEvents.map((event) => (
                    <tr key={event.id} className="border-t">
                      <td className="px-3 py-2">{event.id}</td>
                      <td className="px-3 py-2 font-mono text-xs">{event.event_type}</td>
                      <td className="px-3 py-2 font-mono text-xs">{event.unit_id || "-"}</td>
                      <td className="px-3 py-2">{event.retry_count}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{event.last_error || "-"}</td>
                      <td className="px-3 py-2 text-xs">{formatDateTime(event.created_at)}</td>
                      <td className="px-3 py-2 text-right">
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
    </div>
  );
}
