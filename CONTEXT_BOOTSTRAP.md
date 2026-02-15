# Traceability System Context Bootstrap

You are working on a production-grade manufacturing traceability system.

You MUST read the following files before making any change:

1) docs/design-bible/v2*
2) README.md
3) CONTEXT_BOOTSTRAP.md
4) docs/codex/00_CODEX_EXECUTION_BASELINE.md

If anything conflicts:
Design Bible wins.

---

## System Core Rules (Non-Negotiable)

- Multi-model
- Multi-revision (active revision immutable)
- Optional variants
- Shared bonding machine
- Assembly binding is genealogy lock point
- Consumption per step completion
- RFID card circulation fixed
- Supplier pack tracking required
- Each supplier pack is traceable unit
- 92-byte tray label
- Serial reset by shift-day (08:00–07:59)
- Asia/Bangkok timezone
- Label generation requires online
- Offline queue allowed for events only

You must NEVER simplify or remove these constraints.
