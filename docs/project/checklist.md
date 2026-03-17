# Implementation checklist (aligned with current codebase)

Implementation status aligned with the current codebase.

**Legend:** `[x]` done | `[~]` in progress | `[ ]` not started

---

## Foundation

- `[x]` Monorepo (backend, web/apps, web/packages, docs)
- `[x]` Bun workspaces, root scripts (dev:\*, check, check:go-live)
- `[x]` PostgreSQL + Drizzle, migrations + seed
- `[x]` Auth (JWT + refresh), RBAC, roles/permissions
- `[x]` Device register/activate/heartbeat, operator login/logout/me
- `[x]` Events API (idempotent by event_id), state machine, event catalog
- `[x]` Label engine (92-char), serial counter (part_number, shift_day, line_code)
- `[x]` Trace APIs (tray, outer, pallet)
- `[x]` Realtime channel

---

## Database (aligned with current schema)

- `[x]` Auth, config, organization, devices, production, genealogy, labels, inventory, material requests, audit (see [../architecture/database.md](../architecture/database.md))

---

## Admin UI (routes in AppRoutes)

- `[x]` Dashboard, users, roles, models, revisions, variants, BOM, routing
- `[x]` Component types, part numbers, master routing steps
- `[x]` Processes, stations, devices, machines, approvals
- `[x]` Suppliers, supplier part profiles, departments, cost centers, sections
- `[x]` Barcode templates, inventory DO, inbound packs, vendor pack detail
- `[x]` Material requests (list, create, detail), approve/issue flow
- `[x]` Label templates, readiness, audit logs, heartbeat, system health, set recovery

---

## Station UI

- `[x]` Device register, operator login
- `[x]` Jigging, bonding, magnetize/flux, scan, label, packing, FG (per routes)
- `[x]` Queue monitor, material request (production), store approval, history

---

## Material flow (end-to-end)

- `[x]` API: create request, approve/reject, issue, receive
- `[x]` Full UI flow: submit → approve → allocate → issue → print (voucher); receive via Forklift Intake / Store Approvals

---

## Offline and UAT / go-live

- `[x]` Offline queue (Dexie), replay by created_at_device
- `[x]` Conflict handling (INVALID_STATE_TRANSITION) / manual review; queue monitor retry, remove, clear
- `[ ]` UAT execution sign-off
- `[ ]` Cutover rehearsal, go-live

---

Domain and event detail: [../specs/](../specs/). Program status: [roadmap.md](roadmap.md).
