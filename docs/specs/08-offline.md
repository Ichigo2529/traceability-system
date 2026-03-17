# Spec 08 – Offline and station queue

- **Storage:** Dexie (IndexedDB); events queued with created_at_device for replay order.
- **Replay:** In order when online; idempotency by event_id.
- **Limits:** Events only; no label generation or serial allocation offline. OFFLINE_SERIAL_NOT_ALLOWED when offline.
- **Conflict:** INVALID_STATE_TRANSITION etc. surfaced in queue monitor; retry/remove/clear as per UI.
