# Cutover rehearsal checklist

Detailed checklist for T-1 dry run and go-live day. Use with [runbook-go-live.md](runbook-go-live.md).

---

## T-1 day (dry run)

**Date:** **\*\***\_\_\_**\*\***

### Config and code freeze

| #   | Task                                                                         | Done | Notes |
| --- | ---------------------------------------------------------------------------- | ---- | ----- |
| 1   | Readiness validation PASS (no open P0/P1 for go-live)                        | [ ]  |       |
| 2   | Config freeze: no further config changes after this point except per runbook | [ ]  |       |
| 3   | Code / build frozen for cutover (tag or branch as per process)               | [ ]  |       |

### Commands and DB

| #   | Task                                                                                | Done | Notes                    |
| --- | ----------------------------------------------------------------------------------- | ---- | ------------------------ |
| 4   | Run `bun run check:go-live` from repo root                                          | [ ]  | Result: **\_**           |
| 5   | Run `bun --cwd backend run db:migrate` on target DB                                 | [ ]  |                          |
| 6   | Execute all items in [uat-checklist.md](uat-checklist.md) (or confirm last UAT run) | [ ]  |                          |
| 7   | Verify device inventory: all production devices `active`                            | [ ]  |                          |
| 8   | Verify heartbeat visible in admin devices module                                    | [ ]  |                          |
| 9   | Backup production DB snapshot                                                       | [ ]  | Backup path/time: **\_** |
| 10  | Confirm restore procedure (restore from snapshot and smoke test)                    | [ ]  |                          |

### Contacts and rollback

| #   | Task                                            | Done | Notes       |
| --- | ----------------------------------------------- | ---- | ----------- |
| 11  | Rollback owner and contact confirmed            | [ ]  |             |
| 12  | Rollback triggers and steps read and understood | [ ]  | See runbook |

**T-1 lead:** **\*\***\_\_\_**\*\***  
**T-1 result:** Go / No-go. Notes: **\*\***\_\_\_**\*\***

---

## Go-live day

**Date:** **\*\***\_\_\_**\*\***

### Pre-start

| #   | Task                                       | Done | Notes |
| --- | ------------------------------------------ | ---- | ----- |
| 1   | Backend and frontend deployed per runbook  | [ ]  |       |
| 2   | DB migrated; env verified                  | [ ]  |       |
| 3   | Production revision set to ACTIVE in admin | [ ]  |       |

### Station and first events

| #   | Task                                                     | Done | Notes |
| --- | -------------------------------------------------------- | ---- | ----- |
| 4   | Station login successful on each line                    | [ ]  |       |
| 5   | First event submission successful per line (or per plan) | [ ]  |       |
| 6   | Label generation success verified                        | [ ]  |       |

### First-hour monitoring

| #   | Task                                                             | Done | Notes |
| --- | ---------------------------------------------------------------- | ---- | ----- |
| 7   | Device heartbeat dashboard: all devices reporting                | [ ]  |       |
| 8   | Queue monitor: pending count acceptable; no unexplained failures | [ ]  |       |
| 9   | Label generation success rate acceptable                         | [ ]  |       |
| 10  | Manual fallback operator on standby for queue conflict handling  | [ ]  |       |

### Sign-off

| #   | Task                                             | Done | Notes |
| --- | ------------------------------------------------ | ---- | ----- |
| 11  | Go-live day checklist signed off by go-live lead | [ ]  |       |

**Go-live lead:** **\*\***\_\_\_**\*\***  
**Time first event:** **\*\***\_\_\_**\*\***  
**Issues (if any):** **\*\***\_\_\_**\*\***

---

## Rollback (if triggered)

- **Triggers:** See [runbook-go-live.md](runbook-go-live.md) (label failures, REVISION_NOT_READY, INVALID_STATE_TRANSITION, backend unavailable).
- **Steps:** Stop new production starts; safe mode for stations; restore revision/config; if required restore DB snapshot and smoke test (login, one event, one trace).

**Rollback executed:** [ ] Yes [ ] No  
**Time:** **\*\***\_\_\_**\*\***  
**Post-rollback notes:** **\*\***\_\_\_**\*\***
