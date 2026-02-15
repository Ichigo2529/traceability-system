# 08 RBAC, Auth, Device Trust Model

## Roles

- ADMIN: config, activate revisions, manage machines/devices/users
- SUPERVISOR: trace + exception handling
- OPERATOR: run station work
- STORE: inventory issue
- PRODUCTION: dispatch + split
- QA: flux/fvmi holds + trace

## Auth tokens

- Access token TTL: 45 minutes
- Refresh token TTL: 16 hours
- Refresh rotation: yes (invalidate old refresh token on use)

## Kiosk device trust

- Device has a device_token
- Device must be assigned to a machine in admin
- Operator must login on device to create events
- Server resolves operator_user_id from device_operator_sessions

## Audit requirements

Every event record must include:

- operator_user_id
- machine_id
- device_id (from device token)
- line_code (from machine config)
- shift_day (computed server-side)
