# Codex Execution Baseline

This file consolidates execution constraints from:
- `CONTEXT_BOOTSTRAP.md`
- `docs/codex/*.md`
- `docs/design-bible/v2/*.md`

If any conflict exists:
1. `docs/design-bible/*` (including `v2`) wins.
2. Then `CONTEXT_BOOTSTRAP.md`.
3. Then this file.

## Non-Negotiable Rules

- Multi-model and multi-revision are required.
- Active revision is immutable.
- Variant can only be assigned/changed before first assembly step.
- Consumption happens on step `*_DONE` events, not on pre-bind.
- Supplier pack tracking is mandatory:
  - Each supplier pack is a traceable unit.
  - Keep `qty_total` and `qty_remaining`.
  - Genealogy must support `Tray -> Assy -> Supplier Pack -> DO -> Supplier`.
- 92-byte internal label format must stay fixed-length.
- Serial scope is `(part_number, shift_day, line_code)`.
- Shift-day boundary is 08:00 in `Asia/Bangkok`.
- Label generation and serial allocation are online-only.
- Offline queue is allowed only for events.

## Required Safety Gates

- Gate A: Active revision read-only.
- Gate B: Variant lock after first assembly step.
- Gate C: Wash rules:
  - Plate must be washed before bonding.
  - Jigs must be washed before assembly bind.
- Gate D: Deduction occurs only on `DONE` event handlers.
- Gate E: Label/serial blocked offline.
- Gate F: Serial counter key must include shift-day + line + part.
- Gate G: Supplier pack remains auditable end-to-end.

## Engineering Process

Before significant changes:
1. Read `CONTEXT_BOOTSTRAP.md`.
2. Read `docs/design-bible/*` and `docs/design-bible/v2/*`.
3. Write/refresh CR using `docs/codex/CHANGE_REQUEST_TEMPLATE.md`.
4. Validate rules checklist and tests.
5. Update contracts/docs for any API/data-model change.

## Current Repository Notes

- `docs/codex/SAFE_EXECUTION_PROTOCOL.md` is authoritative in codex folder.
- Any duplicate copy files should be removed to avoid rule drift.
- `backend/src/scripts/validate-rules.ts` should be used as a lightweight rule guard.
