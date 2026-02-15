# Go-Live Status

Updated: 2026-02-13

## Engineering Gates

- `bun run check` -> PASS
- `bun run check:backend` -> PASS
- `bun run --cwd backend rules:validate` -> PASS

## Completed Hardening in This Cycle

- Codex/design-bible execution baseline consolidated.
- Rule validator script added and wired into backend/root checks.
- SDK online-only guard for label generation (`OFFLINE_SERIAL_NOT_ALLOWED`).
- Admin heartbeat monitor added:
  - route: `/admin/heartbeat`
  - search/filter + online window awareness
- BOM admin UX hardened:
  - removed prompt flow on BOM pages
  - added validated dialog form for create/edit
- Revision governance UX hardened:
  - Variant create/edit via dialog forms
  - Routing create/edit via dialog forms
  - Label binding create/edit via dialog forms
- Inbound supplier pack receive UX hardened:
  - removed prompt flow
  - added validated dialog form

## Remaining Items Before Real Production Cutover

These require environment execution/sign-off (cannot be auto-completed in code only):

- Execute full UAT in target environment:
  - `docs/ops/UAT_EXECUTION_CHECKLIST.md`
- Run cutover rehearsal and rollback rehearsal:
  - `docs/ops/GO_LIVE_CUTOVER_RUNBOOK.md`
- Final owner approvals:
  - Production owner
  - Quality owner
  - IT operations

## Go-Live Command

From repo root:

```bash
bun run check:go-live
```
