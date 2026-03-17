# UAT execution checklist

Date baseline: 2026-02-13  
Scope: execute before production cutover.

**UAT Cycle 1 (T09):** First pass covers core scenarios only. Use [uat-cycle1.md](uat-cycle1.md) for scope and results; run sections 1 + 2 of [uat-script.md](uat-script.md). Full checklist below is for final UAT (T14).

---

## Environment precheck

- [ ] `backend/.env` and `web/.env` are configured for UAT environment
- [ ] PostgreSQL reachable from backend host
- [ ] Run `bun run check:go-live` from repo root
- [ ] Run `bun --cwd backend run db:migrate`
- [ ] Run `bun --cwd backend run db:seed` (if fresh env)

## Core scenario validation

- [ ] WITH_SHROUD flow: jigging -> bonding -> assembly -> label -> packing -> pallet
- [ ] NO_SHROUD flow: jigging -> bonding -> assembly -> label -> packing -> pallet
- [ ] Shared bonding with assembly divergence by line capability
- [ ] Assembly step duplicate scan blocked (`STEP_ALREADY_COMPLETED`)
- [ ] Required component enforcement (`MISSING_REQUIRED_COMPONENT`)
- [ ] Revision readiness enforcement (`REVISION_NOT_READY`)
- [ ] Invalid process order blocked (`INVALID_STATE_TRANSITION`)
- [ ] Variant mismatch blocked (`VARIANT_MISMATCH`)

## Offline and recovery

- [ ] Offline queue stores events during network loss
- [ ] Replay works in order when online returns
- [ ] Label generation blocked while offline (`OFFLINE_SERIAL_NOT_ALLOWED`)
- [ ] Queue monitor can retry/remove/clear pending events

## Traceability verification

- [ ] `GET /trace/tray/:id` returns upstream + downstream links
- [ ] `GET /trace/outer/:id` returns correct group/tray mapping
- [ ] `GET /trace/pallet/:id` returns all linked outers and children

## Sign-off

- [ ] Production owner sign-off
- [ ] Quality owner sign-off
- [ ] IT operations sign-off
