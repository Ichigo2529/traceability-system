# V2 Alignment Gap Report

Scope reviewed:
- `CONTEXT_BOOTSTRAP.md`
- `docs/codex/*.md`
- `docs/design-bible/v2/*.md`
- Current backend/frontend implementation

## What Is Already Strong (Keep As-Is)

- Active revision lock is enforced in admin APIs (`REVISION_LOCKED`).
- Supplier pack domain exists with:
  - suppliers
  - inventory DO
  - supplier packs with remaining qty
  - genealogy links from ASSY to pack
- Bonding and consumption logic supports `SUPPLIER_PACK`.
- Shift-day and serial scope model are implemented.
- Offline queue exists and blocks label-related event types.
- End-to-end `bun run check` passes.

## Fixed Immediately in This Update

- Added consolidated context baseline:
  - `docs/codex/00_CODEX_EXECUTION_BASELINE.md`
- Normalized codex safety protocol wording:
  - `docs/codex/SAFE_EXECUTION_PROTOCOL.md`
- Linked bootstrap context to consolidated baseline:
  - `CONTEXT_BOOTSTRAP.md`
- Added executable rule guard script (checklist parity):
  - `backend/src/scripts/validate_rules.ts`
  - `backend/package.json` (`rules:validate`)
  - `package.json` (`check:backend` now includes rules validation)
- Added offline guard in SDK label generation:
  - `web/packages/sdk/src/services/event.ts`
- Cleaned shift-day source comments encoding:
  - `backend/src/lib/shift-day.ts`

## Gaps to Plan Next (Non-Breaking Backlog)

- Canonical ERD naming in v2 (`delivery_orders`, `part_numbers`, `component_types`)
  is not fully materialized as dedicated tables yet.
- Genealogy link vocabulary in v2 (`DERIVED_FROM`, `CONSUMES`, ...)
  differs from current production link types (`BONDED_FROM_*`, `BOUND_COMPONENT`, ...).
  Existing implementation is stable; introduce a formal mapping layer before renaming.
- Admin BOM UX still partially prompt-based in some pages and should be moved to typed dialog forms for operator-safe data entry.
- Formal performance controls (events partitioning strategy, replay SLO metrics) are documented but not yet automated.

## Safe Recommendation

- Keep current production behavior and contracts intact.
- Implement v2 alignment incrementally behind compatibility mapping and migration gates.
- Continue using `bun run check` + `bun run --cwd backend rules:validate` as the minimum merge gate.
