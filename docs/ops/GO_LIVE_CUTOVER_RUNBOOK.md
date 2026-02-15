# Go-live Cutover Runbook

Date baseline: 2026-02-13

## T-1 Day (Dry Run)

1. Freeze config changes after readiness validation PASS.
2. Run:
   - `bun run check:go-live`
   - `bun --cwd backend run db:migrate`
3. Execute all items in `docs/ops/UAT_EXECUTION_CHECKLIST.md`.
4. Verify device inventory:
   - all production devices are `active`
   - heartbeat visible in admin devices module
5. Backup production DB snapshot and confirm restore procedure.

## Go-live Day

1. Enable production revision (ACTIVE) in admin.
2. Confirm station login and first-event submission on each line.
3. Monitor first-hour dashboards:
   - device heartbeat
   - queue monitor pending count
   - label generation success
4. Keep manual fallback operator on standby for queue conflict handling.

## Rollback Triggers

- sustained label generation failures
- repeated `REVISION_NOT_READY` on active line
- systemic `INVALID_STATE_TRANSITION` due config mismatch
- backend unavailable over agreed SLA threshold

## Rollback Steps

1. Stop new production starts.
2. Keep stations in safe mode (queueing only where applicable).
3. Restore last known-good revision/config.
4. If required, restore DB snapshot and re-open line after smoke validation:
   - login
   - one event submit
   - one trace query

