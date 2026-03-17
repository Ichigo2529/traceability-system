# API and routes (current)

Summary from `backend/src/app.ts` and `web/apps/admin/src/app/AppRoutes.tsx`.

---

## 1. Backend API (Elysia)

| Mount             | Route file                 | Purpose                                                                                                                                                                                                                                                        |
| ----------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (none)            | —                          | `GET /health`                                                                                                                                                                                                                                                  |
| auth              | `routes/auth`              | Login, refresh, logout                                                                                                                                                                                                                                         |
| (admin)           | `routes/admin`             | CRUD users, roles, models, revisions, variants, BOM, routing, devices, machines, stations, processes, suppliers, departments, cost centers, sections, barcode templates, workflow approval, label templates/bindings, readiness, audit logs, material requests |
| device            | `routes/device`            | Register, activate, heartbeat, operator login/logout/me                                                                                                                                                                                                        |
| events            | `routes/events`            | `POST /events` (idempotent), label generation                                                                                                                                                                                                                  |
| trace             | `routes/trace`             | Trace by unit (tray, outer, pallet)                                                                                                                                                                                                                            |
| material-requests | `routes/material-requests` | CRUD material requests, approve/reject, issue, receive                                                                                                                                                                                                         |
| inventory         | `routes/inventory`         | Inventory DO, inbound packs, receive scan                                                                                                                                                                                                                      |
| realtime          | `routes/realtime`          | Realtime channel (SSE/WebSocket if used)                                                                                                                                                                                                                       |

See `backend/src/routes/` and SDK types for per-endpoint details.

### Barcode template behavior (system + custom)

- `GET /admin/barcode-templates`
  - Returns merged list from:
    - System templates (built-in, read-only): `MARLIN_MAGNET_V1`, `MARLIN_PLATE_V1`, `MARLIN_PIN_V1`, `MARLIN_CRASH_STOP_V1`
    - Custom templates stored in `app_settings.key = "barcode_templates"`
  - Merge priority by key: `CUSTOM` overrides `SYSTEM` (same key).
  - Response rows include `source` (`SYSTEM` or `CUSTOM`) and `is_system` flag.

- `POST /admin/barcode-templates`
  - Creates custom template only.
  - Key must be unique across merged set (`SYSTEM` + `CUSTOM`).

- `PUT /admin/barcode-templates/:id`
- `DELETE /admin/barcode-templates/:id`
  - Allowed for custom templates only.
  - System templates are read-only and return `READONLY_TEMPLATE`.

- `GET /admin/supplier-pack-parsers`
  - Returns parser keys merged from static parser registry and active merged templates.

- `POST /admin/barcode-templates/test-parse`
  - Parse order:
    1. ad-hoc body template (if provided),
    2. template by `template_id`,
    3. merged active template map by `parser_key`,
    4. static parser fallback.

- `POST /admin/supplier-packs/receive`
  - Uses merged active template map for barcode parsing.
  - Supports runtime flexibility without changing built-in system templates.

---

## 2. Frontend routes (admin app)

### `/login`, `/test-ui`

- No auth required.

### `/admin` (RoleGuard: ADMIN)

| Path                                                                                    | Purpose                                                   |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `/admin`                                                                                | Dashboard                                                 |
| `users`, `roles`                                                                        | Users and roles                                           |
| `models`, `models/:id`, `models/:id/revisions/:revisionId`                              | Model, revision, variants, BOM, routing, bindings         |
| `component-types`, `part-numbers`, `master-routing-steps`                               | Master data                                               |
| `processes`, `stations`, `devices`, `machines`                                          | Process, stations, devices, machines                      |
| `approvals`                                                                             | Workflow approvals                                        |
| `suppliers`, `supplier-part-profiles`, `departments`, `cost-centers`, `sections`        | Organization and supplier                                 |
| `barcode-templates`, `inventory-do`, `vendor-pack-detail`, `inbound-packs`              | Barcode template, DO, packs                               |
| `material-requests`, `material-requests/new`, `material-requests/:id`                   | Material requests                                         |
| `templates`, `bom`, `readiness`, `audit-logs`, `heartbeat`, `system-health`, `recovery` | Templates, BOM, readiness, audit, heartbeat, set recovery |

### `/station` (RoleGuard: OPERATOR)

| Path                                                                     | Purpose                                       |
| ------------------------------------------------------------------------ | --------------------------------------------- |
| `register`, `login`                                                      | Device registration, operator login           |
| `jigging`, `bonding`, `magnetize-flux`, `scan`, `label`, `packing`, `fg` | Station screens                               |
| `queue`                                                                  | Offline queue monitor                         |
| `material/request`, `material/store`                                     | Material request (production), store approval |
| `history`                                                                | Station history                               |

---

## 3. Summary

- Backend: auth, admin CRUD, device, events, labels, trace, material-requests, inventory, realtime.
- Frontend: `/admin` for config and governance, `/station` for shopfloor and material flow.
- Per-endpoint details: `backend/src/routes/*.ts` and `web/packages/sdk`.
