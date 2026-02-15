# API Baseline v1

Date: 2026-02-13
Source: current backend implementation in `backend/src/routes/*`

This document freezes the current API surface before further refactors.
If endpoint shape changes, update this file and include migration notes in PR.

## Response Contract

Success:
```json
{ "success": true, "data": {} }
```

Error:
```json
{ "success": false, "error_code": "CODE", "message": "Readable message" }
```

## Health

- `GET /health`

## Auth (`/auth`)

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

## Device (`/device`)

- `POST /device/register`
- `POST /device/activate`
- `POST /device/heartbeat`
- `POST /device/operator/login`
- `POST /device/operator/logout`
- `GET /device/operator/me`

## Events + Labels

- `POST /events`
- `POST /events/validate-transition`
- `POST /labels/generate`

Auth options for event ingest:
- Bearer access token
- `Device-Token` + active operator session (legacy compatibility)
- HMAC headers: `x-device-id`, `x-device-timestamp`, `x-device-signature`

## Trace (`/trace`)

- `GET /trace/tray/:id`
- `GET /trace/outer/:id`
- `GET /trace/pallet/:id`

## Admin (`/admin`)

### Users / Roles / Permissions

- `GET /admin/users`
- `POST /admin/users`
- `PUT /admin/users/:id`
- `GET /admin/permissions`
- `GET /admin/roles`
- `POST /admin/roles`
- `PUT /admin/roles/:id`
- `DELETE /admin/roles/:id`

### Devices / Machines

- `GET /admin/devices`
- `POST /admin/devices`
- `PUT /admin/devices/:id`
- `POST /admin/devices/:id/status`
- `POST /admin/devices/:id/regenerate-secret`
- `PUT /admin/devices/:id/assign-machine`
- `GET /admin/machines`
- `POST /admin/machines`
- `PUT /admin/machines/:id`
- `DELETE /admin/machines/:id`

### Models / Revisions / Variants / BOM / Routing

- `GET /admin/models`
- `POST /admin/models`
- `PUT /admin/models/:id`
- `DELETE /admin/models/:id`
- `GET /admin/models/:id/revisions`
- `POST /admin/models/:id/revisions`
- `GET /admin/models/:id/revisions/:revisionId`
- `PUT /admin/models/:id/revisions/:revisionId`
- `POST /admin/models/:id/revisions/:revisionId/activate`
- `GET /admin/models/:id/revisions/:revisionId/variants`
- `POST /admin/models/:id/revisions/:revisionId/variants`
- `PUT /admin/models/:id/revisions/:revisionId/variants/:variantId`
- `DELETE /admin/models/:id/revisions/:revisionId/variants/:variantId`
- `POST /admin/models/:id/revisions/:revisionId/variants/:variantId/set-default`
- `GET /admin/models/:id/revisions/:revisionId/bom`
- `POST /admin/models/:id/revisions/:revisionId/bom`
- `PUT /admin/models/:id/revisions/:revisionId/bom/:bomId`
- `DELETE /admin/models/:id/revisions/:revisionId/bom/:bomId`
- `GET /admin/models/:id/revisions/:revisionId/routing`
- `POST /admin/models/:id/revisions/:revisionId/routing`
- `PUT /admin/models/:id/revisions/:revisionId/routing/:stepId`
- `DELETE /admin/models/:id/revisions/:revisionId/routing/:stepId`

### Labels / Bindings / Readiness

- `GET /admin/templates`
- `POST /admin/templates`
- `PUT /admin/templates/:id`
- `DELETE /admin/templates/:id`
- `GET /admin/bindings`
- `POST /admin/bindings`
- `PUT /admin/bindings/:id`
- `DELETE /admin/bindings/:id`
- `GET /admin/validate-model/:id`

### Org / Approvals / Settings / Audit

- `GET /admin/processes`
- `POST /admin/processes`
- `PUT /admin/processes/:id`
- `DELETE /admin/processes/:id`
- `GET /admin/stations`
- `POST /admin/stations`
- `PUT /admin/stations/:id`
- `DELETE /admin/stations/:id`
- `GET /admin/workflow-approvals`
- `POST /admin/workflow-approvals`
- `PUT /admin/workflow-approvals/:id`
- `DELETE /admin/workflow-approvals/:id`
- `GET /admin/workflow-transitions`
- `GET /admin/settings/heartbeat`
- `PUT /admin/settings/heartbeat`
- `GET /admin/audit-logs`

### Supplier / Inbound Material

- `GET /admin/suppliers`
- `POST /admin/suppliers`
- `PUT /admin/suppliers/:id`
- `GET /admin/inventory-do`
- `POST /admin/inventory-do`
- `GET /admin/supplier-packs`
- `POST /admin/supplier-packs/receive`

## Change Policy

- Do not remove or rename endpoint paths without deprecation period.
- Request/response structure changes require SDK update + UI migration in same PR.
- Contract-breaking changes must be marked as `BREAKING CHANGE` in PR title.
