# Traceability Program Roadmap (Single Go-Live Baseline)

Last updated: **February 15, 2026**

This roadmap is the operational baseline for delivery, handover, and go-live.
Rollout strategy is now **single combined go-live** (no Wave 1 / Wave 2 split).

## 1) Program Targets

- **Single Go-Live (Full Scope): July 13, 2026**
- **Project Closure (Hypercare sign-off): July 31, 2026**

## 1A) Current Position (As-Is Snapshot)

As of **February 16, 2026**, baseline from `IMPLEMENTATION_CHECKLIST.md`:

- Total tracked items: **140**
- Done (`[x]`): **98**
- In Progress (`[~]`): **36**
- Not Started (`[ ]`): **6**
- Strict completion (Done only): **70.0%** (`98/140`)
- Weighted completion (Done + 0.5*In Progress): **82.9%**

Current execution point:

- **Program phase now:** `P0 - Stabilization`
- **Go-live readiness now:** **Not ready** (UAT, cutover rehearsal, and final integrated sign-offs are pending)
- **Critical path now:** validation stability, timezone consistency, vendor/barcode governance, parser robustness, final integrated UAT

Detailed completion by historical implementation phase:

| Historical Phase | Done | In Progress | Not Started | Strict % | Weighted % |
|---|---:|---:|---:|---:|---:|
| Phase 0 - Project Scaffold & Dev Environment | 7 | 0 | 0 | 100.0 | 100.0 |
| Phase 1 - Database Schema & Migrations | 13 | 0 | 0 | 100.0 | 100.0 |
| Phase 2 - Auth & RBAC | 8 | 0 | 0 | 100.0 | 100.0 |
| Phase 3 - Device Registry & Kiosk Sessions | 8 | 0 | 0 | 100.0 | 100.0 |
| Phase 4 - Event Ingestion & Domain Validators | 17 | 1 | 0 | 94.4 | 97.2 |
| Phase 5 - Label Engine & Serial Allocator | 7 | 0 | 0 | 100.0 | 100.0 |
| Phase 6 - Trace APIs | 4 | 0 | 0 | 100.0 | 100.0 |
| Phase 7 - Admin UI (Web) | 28 | 19 | 3 | 56.0 | 75.0 |
| Phase 8 - Shopfloor UIs | 0 | 12 | 0 | 0.0 | 50.0 |
| Phase 9 - Offline Queue | 5 | 1 | 0 | 83.3 | 91.7 |
| Phase 10 - UAT & Seed Scenarios | 0 | 1 | 1 | 0.0 | 25.0 |
| Phase 11 - Go-live | 0 | 1 | 1 | 0.0 | 25.0 |

## 1B) 0% -> 100% Delivery Map (Detailed)

This map explains full journey from zero to complete system:

| Stage | Range | Main Outcome | Current Status |
|---|---|---|---|
| S0 | 0% -> 10% | Repo/bootstrap/tooling foundation | **Done** |
| S1 | 10% -> 25% | DB schema + migration baseline | **Done** |
| S2 | 25% -> 35% | Auth/RBAC/device session foundation | **Done** |
| S3 | 35% -> 50% | Core event contracts + state enforcement | **Mostly done** |
| S4 | 50% -> 62% | Label engine + trace APIs | **Done** |
| S5 | 62% -> 75% | Admin governance modules | **In progress** |
| S6 | 75% -> 85% | Material flow hardening (request/issue/receive/DO) | **In progress** |
| S7 | 85% -> 93% | Full station integration + genealogy hardening | **Planned / partially started** |
| S8 | 93% -> 100% | Integrated UAT + cutover + go-live + hypercare closure | **Not started** |

Practical interpretation:

- **Technical build is already strong** (foundation and backend core are largely in place).
- **Program completion is not only coding**: remaining high-risk items are integrated UAT, cutover readiness, and operational sign-off.

## 2) Go-Live Scope (Combined)

### Material Flow
- Production request form and history.
- Store approval/reject workflow.
- Manual DO allocation per item.
- Material issue with allocation record.
- Production receive confirmation by 2D scan.
- Voucher-style view and print.
- Core audit trail for critical actions.

### Full Traceability
- Station event chain from component input to finished goods.
- Genealogy linking model/component/lot/DO/process.
- Barcode Template Master governance (versioned).
- 92-digit finished-good label linkage.
- Full station UIs (assembly/label/packing/FG) with offline behavior.
- Operational dashboards and alerting hardening.

## 3) Timeline (Date-Driven)

| Phase | Date Range | Goal | Exit Gate |
|---|---|---|---|
| P0 - Stabilization | Feb 16, 2026 - Mar 13, 2026 | Stabilize existing flow, fix UX/validation/runtime issues | Build + critical flow pass in dev |
| P1 - Master Data & Barcode | Mar 16, 2026 - Apr 10, 2026 | Complete department/vendor/BOM governance + barcode template foundation | Admin config path complete |
| P2 - Integration Build I | Apr 13, 2026 - May 30, 2026 | Material flow hardening + integration UAT cycle 1 | UAT cycle 1 sign-off |
| P3 - Integration Build II | Jun 2, 2026 - Jun 20, 2026 | Full traceability chain completion (station -> genealogy -> FG link) | End-to-end genealogy pass |
| P4 - Final UAT + Cutover Prep | Jun 23, 2026 - Jul 10, 2026 | Final integrated UAT, performance/regression, cutover rehearsal | Go/No-Go package ready |
| **Single Go-Live** | **July 13, 2026** | Full-system production launch | Go/No-Go approved |
| Hypercare & Closure | Jul 13, 2026 - Jul 31, 2026 | Stabilize production + close project | KPI stable + sign-off |

