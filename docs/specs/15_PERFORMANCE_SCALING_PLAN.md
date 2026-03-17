# 15 Performance & Scaling

## Heartbeat

Default: every 15 seconds per device.
Backend stores last_seen; UI shows online/offline.

## Event throughput

Assume:

- 3 assembly lines
- 1 event per step per batch
- events/sec manageable (< 20/s total typical)

## Database indexes (minimum)

- events(unit_id, received_at_server)
- units(unit_type, created_at)
- unit_links(parent_unit_id), unit_links(child_unit_id)
- serial_counters(part_number, shift_day, line_code) PK
- devices(fingerprint) unique

## Retention

- events retained for audit (policy-driven)
- consider monthly partitioning for events if volume grows

## Idempotency

event_id unique ensures replay safe (offline sync).
