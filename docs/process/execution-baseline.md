# Execution baseline

This file consolidates execution constraints from:

- [../history/context-bootstrap.md](../history/context-bootstrap.md)
- `docs/process/*.md`
- `docs/specs/`

If any conflict exists:

1. `docs/specs/*` wins.
2. Then [../history/context-bootstrap.md](../history/context-bootstrap.md).
3. Then this file.

## Non-negotiable rules

- Multi-model and multi-revision are required.
- Active revision is immutable.
- Variant can only be assigned/changed before first assembly step.
- Consumption happens on step `*_DONE` events, not on pre-bind.
- Supplier pack tracking is mandatory; genealogy must support Tray → Assy → Supplier Pack → DO → Supplier.
- 92-byte internal label format must stay fixed-length.
- Serial scope is `(part_number, shift_day, line_code)`.
- Shift-day boundary is 08:00 in Asia/Bangkok.
- Label generation and serial allocation are online-only.
- Offline queue is allowed only for events.

## Required safety gates

- Gate A: Active revision read-only.
- Gate B: Variant lock after first assembly step.
- Gate C: Wash rules (plate before bonding; jigs before assembly bind).
- Gate D: Deduction only on DONE event handlers.
- Gate E: Label/serial blocked offline.
- Gate F: Serial counter key must include shift-day + line + part.
- Gate G: Supplier pack remains auditable end-to-end.

## Engineering process

Before significant changes:

1. Read [../history/context-bootstrap.md](../history/context-bootstrap.md).
2. Read `docs/specs/`.
3. Write/refresh CR using [change-request-template.md](change-request-template.md).
4. Validate rules checklist and tests.
5. Update reference/docs for any API or data-model change.

Use `backend/src/scripts/validate-rules.ts` (or equivalent) as a lightweight rule guard.
