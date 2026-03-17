# Go-live status

Updated: 2026-02-13

## Engineering gates

- `bun run check` → PASS
- `bun run check:backend` → PASS
- `bun run --cwd backend rules:validate` → PASS

## Completed hardening in this cycle

- Execution baseline consolidated in [../process/execution-baseline.md](../process/execution-baseline.md).
- Rule validator script added and wired into backend/root checks.
- SDK online-only guard for label generation (`OFFLINE_SERIAL_NOT_ALLOWED`).
- Admin heartbeat monitor: route `/admin/heartbeat`, search/filter, online window awareness.
- BOM admin UX: validated dialog form for create/edit.
- Revision governance: variant, routing, and label binding create/edit via dialog forms.
- Inbound supplier pack receive: validated dialog form.

## Remaining before production cutover

- Execute full UAT: [../operations/uat-checklist.md](../operations/uat-checklist.md)
- Cutover and rollback rehearsal: [../operations/runbook-go-live.md](../operations/runbook-go-live.md)
- Final sign-offs: Production owner, Quality owner, IT operations

## Go-live command

From repo root: `bun run check:go-live`