## 4) Workstreams and Ownership

- **WS1 Backend Core**: API, business rules, event contracts, parser, migrations.
- **WS2 Frontend Admin/Store/Production**: UX, workflow screens, validations, role behavior.
- **WS3 Station Apps**: process event capture, operator UX, offline queue integration.
- **WS4 Platform/QA/Release**: CI/CD, test automation, UAT, cutover, rollback, monitoring.

## 5) Task Backlog with Target Dates

| ID | Task | Workstream | Owner Role | Due Date |
|---|---|---|---|---|
| T01 | Freeze scope + change-control (CR policy) | WS4 | PM + Product Owner | Feb 20, 2026 |
| T02 | Standardize form validation (qty required, non-negative, status guards) | WS2 | Frontend Lead | Feb 27, 2026 |
| T03 | Normalize timezone/date-time rendering and API usage | WS1/WS2 | Backend + Frontend | Feb 27, 2026 |
| T04 | Unify Material Request view across production/store/admin | WS2 | Frontend Lead | Mar 6, 2026 |
| T05 | Department Master and role-linked department usage | WS1/WS2 | Backend + Admin FE | Mar 6, 2026 |
| T06 | Vendor master normalization (replace supplier terminology in UI/API messages) | WS1/WS2 | Backend + FE | Mar 13, 2026 |
| T07 | Vendor ID and Vendor Part Number governance | WS1/WS2 | Backend + Admin FE | Mar 13, 2026 |
| T08 | BOM governance: model-component revision lifecycle | WS1/WS2 | Backend + Admin FE | Mar 20, 2026 |
| T09 | Barcode Template Master (version, activate, deprecate) | WS1/WS2 | Backend + Admin FE | Mar 27, 2026 |
| T10 | 2D parser engine mapped to template fields + validation rules | WS1 | Backend Lead | Apr 3, 2026 |
| T11 | High-volume receive scan UI (100-200 packs) + anti-duplicate + summary | WS2 | Frontend Lead | Apr 3, 2026 |
| T12 | Store flow hardening: approve/view -> manual DO allocate -> issue -> print | WS1/WS2 | Backend + FE | Apr 10, 2026 |
| T13 | Realtime channel reliability + reconnect fallback + error observability | WS1/WS2 | Backend + FE | Apr 10, 2026 |
| T14 | Integrated UAT cycle 1 (material flow) + bug triage closure | WS4 | QA Lead + Key Users | May 30, 2026 |
| T15 | Cutover rehearsal #1 + rollback rehearsal #1 | WS4 | DevOps + PM | May 30, 2026 |
| T16 | Station process event implementation (as per design-bible) | WS1/WS3 | Backend + Station FE | Jun 20, 2026 |
| T17 | Genealogy consistency checks and trace query hardening | WS1 | Backend Lead | Jun 20, 2026 |
| T18 | Packing + FG + 92-digit mapping completion | WS1/WS3 | Backend + Station FE | Jun 26, 2026 |
| T19 | Final integrated UAT + performance/regression suite | WS4 | QA Lead | Jul 10, 2026 |
| T20 | Hypercare defect burn-down and handover package | WS4 | PM + All Leads | Jul 31, 2026 |

## 6) Go/No-Go Criteria (Single Go-Live: July 13, 2026)

- Critical defects: **0**
- High defects on production path: **0**
- End-to-end pass:
  - request -> approve -> allocate -> issue -> receive -> print
  - station process chain -> genealogy trace -> FG 92-digit linkage
- Audit trail verified for submit/approve/reject/issue/receive/process events
- UAT sign-off from production/store/admin/station key users
- Cutover rehearsal and rollback rehearsal completed
- Realtime + offline/replay conflict handling validated
- Monitoring and alert readiness pass

## 7) Sprint Cadence and Reporting

- Sprint cadence: **2 weeks**
- Weekly checkpoint: **every Friday**
- Required reporting each checkpoint:
  - Planned vs actual progress by task ID
  - Risk log updates
  - Blockers with owner + ETA
  - Scope change request (if any)

## 8) Risk Register (Top Items)

| Risk | Impact | Mitigation |
|---|---|---|
| Late barcode template changes from vendor | Parser/receive disruption | Versioned templates + non-breaking parser update path |
| Scope creep before single go-live | Go-live delay | CR gate after Feb 20, 2026; defer non-critical changes to post go-live |
| Realtime instability in production network | Operator friction | Reconnect fallback, user feedback state, offline queue safety |
| Data inconsistency between BOM and request items | Issue errors | Activation checks + readiness validator + contract tests |

## 9) Definition of Done (Project)

- All critical design-bible flows implemented without placeholder logic.
- Build/typecheck/check pipelines stable from root.
- UAT playbook scenarios reproducible with seeded data.
- Runbook, rollback, and handover documents completed.
- Hypercare KPI stable and business sign-off completed by **July 31, 2026**.

## 10) Immediate Next Actions (This Week)

1. Lock scope and owners for T01-T04.
2. Open tracking board using task IDs T01-T20.
   - Use template: `docs/ops/EXECUTION_BOARD_TEMPLATE.md`
   - Use gantt tracker: `docs/ops/PROGRAM_GANTT_TRACKER.md`
3. Run baseline check command and attach result to sprint report:
   - `bun run check`
4. Start blocker triage from material-flow critical path first (validation/time/request/issue/receive consistency).
