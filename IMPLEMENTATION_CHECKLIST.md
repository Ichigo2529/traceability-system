# Implementation Checklist

> Derived from `docs/design-bible/` (v1.0). Design Bible is the source of truth. If conflict exists, the Bible wins.

Legend:
- `[ ]` not started
- `[~]` in progress / partial
- `[x]` done

---

## Phase 0 - Project Scaffold & Dev Environment

- `[x]` Monorepo structure (`backend/`, `web/apps/*`, `web/packages/*`, `docs/`)
- `[x]` Root `package.json` + workspace config (Bun workspaces)
- `[x]` Shared root `tsconfig` base
- `[x]` Linting & formatting baseline (Prettier at repo root; ESLint app/package level)
- `[x]` `.env.example` files for backend & web
- `[x]` PostgreSQL local install verified, `DATABASE_URL` works
- `[x]` `bun install` / root scripts work from root (`dev:*`, `check`, `check:go-live`)

---

## Phase 1 - Database Schema & Migrations

> Ref: `04_DATA_MODEL_ERD`, `03_DOMAIN_RULEBOOK`, `15_PERFORMANCE`

- `[x]` Drizzle ORM setup (`drizzle.config.ts`, `migrate` script)
- `[x]` Auth tables: `users`, `roles`, `user_roles`, `refresh_tokens`
- `[x]` Device tables: `devices`, `machines`, `device_operator_sessions`
- `[x]` Config tables: `models`, `model_revisions`, `variants`
- `[x]` BOM / Routing: `bom`, `routing`, `routing_steps`
- `[x]` Core tables: `units`, `unit_links`, `events`
- `[x]` Inventory: `inventory_do`, `component_2d_scans`
- `[x]` Supplier traceability add-on: `suppliers`, `supplier_packs`, DO extension (supplier/part/qty/date)
- `[x]` Label tables: `label_templates`, `label_bindings`, `labels`, `serial_counters`
- `[x]` Audit: `config_audit_logs`
- `[x]` Optional: `holds` / `exceptions`
- `[x]` Key constraints & indexes (active revision uniqueness, `event_id` unique, serial PK, device uniqueness)
- `[x]` Seed script (roles + initial admin)

---

## Phase 2 - Auth & RBAC

> Ref: `08_RBAC_AUTH_DEVICE_MODEL`, `07_API_CONTRACTS`

- `[x]` `POST /auth/login` (JWT + refresh token)
- `[x]` `POST /auth/refresh` (token rotation)
- `[x]` `POST /auth/logout`
- `[x]` Access token TTL 45 min, refresh TTL 16 h
- `[x]` bcrypt password hashing
- `[x]` Roles: ADMIN, SUPERVISOR, OPERATOR, STORE, PRODUCTION, QA
- `[x]` RBAC middleware (admin guard + role checks)
- `[x]` Auth source field (`local` now; `ldap` later)

---

## Phase 3 - Device Registry & Kiosk Sessions

> Ref: `08_RBAC_AUTH_DEVICE_MODEL`, `07_API_CONTRACTS`, `15_PERFORMANCE`

- `[x]` `POST /device/register`
- `[x]` `POST /device/activate`
- `[x]` `POST /device/heartbeat`
- `[x]` Admin assigns device (machine/station/process supported)
- `[x]` `POST /device/operator/login`
- `[x]` `POST /device/operator/logout`
- `[x]` `GET /device/operator/me`
- `[x]` Resolve `operator_user_id` from active device operator session in event flow

---

## Phase 4 - Event Ingestion & Domain Validators

> Ref: `06_EVENT_CATALOG`, `07_API_CONTRACTS`, `05_STATE_MACHINES`, `03_DOMAIN_RULEBOOK`, `14_ERROR_HANDLING`

