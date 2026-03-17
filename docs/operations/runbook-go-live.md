# Go-live cutover runbook

Date baseline: 2026-02-13

**Related:** [cutover-rehearsal-checklist.md](cutover-rehearsal-checklist.md) (detailed T-1 and go-live checklist), [uat-checklist.md](uat-checklist.md), [sign-off-template.md](sign-off-template.md).

---

## Environment and contacts (fill before go-live)

| Item                         | Value / placeholder                    |
| ---------------------------- | -------------------------------------- |
| Production backend URL       | `________________`                     |
| Production frontend URL      | `________________`                     |
| DB host (for backup/restore) | `________________`                     |
| Backup path / procedure      | `________________`                     |
| Restore verification command | e.g. `bun --cwd backend run db:health` |
| Go-live lead                 | `________________`                     |
| Rollback owner               | `________________`                     |
| On-call / escalation         | `________________`                     |

---

## T-1 day (dry run)

1. Freeze config changes after readiness validation PASS.
2. Run:
   - `bun run check:go-live`
   - `bun --cwd backend run db:migrate`
3. Execute all items in [uat-checklist.md](uat-checklist.md) (or use [cutover-rehearsal-checklist.md](cutover-rehearsal-checklist.md) for step-by-step).
4. Verify device inventory:
   - all production devices are `active`
   - heartbeat visible in admin devices module
5. Backup production DB snapshot and confirm restore procedure (document path and test restore).

## Go-live day

1. Enable production revision (ACTIVE) in admin.
2. Confirm station login and first-event submission on each line.
3. Monitor first-hour dashboards:
   - device heartbeat
   - queue monitor pending count
   - label generation success
4. Keep manual fallback operator on standby for queue conflict handling.

## Rollback triggers

- Sustained label generation failures
- Repeated `REVISION_NOT_READY` on active line
- Systemic `INVALID_STATE_TRANSITION` due to config mismatch
- Backend unavailable over agreed SLA threshold

## Rollback steps

1. Stop new production starts.
2. Keep stations in safe mode (queueing only where applicable).
3. Restore last known-good revision/config.
4. If required, restore DB snapshot and re-open line after smoke validation:
   - login
   - one event submit
   - one trace query

---

## References

- [cutover-rehearsal-checklist.md](cutover-rehearsal-checklist.md) — detailed T-1 and go-live day checklist
- [uat-checklist.md](uat-checklist.md) — UAT execution checklist
- [uat-script.md](uat-script.md) — step-by-step UAT script
- [sign-off-template.md](sign-off-template.md) — Production, Quality, IT sign-off
