# Traceability System – Design Bible v1.0 (Source of Truth)

This folder is the authoritative specification for implementing the Traceability System.

## Non-negotiable rules

- No Docker for dev on Windows 11.
- Backend: Bun + Elysia + TypeScript + PostgreSQL (+ Drizzle).
- Frontend: React + Vite + UI5 Web Components for React (SAP Horizon).
- Pi5 stations run in kiosk mode and support offline event queue.
- Serial for 92-byte labels resets by shift-day window: 08:00–07:59 (next day).
- Multi-model, multi-revision; revisions are immutable once active.
- Optional variants; Marlin family uses WITH_SHROUD / NO_SHROUD.
- Shared Bonding machine for multiple variants/models; divergence happens at Assembly.
- Component tracking: Pin430/Pin300/Shroud/CrashStop use 1 jig = 1 RFID card.
- Assembly is the binding point for component genealogy; consumption happens per step completion.

## Implementation approach

Should implement:

1. Database schema + migrations + seeds
2. Auth & RBAC
3. Device registry + kiosk operator sessions + heartbeat
4. Event ingestion (idempotent) + domain validators
5. Shopfloor UIs (Pi5 stations) + offline queue
6. Admin UI for configuration (models, revisions, variants, BOM, routing, labels, machines, devices)
7. Label engine (92-byte) + shift-day serial allocator
8. Trace APIs
9. UAT scripts + seed scenarios

## Definitions

- shift_day: The production day determined by 08:00 boundary.
- unit: A traceable entity (jig batch, tray, outer bag, pallet, etc.)
- unit_link: genealogy relation between units
- event: immutable operation record (idempotent)

Everything must follow the rules in the remaining documents.