- `[x]` `POST /events` endpoint (idempotent by `event_id`)
- `[x]` Auth supports JWT and Device path (Device-Token + HMAC headers)
- `[x]` Dispatch events: `DISPATCH_CREATED`, `DISPATCH_CONFIRMED`, `DISPATCH_RETURNED`
- `[x]` Plate flow: `PLATE_LOADED`, `WASH1_START/END`, `BONDING_PLATE_SCANNED`
- `[x]` Magnet flow: `MAGNET_PREPARED`, `BONDING_MAGNET_SCANNED`, `MAGNET_CARD_RETURNED`
- `[x]` Component jigs: `JIG_LOADED`, `WASH2_START/END`, `JIG_RETURNED`
- `[x]` Bonding: `BONDING_START`, `BONDING_END`
- `[x]` Magnetize / Flux: `MAGNETIZE_DONE`, `FLUX_PASS`, `FLUX_FAIL`
- `[x]` Assembly binding: `ASSY_BIND_COMPONENTS`
- `[x]` Assembly steps: `PRESS_FIT_*_DONE`, `CRASH_STOP_DONE`, `IONIZER_DONE` equivalent set mostly implemented
- `[x]` FVMI: `FVMI_PASS` + `FVMI_FAIL` aligned to HOLD flow
- `[x]` Labeling events: `LABEL_GENERATE_REQUEST`, `LABELS_GENERATED`
- `[x]` Split / Packing / FG: `SPLIT_GROUP_CREATED`, `OUTER_PACKED`, `FG_PALLET_MAPPED`
- `[x]` State machine enforcement improved (handlers + transition validation + routing step checks in assembly path)
- `[x]` Error matrix normalization in event handlers/events route (`INVALID_STATE_TRANSITION` contract)
- `[x]` Revision readiness guard (`REVISION_NOT_READY`) enforced in assembly + bonding/magnetize/flux/label paths
- `[~]` Double-consumption prevention partially implemented in assembly/jig links
- `[x]` Bonding can consume `SUPPLIER_PACK` and deduct pack remaining with ASSY link genealogy

---

## Phase 5 - Label Engine (92-byte) & Serial Allocator

> Ref: `10_LABEL_ENGINE_92_SHIFT_SERIAL`, `03_DOMAIN_RULEBOOK`

- `[x]` `shift_day` computation (Asia/Bangkok, 08:00 boundary)
- `[x]` Serial counter PK `(part_number, shift_day, line_code)`, range 0001-9999
- `[x]` Atomic serial allocation
- `[x]` Template engine supports 92-char payload strategy
- `[x]` Template bindings by `(model_revision_id, variant_id, unit_type, process_point)`
- `[x]` `POST /labels/generate` resolves part/variant/template from config + bindings (production path)
- `[x]` Block when serial exceeds 9999 (`SERIAL_EXHAUSTED`)

---

## Phase 6 - Trace APIs

> Ref: `07_API_CONTRACTS`

- `[x]` `GET /trace/tray/:unit_id` implemented (genealogy + events)
- `[x]` `GET /trace/outer/:unit_id`
- `[x]` `GET /trace/pallet/:unit_id`
- `[x]` Recursive unit-link traversal implemented for tray/outer/pallet flows

---

## Phase 7 - Admin UI (Web)

> Ref: `13_ADMIN_CONFIGURATION_GOVERNANCE`, `12_UI_REQUIREMENTS`

### 7.1 Admin App Shell & Auth
- `[x]` Admin app shell + routing
- `[x]` Login screen
- `[x]` Auth integration `/auth/login` + token persistence
- `[x]` Global auth guard
- `[x]` RBAC route guard
- `[x]` Logout flow
- `[~]` Error display by backend `error_code` (partial)

### 7.2 Dashboard
- `[~]` Basic summary widgets done
- `[~]` Device online/offline summary partial
- `[ ]` Rich filtering/search by machine/line/status in dashboard
- `[~]` Quick links partial

### 7.3 Users & Roles
- `[x]` Users list + create/edit
- `[~]` Search available (client-side), pagination basic
- `[~]` Activate/deactivate UX not fully explicit
- `[x]` Role assignment (multi-select)
- `[x]` ADMIN-only guard

### 7.4 Machines
- `[~]` Backend CRUD exists
- `[x]` New admin route/UI for machines is wired in `/admin` navigation

### 7.5 Devices
- `[x]` Device list + status + last heartbeat
- `[x]` Add/Edit + disable/enable/maintenance
- `[x]` Regenerate secret key
- `[~]` Assignment UX focused on station/process; machine-centric UX partial

### 7.6 Models
- `[x]` Models list/create/edit
- `[~]` Archive/deactivate available as active flag behavior

### 7.7 Revisions
- `[~]` Backend endpoints complete
- `[x]` Revision pages wired in `/admin` routes

