# API baseline v1

Date: 2026-02-13  
Source: current backend implementation in `backend/src/routes/*`

This document freezes the current API surface before further refactors. If endpoint shape changes, update this file and include migration notes in the PR.

## Response contract

Success: `{ "success": true, "data": {} }`  
Error: `{ "success": false, "error_code": "CODE", "message": "Readable message" }`

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

## Events and labels

- `POST /events`
- `POST /events/validate-transition`
- `POST /labels/generate`

Auth options for event ingest: Bearer token; `Device-Token` + active operator session; HMAC headers: `x-device-id`, `x-device-timestamp`, `x-device-signature`.

## Trace (`/trace`)

- `GET /trace/tray/:id`
- `GET /trace/outer/:id`
- `GET /trace/pallet/:id`

## Admin (`/admin`)

See the full list in the repo (users, roles, devices, machines, models, revisions, variants, BOM, routing, templates, bindings, processes, stations, workflow-approvals, suppliers, inventory-do, supplier-packs, audit-logs). For the complete endpoint list, refer to `backend/src/routes/admin.ts` and [architecture/api-and-routes.md](../architecture/api-and-routes.md).

## Change policy

- Do not remove or rename endpoint paths without a deprecation period.
- Request/response structure changes require SDK update and UI migration in the same PR.
- Contract-breaking changes must be marked as `BREAKING CHANGE` in the PR title.
