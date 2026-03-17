# Traceability system context bootstrap

You are working on a production-grade manufacturing traceability system.

**Current system state (schema, API, routes):** [../architecture/](../architecture/)

Before making any significant change, read:

1. [../specs/](../specs/)
2. [../../README.md](../../README.md) (repo root)
3. [../process/execution-baseline.md](../process/execution-baseline.md)

If anything conflicts, the specs (design-bible) win.

## System core rules (non-negotiable)

- Multi-model, multi-revision (active revision immutable), optional variants
- Shared bonding machine; assembly binding is the genealogy lock point
- Consumption per step completion; RFID card circulation fixed
- Supplier pack tracking required; each supplier pack is a traceable unit
- 92-byte tray label; serial reset by shift-day (08:00–07:59); Asia/Bangkok timezone
- Label generation requires online; offline queue allowed for events only

You must never simplify or remove these constraints.