### 7.8 Variants
- `[~]` Backend endpoints complete
- `[x]` Variant UI wired in revision details route
- `[x]` Variant create/edit in revision details uses dialog forms (no prompt UX)

### 7.9 BOM Editor
- `[x]` Backend endpoints complete
- `[x]` BOM UI wired in revision details route
- `[x]` BOM create/edit migrated from prompt UX to validated dialog form

### 7.10 Routing Editor
- `[~]` Backend endpoints complete
- `[x]` Routing UI wired in revision details route
- `[x]` Routing create/edit in revision details uses dialog forms (no prompt UX)

### 7.11 Label Templates & Bindings
- `[~]` Backend endpoints complete
- `[x]` UI wired in `/admin/templates` and revision binding tab
- `[x]` Binding create/edit in revision details uses dialog forms (no prompt UX)

### 7.12 Readiness Validator
- `[~]` Backend endpoint exists
- `[x]` UI wired in `/admin/readiness`

### 7.13 Config Audit Logs
- `[~]` Backend endpoint exists
- `[x]` UI wired in `/admin/audit-logs`

### 7.14 Device Heartbeat & Status
- `[x]` Last seen + online indicator exists in devices module
- `[x]` Dedicated heartbeat dashboard/timeline (`/admin/heartbeat`) with search/filter is available

### 7.15 End-to-End Admin Flow Quick Checks
- `[~]` Partial flow works (models/process/station/device/users/roles/approvals)
- `[~]` Full flow from model -> revision -> variants -> BOM -> routing -> labels -> validator -> activate is now routed; UX hardening still pending

### 7.16 Production Material Request (Direct Material Issue Voucher)
- `[~]` Domain/form mapping draft added from real paper form (`docs/design-bible/19_DIRECT_MATERIAL_ISSUE_VOUCHER_FORM.md`)
- `[~]` DB schema groundwork added: `material_requests`, `material_request_items`
- `[ ]` API flow: create request / approve-reject / issue
- `[ ]` UI flow: production submit form + store issue screen

---

## Phase 8 - Shopfloor UIs (Pi5 Kiosk + Station Apps)

> Ref: `12_UI_REQUIREMENTS_BY_STATION`, `09_OFFLINE_SYNC_STRATEGY`

### Common
- `[~]` Common station shell exists in `web/apps/admin` station routes
- `[~]` Operator login implemented

### Station Apps
- `[~]` Jigging (Plate load) UI wired in routed app
- `[~]` Wash1 (Plate) UI wired in routed app
- `[~]` Wash2 (Component jigs) UI wired in routed app
- `[~]` Bonding/Assembly-like scan flow (simplified)
- `[~]` Magnetize / Flux UI wired in routed app
- `[~]` Assembly Start (simplified, routed as Assembly station)
- `[~]` Assembly Steps (catalog event types wired)
- `[~]` Label/Packing flow split into dedicated Label + Packing pages
- `[~]` Split / Packing station (simplified)
- `[~]` FG station routed in unified app

---

## Phase 9 - Offline Queue (Dexie)

> Ref: `09_OFFLINE_SYNC_STRATEGY`

- `[x]` `web/packages/offline-queue` package exists
- `[x]` Queue stores `event_id` + `created_at_device`
- `[x]` Replay in-order when online
- `[~]` Supervisor-review flow on `INVALID_STATE_TRANSITION` (queue monitor + manual control added, approval workflow still pending)
- `[x]` Offline block rule aligned to final contract (`LABEL_GENERATE_REQUEST`, `LABELS_GENERATED`)
- `[x]` Queue count surfaced in unified station header

---

## Phase 10 - UAT & Seed Scenarios

> Ref: `16_TEST_UAT_PLAYBOOK`

- `[~]` Formal UAT execution checklist created (`docs/ops/UAT_EXECUTION_CHECKLIST.md`)
- `[ ]` UAT execution sign-off on target environment

---

## Phase 11 - Go-live

> Ref: `17_DEPLOYMENT_GO_LIVE_PLAYBOOK`

- `[~]` Cutover runbook + go-live gate command added (`docs/ops/GO_LIVE_CUTOVER_RUNBOOK.md`, `bun run check:go-live`)
- `[ ]` Production cutover and rollback rehearsal execution
