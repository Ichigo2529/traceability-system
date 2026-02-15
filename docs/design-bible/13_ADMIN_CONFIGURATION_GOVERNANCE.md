# 13 Admin Configuration & Governance

## Admin modules

- Users & Roles
- Devices & Machines (assign devices to machines)
- Models
- Model revisions
- Variants
- BOM
- Routing steps
- Label templates + bindings
- Serial policy (shift-day reset)
- Capability mapping (line supports variants)

## Readiness validator (must PASS before activation)

For a model_revision:

- Has BOM
- Has routing
- Variants defined or DEFAULT assumed
- Label template bound for relevant unit_type/process_point
- Machines configured for assembly lines + capability
- Serial policy configured

## Activation rules

- Only ADMIN can activate revision
- Cannot activate if validator FAIL
- Old revision becomes inactive, preserved for history

## Audit log

All config changes write config_audit_logs:

- who changed
- before/after JSON
- timestamp
