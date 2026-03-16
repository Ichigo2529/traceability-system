import { useState } from "react";
import { useOfflineQueue, useQueuedEvents } from "@traceability/offline-queue";
import { PageHeader } from "../../components/shared/PageHeader";
import { StationHeader } from "../../components/shared/StationHeader";
import { EmptyState } from "../../components/shared/States";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { formatDateTime } from "../../lib/datetime";
import { PageStack } from "@traceability/ui";

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
    <PageStack>
      <PageHeader title="Queue Monitor" description="Inspect offline events and control replay behavior." />
      <StationHeader />

      {queuedEvents.some((e) => e.last_error?.includes("INVALID_STATE_TRANSITION")) && (
        <div style={{ marginBottom: "1rem" }}>
          <span
            style={{
              display: "inline-block",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              background: "var(--sapWarningBackground)",
              color: "var(--sapCriticalTextColor)",
              fontSize: "0.875rem",
            }}
          >
            Some events failed with state transition errors. Remove them or fix the unit state, then use Retry for
            others.
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Queue Controls</CardTitle>
        </CardHeader>
        <CardContent className="admin-queue-controls-content">
          <span className="admin-queue-chip">Network: {isOnline ? "Online" : "Offline"}</span>
          <span className="admin-queue-chip">Pending: {pendingCount}</span>
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
            <div className="admin-queue-table-shell">
              <table className="admin-queue-table">
                <thead className="admin-queue-table-head">
                  <tr>
                    <th className="admin-queue-th">ID</th>
                    <th className="admin-queue-th">Event</th>
                    <th className="admin-queue-th">Unit</th>
                    <th className="admin-queue-th">Retries</th>
                    <th className="admin-queue-th">Last Error</th>
                    <th className="admin-queue-th">Created</th>
                    <th className="admin-queue-th admin-queue-th--right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queuedEvents.map((event) => (
                    <tr key={event.id} className="admin-queue-row">
                      <td className="admin-queue-td">{event.id}</td>
                      <td className="admin-queue-td admin-queue-td--mono">{event.event_type}</td>
                      <td className="admin-queue-td admin-queue-td--mono">{event.unit_id || "-"}</td>
                      <td className="admin-queue-td">{event.retry_count}</td>
                      <td className="admin-queue-td admin-queue-td--muted">{event.last_error || "-"}</td>
                      <td className="admin-queue-td admin-queue-td--muted">{formatDateTime(event.created_at)}</td>
                      <td className="admin-queue-td admin-queue-td--right">
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
    </PageStack>
  );
}
