# UAT Cycle 1 — Core scenarios (T09)

**Scope:** WITH_SHROUD flow, NO_SHROUD flow, rejections and enforcement.  
**Purpose:** First UAT pass to validate station event chain and error handling before broader UAT.  
**Ref:** [roadmap.md](../project/roadmap.md) T09, [uat-checklist.md](uat-checklist.md), [uat-script.md](uat-script.md).

---

## Cycle 1 scope (included)

| Area                 | Checklist items                                                                                                    | Script section |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------- |
| Environment precheck | Env configured, check:go-live, db:migrate, db:seed, PostgreSQL                                                     | §1             |
| WITH_SHROUD flow     | jigging → bonding → assembly → label → packing → pallet                                                            | §2.1           |
| NO_SHROUD flow       | Same chain with NO_SHROUD variant; divergence at assembly                                                          | §2.2           |
| Rejections           | STEP_ALREADY_COMPLETED, MISSING_REQUIRED_COMPONENT, REVISION_NOT_READY, INVALID_STATE_TRANSITION, VARIANT_MISMATCH | §2.3           |

## Cycle 1 scope (optional in cycle 1)

- Offline and recovery (§3): can be run in same session or next.
- Traceability verification (§4): can be run after 2.1.7 / 2.2.

---

## Prerequisites

- Backend and Admin/Station apps running (UAT env).
- At least one **model revision** with status ACTIVE, with:
  - Variants: e.g. WITH_SHROUD, NO_SHROUD (or equivalent).
  - BOM and routing configured; routing steps aligned with assembly steps.
- **Device** registered and assigned to a **station/process** with correct line.
- **Operator** logged in on station (for event submission).

---

## Execution

1. Run **Environment precheck** ([uat-script.md](uat-script.md) §1). If Fail, fix before continuing.
2. Run **§2.1 WITH_SHROUD flow** end-to-end; record result.
3. Run **§2.2 NO_SHROUD flow**; record result.
4. Run **§2.3 Rejections and enforcement** (each sub-step); record result.
5. (Optional) Run §3 Offline and §4 Traceability; record results.

Record results in the table below (or in [uat-script.md](uat-script.md)).

---

## Cycle 1 results template

| Section                            | Result              | Notes / defects |
| ---------------------------------- | ------------------- | --------------- |
| 1. Environment precheck            | ☐ Pass ☐ Fail       |                 |
| 2.1 WITH_SHROUD flow               | ☐ Pass ☐ Fail       |                 |
| 2.2 NO_SHROUD flow                 | ☐ Pass ☐ Fail       |                 |
| 2.3 Rejections and enforcement     | ☐ Pass ☐ Fail       |                 |
| 3. Offline and recovery (optional) | ☐ Pass ☐ Fail ☐ N/A |                 |
| 4. Traceability (optional)         | ☐ Pass ☐ Fail ☐ N/A |                 |

**Cycle 1 run date:** **\*\***\_\_\_**\*\***  
**Tester:** **\*\***\_\_\_**\*\***  
**Overall Cycle 1:** ☐ Pass ☐ Fail with exceptions

---

## Error codes (backend reference)

Backend returns these via `fail(error_code, message)`; station UI shows them via `formatStationError`. UAT expects:

- `STEP_ALREADY_COMPLETED` — same assembly step submitted twice for same unit.
- `MISSING_REQUIRED_COMPONENT` — required jig/component not in payload or not done.
- `REVISION_NOT_READY` — revision not ACTIVE or BOM/routing incomplete.
- `INVALID_STATE_TRANSITION` — event out of order or unit in wrong state.
- `VARIANT_MISMATCH` — step not applicable for variant or wrong variant.

After Cycle 1 passes, proceed to full UAT ([uat-checklist.md](uat-checklist.md)) and sign-off ([sign-off-template.md](sign-off-template.md)).
