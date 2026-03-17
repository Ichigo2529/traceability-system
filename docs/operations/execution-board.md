# Execution board (current week)

Last updated: **2026-03-13**  
Owner: **Program Manager**  
Cadence: **2-week sprint + weekly Friday checkpoint**

Use this file as the single execution tracker for roadmap tasks (T01–T20 in [project/roadmap.md](../project/roadmap.md)).  
Release strategy: **Single go-live (no wave split)**.  
Detailed timeline: [gantt-tracker.md](gantt-tracker.md).

## Sprint overview

| Field               | Value                                                          |
| ------------------- | -------------------------------------------------------------- |
| Sprint name         | Sprint-01                                                      |
| Sprint date         | 2026-02-16 to 2026-02-27                                       |
| Sprint goal         | Lock scope and complete baseline stabilization start (T01–T03) |
| Release target      | Single go-live                                                 |
| Target go-live date | 2026-07-13                                                     |

## Task board (master)

Status: Not Started | In Progress | Blocked | In Review | Done | Carry Over  
Priority: P0 (critical) | P1 (high) | P2 (normal)

| ID  | Task                                       | Priority | Status      | Owner |
| --- | ------------------------------------------ | -------- | ----------- | ----- |
| T01 | Stabilize Admin UX and validation          | P0       | Done        | Dev   |
| T02 | Stabilize Station UX (all station screens) | P0       | Done        | Dev   |
| T03 | Timezone and shift-day validation E2E      | P0       | Done        | Dev   |
| T04 | Department / section / cost center config  | P1       | Done        | Dev   |
| T05 | Vendor and supplier pack governance        | P1       | Not Started |       |
| T06 | BOM and routing config + barcode/trace     | P1       | Not Started |       |
| T07 | Barcode template merge and test-parse      | P1       | Not Started |       |
| T08 | Material flow UI full flow                 | P2       | Done        | Dev   |
| T09 | UAT cycle 1 (core scenarios)               | P2       | In Progress | Dev   |
| T10 | Offline queue conflict handling            | P2       | Done        | Dev   |
| T11 | Trace APIs and genealogy verification      | P2       | Not Started |       |
| T12 | Station event chain + label E2E            | P2       | Not Started |       |
| T13 | Dashboard and alerting                     | P2       | Not Started |       |
| T14 | Final UAT (uat-checklist)                  | P0       | Not Started |       |
| T15 | UAT sign-off                               | P0       | Not Started |       |
| T16 | Cutover rehearsal                          | P0       | Not Started |       |
| T17 | Runbook and rollback finalization          | P1       | Not Started |       |
| T18 | Go-live day execution                      | P0       | Not Started |       |
| T19 | Hypercare monitoring                       | P1       | Not Started |       |
| T20 | Project closure and handover               | P1       | Not Started |       |

Update task IDs T01–T20 per [project/roadmap.md](../project/roadmap.md).  
**T09 UAT Cycle 1:** Execute per [uat-cycle1.md](uat-cycle1.md) (script: [uat-script.md](uat-script.md) §1 + §2).  
Evidence links for UAT: [uat-checklist.md](uat-checklist.md).

## Quick commands

```bash
bun run check
bun run check:go-live
```

Update this board every Friday. Any scope change must be logged in the CR table before implementation.
