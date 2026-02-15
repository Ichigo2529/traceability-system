# CHANGE REQUEST

## CR ID

CR-20260213-01

## Goal

Close go-live hardening gaps without breaking existing contracts or production flows.

## Background

Recent implementation is functionally broad but had remaining operational gaps:
- Prompt-based BOM editing in admin UX.
- No dedicated heartbeat timeline/filter view.
- Rule guard process existed in checklist but needed stronger enforcement in release flow.

## Affected Design Bible Sections

- `13_ADMIN_UI_SPEC.md`
- `14_ERROR_HANDLING_FORMAL.md`
- `15_PERFORMANCE_ARCHITECTURE.md`
- `17_DEPLOYMENT_PLAYBOOK.md`

## Impacted Rules

- Active revision immutability: unchanged.
- Supplier pack tracking: unchanged.
- Offline label blocking: reinforced at SDK layer.
- Release discipline: strengthened with executable rule validation.

## Proposed Implementation Plan

1. Add heartbeat monitor page with searchable/filterable device status.
2. Replace BOM prompt interactions with validated dialog forms.
3. Add rule validation script into backend and root quality gates.
4. Update checklists/docs to reflect new go-live controls.

## Acceptance Criteria

- `bun run check` passes.
- `bun run check:backend` passes.
- Admin has `/admin/heartbeat` route and navigation.
- BOM add/edit flows use dialog form (no `prompt()`).
- Rule validator script is callable via `bun run --cwd backend rules:validate`.

## Test Plan

- Build admin app.
- Run backend typecheck and contract tests.
- Run rule validator script.
- Manual smoke:
  - Open `/admin/heartbeat`, verify filters and status rendering.
  - Open BOM editor and create/edit row via dialog.

## Rollback Plan

- Revert UI pages and route additions.
- Remove rules validation script from package scripts.
- Restore previous checklist entries.
