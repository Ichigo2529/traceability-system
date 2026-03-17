# Traceability System — Documentation

Entry point for all project documentation. Use the links below or [INDEX.md](INDEX.md) for the full index.

---

## Current system (aligned with codebase)

| Document                                                         | Description                                  |
| ---------------------------------------------------------------- | -------------------------------------------- |
| [architecture/tech-stack.md](architecture/tech-stack.md)         | Tech stack, repo layout, development rules   |
| [architecture/database.md](architecture/database.md)             | Database schema summary (from actual schema) |
| [architecture/api-and-routes.md](architecture/api-and-routes.md) | Backend API and frontend routes              |

---

## Project and delivery

| Document                                                 | Description                                       |
| -------------------------------------------------------- | ------------------------------------------------- |
| [project/roadmap.md](project/roadmap.md)                 | Vision, go-live targets, timeline, status         |
| [project/checklist.md](project/checklist.md)             | Implementation checklist summary                  |
| [project/progress-report.md](project/progress-report.md) | Progress % and task status (อัปเดตสัปดาห์ละครั้ง) |

---

## UI standards

| Document                                   | Description                                       |
| ------------------------------------------ | ------------------------------------------------- |
| [ui/guidelines.md](ui/guidelines.md)       | UI/UX guidelines (Fiori, layout, tables, dialogs) |
| [ui/shadcn-guide.md](ui/shadcn-guide.md)   | shadcn/ui (Radix + Tailwind + Lucide) guide       |
| [ui/patterns.md](ui/patterns.md)           | UI patterns                                       |
| [ui/fcl-standards.md](ui/fcl-standards.md) | Flexible Column Layout standards                  |
| [ui/agent-reading.md](ui/agent-reading.md) | Required reading for AI agents                    |

---

## Domain and technical specifications

| Document                           | Description                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [specs/README.md](specs/README.md) | Non‑negotiable rules and implementation approach (source of truth)                                                                                     |
| specs/01–19                        | System context, domain, data model, events, API, RBAC, labels, offline, UI, admin, errors, performance, test, deployment, material form, supplier pack |

---

## Operations and go-live

| Document                                                                               | Description                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [operations/runbook-go-live.md](operations/runbook-go-live.md)                         | Go-live cutover runbook                           |
| [operations/uat-checklist.md](operations/uat-checklist.md)                             | UAT execution checklist                           |
| [operations/uat-script.md](operations/uat-script.md)                                   | Step-by-step UAT script                           |
| [operations/sign-off-template.md](operations/sign-off-template.md)                     | UAT / go-live sign-off template                   |
| [operations/cutover-rehearsal-checklist.md](operations/cutover-rehearsal-checklist.md) | Cutover rehearsal (T-1 and go-live day) checklist |
| [operations/gantt-tracker.md](operations/gantt-tracker.md)                             | Program Gantt / progress tracker                  |
| [operations/execution-board.md](operations/execution-board.md)                         | Execution board template                          |
| [operations/status-pack.md](operations/status-pack.md)                                 | Executive status slide pack                       |

---

## Process and governance

| Document                                                                 | Description                      |
| ------------------------------------------------------------------------ | -------------------------------- |
| [process/execution-baseline.md](process/execution-baseline.md)           | Execution rules and safety gates |
| [process/safe-execution.md](process/safe-execution.md)                   | Safe execution protocol          |
| [process/rules-checklist.md](process/rules-checklist.md)                 | Rules checklist                  |
| [process/pr-checklist.md](process/pr-checklist.md)                       | Pull request checklist           |
| [process/change-request-template.md](process/change-request-template.md) | Change request template          |
| [process/skill-usage.md](process/skill-usage.md)                         | Skill usage baseline             |

---

## Reference and history

| Document                                                     | Description                        |
| ------------------------------------------------------------ | ---------------------------------- |
| [reference/api-baseline.md](reference/api-baseline.md)       | API surface baseline               |
| [history/context-bootstrap.md](history/context-bootstrap.md) | System rules and doc reading order |
| [history/go-live-status.md](history/go-live-status.md)       | Go-live status snapshot            |

---

Folder and file names use **lowercase with hyphens** (kebab-case), in line with common documentation practice.
