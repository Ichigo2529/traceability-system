# 09 Offline Sync Strategy

## Network SLA

Uptime target ~99.70%. Short drops 1–5 minutes expected.

## Offline support

- Shopfloor apps queue events in Dexie offline queue.
- Events are replayed in order; server is idempotent by event_id.

## Online-only operations

- Label generation / serial allocation
  Reason: requires centralized locking to prevent duplicate serial.

## UX rules

- Always show:
  - Network status (online/offline)
  - Pending queue count
- If offline and user tries label generation: show OFFLINE_SERIAL_NOT_ALLOWED

## Replay guarantees

- Client includes created_at_device timestamp.
- Server records received_at_server.
- Timeline uses device timestamps but stored with server time for audit.

## Conflict resolution

- event_id idempotency prevents duplicate writes.
- If a step would become invalid due to newer state:
  - server returns INVALID_STATE_TRANSITION
  - client shows “need supervisor review” flow
