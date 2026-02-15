# Roadmap - Stabilize and Scale Traceability System

This roadmap is aligned with `docs/design-bible/*` and current implementation reality.
Priority is to keep the system buildable and avoid architectural breakage while adding missing scope.

## Keep As-Is (Better than Design Bible Baseline)

- Device HMAC signature support for event ingestion (`x-device-id`, `x-device-signature`, `x-device-timestamp`) is stronger than baseline token-only trust.
- Admin foundation already includes modern enterprise UI patterns and reusable component system.
- Backend has richer admin domains than baseline docs (processes, stations, workflow approvals, heartbeat settings).

## Current Risk Profile

- Medium: API contract mismatch vs design bible for some event names/flows.
- Low: Event/error normalization in runtime paths is aligned; keep contract tests to prevent regression.
- Low: Trace API completed for tray/outer/pallet.
- Low: Admin routed app still needs final UX hardening for full governance flow (major BOM and heartbeat gaps closed).
- Low: Root workspace/tooling baseline is in place; continue tightening lint standards.
- Medium: Shopfloor station apps are mostly placeholders; offline UX not fully integrated in unified station app.

## Guardrails (Do First, No Exceptions)

1. Freeze contract baseline
- Create `docs/contracts/API_BASELINE_v1.md` from current backend routes.
- Any route change must include changelog + migration note.

2. Quality gates in CI
- Required checks per PR: backend typecheck, all app builds, sdk lint.
- Add smoke tests for auth/device/events critical flows.

3. Migration discipline
- Only additive DB migrations.
- Never edit historical migration files after applied.
- Add rollback notes per migration.

4. Feature flags for incomplete domains
- Hide unfinished station/admin modules behind explicit flags.
- Prevent half-done features from leaking into production.

## Delivery Plan

## Phase A (1 week) - Foundation Hardening

- Add root workspace (`package.json`) and root scripts for install/build/typecheck.
- Add root tsconfig base and shared lint config.
- Add pre-merge CI pipeline.
- Normalize docs encoding and command examples in `README.md`.

Exit gate:
- Single command can typecheck/build all projects from root.
- CI required and green.

## Phase B (Completed) - Backend Contract Completion

- Complete Trace APIs: `/trace/outer/:id`, `/trace/pallet/:id`. ✅
- Finalize label generation with real data resolution (remove hardcoded part/variant/template IDs). ✅
- Fill missing event handlers per `06_EVENT_CATALOG.md`. ✅
- Align errors with `14_ERROR_HANDLING_MATRIX.md`. 🔄 (major paths done, legacy cleanup remains)
- Add contract guard test for event handler coverage. ✅

Exit gate:
- Contract tests pass for auth/device/events/labels/trace. 🔄
- No TODO placeholders in runtime path for label generation. ✅

## Phase C (2 weeks) - Admin Completion (Governance Flow)

- Wire routes/pages for revisions, variants, BOM, routing, templates, bindings, readiness validator, audit logs, machines.
- Enforce immutable active revision behavior in UI.
- Add machine capability mapping UI.

Exit gate:
- Full admin E2E: model -> revision -> variants -> BOM -> routing -> labels -> readiness PASS -> activate.

## Phase D (2-3 weeks) - Shopfloor Operational MVP

- Implement station-specific flows from `12_UI_REQUIREMENTS_BY_STATION.md`:
  - Jigging, Wash1, Wash2, Bonding, Magnetize/Flux, Assembly Start/Steps, Label, Packing, FG.
- Standardize common header (network, queue count, operator, line, shift_day).
- Align station events to finalized catalog.

Exit gate:
- End-to-end batch can run from jigging to pallet with expected genealogy.

## Phase E (1-2 weeks) - Offline Reliability and Recovery

- Integrate offline queue manager into station flows.
- Enforce offline block for label generation using canonical error code.
- Add supervisor review flow for replay conflicts.

Exit gate:
- Offline replay test passes and conflict handling is deterministic.

## Phase F (1 week) - UAT + Go-Live Readiness

- Execute all scenarios in `16_TEST_UAT_PLAYBOOK.md`.
- Validate deployment controls from `17_DEPLOYMENT_GO_LIVE_PLAYBOOK.md`.
- Run cutover rehearsal and rollback rehearsal.
- Use operational documents:
  - `docs/ops/UAT_EXECUTION_CHECKLIST.md`
  - `docs/ops/GO_LIVE_CUTOVER_RUNBOOK.md`
- Enforce release gate command:
  - `bun run check:go-live`

Exit gate:
- UAT signed off.
- Go-live checklist complete.

## Anti-Break Rules During Development

- Do not mix contract changes and UI refactors in one PR.
- Do not merge new station UI without corresponding event contract tests.
- Do not expose routes in navigation until backend and error handling are complete.
- Do not bypass readiness validator for revision activation.

## Suggested Team Split

- Track 1 Backend Core: events, labels, trace, error contracts.
- Track 2 Admin Governance: configuration modules + revision lifecycle.
- Track 3 Shopfloor/Ops: station UX + offline/replay behavior.
- Track 4 Platform: CI, lint, shared types, release discipline.

## Definition of Done (Project-Level)

- All design-bible critical flows implemented without placeholders.
- Root build/typecheck/test commands pass reliably.
- UAT scenarios reproducible with seeded data.
- Operational dashboards cover heartbeat, queue, and failures.
