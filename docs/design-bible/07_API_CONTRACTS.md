# 07 API Contracts (Backend)

All responses:

```json
{ "success": true, "data": {...} }
or

json
Copy code
{ "success": false, "error_code": "SOME_CODE", "message": "Human readable" }
Auth
POST /auth/login

input: { username, password }

output: { access_token, refresh_token, user: {id, roles} }

POST /auth/refresh

input: { refresh_token }

output: { access_token, refresh_token }

POST /auth/logout

input: { refresh_token }

output: { success }

RBAC
Admin endpoints require ADMIN role.

Device registration
POST /device/register

input: { fingerprint, hostname, mac }

output: { device_id, device_token }
Admin must assign device to machine.

POST /device/heartbeat

header: Device-Token

input: { device_id, ts, app_version, offline_queue_size }

output: { ok, server_time, assigned_machine, online_required_features }

Kiosk operator session
POST /device/operator/login

header: Device-Token

input: { username, password_or_pin }

output: { operator: {id, display_name}, session_id }

POST /device/operator/logout

header: Device-Token

output: { ok }

GET /device/operator/me

header: Device-Token

output: { operator, session_active }

Events ingestion (idempotent)
POST /events

auth: JWT or Device-Token (must resolve operator session)

input: { event_id, unit_id, machine_id, event_type, created_at_device, payload }

output: { accepted: true, server_event_id }

Config APIs (Admin)
GET/POST/PATCH:

/admin/models

/admin/models/:id/revisions

/admin/revisions/:id/activate

/admin/bom/:revisionId

/admin/routing/:revisionId

/admin/variants/:revisionId

/admin/label-templates

/admin/label-bindings

/admin/machines

/admin/devices (assign machine)

/admin/users (roles)

Readiness validator
GET /admin/validate-model/:model_revision_id

returns PASS/FAIL + missing items list

Label generation (online only)
POST /labels/generate

auth: require online + operator

input: { assy_unit_id }

output: { trays: [...], labels: [...] }

Trace APIs
GET /trace/tray/:unit_id
GET /trace/outer/:unit_id
GET /trace/pallet/:unit_id
Return:

genealogy tree

timeline events

machine + line_code

operator info

DO/lot information if available

Error codes (canonical)
UNAUTHORIZED

FORBIDDEN

INVALID_REQUEST

DEVICE_NOT_REGISTERED

DEVICE_NOT_ASSIGNED

OPERATOR_SESSION_REQUIRED

INVALID_STATE_TRANSITION

MISSING_REQUIRED_COMPONENT

COMPONENT_NOT_WASHED

INSUFFICIENT_QTY_REMAINING

VARIANT_MISMATCH

LINE_NOT_CAPABLE_FOR_VARIANT

OFFLINE_SERIAL_NOT_ALLOWED

SERIAL_ALLOCATION_FAILED

REVISION_LOCKED

REVISION_NOT_READY
```
