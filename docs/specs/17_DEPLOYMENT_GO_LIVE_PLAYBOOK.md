# 17 Deployment & Go-live Playbook

## Pre-Go-live

- Create initial admin user
- Configure machines + devices + capabilities
- Configure model revision + variants + BOM + routing + templates + bindings
- Run readiness validator PASS
- Run UAT playbook

## Go-live day

- Activate revision
- Monitor device heartbeat dashboard
- Monitor offline queue sizes
- Confirm serial allocation works (label station online)

## Rollback plan

- Do not edit active revision
- If config issue: create new revision and activate
- If system outage: shopfloor continues offline (except labels)
- If label outage: hold WIP at label station until online restored

## Backups

- Daily DB backups
- Backup before revision activation
