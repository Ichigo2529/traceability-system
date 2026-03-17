# Traceability System — Specifications (source of truth)

This folder is the **source of truth** for domain rules and implementation approach.

**Current system state (schema, API, routes):** see [../architecture/](../architecture/) — those docs are aligned with the actual code and database.

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

Implement in this order:

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

- **shift_day:** Production day determined by 08:00 boundary.
- **unit:** Traceable entity (jig batch, tray, outer bag, pallet, etc.).
- **unit_link:** Genealogy relation between units.
- **event:** Immutable operation record (idempotent).

Everything must follow the rules in the remaining documents in this folder (numbered 01–19). These are the single source of truth; the former v2 formal set has been retired and merged into this set.

## Numbered specs (01–19)

| File                                                     | Topic                            |
| -------------------------------------------------------- | -------------------------------- |
| [01-system-context.md](01-system-context.md)             | System context                   |
| [02-domain-model.md](02-domain-model.md)                 | Domain model                     |
| [03-data-model.md](03-data-model.md)                     | Data model (schema)              |
| [04-events.md](04-events.md)                             | Events and event catalog         |
| [05-api.md](05-api.md)                                   | API contract                     |
| [06-rbac.md](06-rbac.md)                                 | RBAC                             |
| [07-labels.md](07-labels.md)                             | Labels and serial allocation     |
| [08-offline.md](08-offline.md)                           | Offline and station queue        |
| [09-ui.md](09-ui.md)                                     | UI standards                     |
| [10-admin.md](10-admin.md)                               | Admin configuration              |
| [11-errors.md](11-errors.md)                             | Errors and validation            |
| [12-performance.md](12-performance.md)                   | Performance                      |
| [13-test.md](13-test.md)                                 | Test and quality                 |
| [14-deployment.md](14-deployment.md)                     | Deployment                       |
| [15-material-form.md](15-material-form.md)               | Material request form            |
| [16-supplier-pack.md](16-supplier-pack.md)               | Supplier pack and barcode        |
| [17-wash-and-consumption.md](17-wash-and-consumption.md) | Wash and consumption rules       |
| [18-traceability-chain.md](18-traceability-chain.md)     | Traceability chain and genealogy |
| [19-revision-and-variant.md](19-revision-and-variant.md) | Revision and variant governance  |
