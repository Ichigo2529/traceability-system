# Spec 04 – Events and event catalog

- **Ingestion:** `POST /events` — idempotent by `event_id` (UUID). Replay order: `created_at_device`.
- **State machine:** Valid transitions and rejections (e.g. INVALID_STATE_TRANSITION, REVISION_NOT_READY, STEP_ALREADY_COMPLETED, MISSING_REQUIRED_COMPONENT, VARIANT_MISMATCH) — see backend event handlers.
- **Attribution:** Operator and device; audit trail.
- **Offline:** Events stored in Dexie; replayed when online; label/serial allocation online-only.
