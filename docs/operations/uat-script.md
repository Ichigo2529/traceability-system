# UAT execution script

Step-by-step script aligned with [uat-checklist.md](uat-checklist.md). Execute and tick off checklist items; record results and defects.

**UAT Cycle 1 (T09):** Run **§1 Environment precheck** and **§2 Core scenario validation** (2.1 WITH_SHROUD, 2.2 NO_SHROUD, 2.3 Rejections). Optional: §3 Offline, §4 Traceability. Results: [uat-cycle1.md](uat-cycle1.md).

---

## 1. Environment precheck

| Step | Action                                                        | Expected                                        | Checklist ref  |
| ---- | ------------------------------------------------------------- | ----------------------------------------------- | -------------- |
| 1.1  | Set `backend/.env` and `web/.env` for UAT (API URL, DB, etc.) | No missing vars                                 | Env configured |
| 1.2  | From repo root run `bun run check:go-live`                    | Exit 0; typecheck, tests, rules, db:health pass | check:go-live  |
| 1.3  | Run `bun --cwd backend run db:migrate`                        | All migrations applied                          | db:migrate     |
| 1.4  | If fresh env, run `bun --cwd backend run db:seed`             | Seed data present                               | db:seed        |
| 1.5  | Verify PostgreSQL reachable from backend host                 | Connection OK                                   | PostgreSQL     |

**Result:** \_ Pass / Fail. Notes: **\*\***\_\_\_**\*\***

---

## 2. Core scenario validation

### 2.1 WITH_SHROUD flow

| Step  | Action                                                         | Expected        | Checklist ref    |
| ----- | -------------------------------------------------------------- | --------------- | ---------------- |
| 2.1.1 | Create/use revision with variant WITH_SHROUD; set station/line | Config ready    | WITH_SHROUD flow |
| 2.1.2 | Jigging: submit jigging event(s)                               | Accepted        |                  |
| 2.1.3 | Bonding: submit bonding event(s)                               | Accepted        |                  |
| 2.1.4 | Assembly: submit assembly step(s) for WITH_SHROUD              | Accepted        |                  |
| 2.1.5 | Label: generate label (online)                                 | Label generated |                  |
| 2.1.6 | Packing: pack to outer/pallet                                  | Accepted        |                  |
| 2.1.7 | Verify trace: tray → outer → pallet                            | Links correct   |                  |

**Result:** \_ Pass / Fail. Notes: **\*\***\_\_\_**\*\***

### 2.2 NO_SHROUD flow

Repeat 2.1 with variant NO_SHROUD and assembly steps for NO_SHROUD. Verify divergence at assembly.

**Result:** \_ Pass / Fail. Notes: **\*\***\_\_\_**\*\***

### 2.3 Rejections and enforcement

| Step  | Action                                            | Expected                                             | Checklist ref              |
| ----- | ------------------------------------------------- | ---------------------------------------------------- | -------------------------- |
| 2.3.1 | Submit same assembly step twice (same unit)       | Rejected: STEP_ALREADY_COMPLETED                     | STEP_ALREADY_COMPLETED     |
| 2.3.2 | Skip required component / step and submit         | Rejected: MISSING_REQUIRED_COMPONENT (or equivalent) | MISSING_REQUIRED_COMPONENT |
| 2.3.3 | Submit event for non-active or not-ready revision | Rejected: REVISION_NOT_READY                         | REVISION_NOT_READY         |
| 2.3.4 | Submit event out of process order                 | Rejected: INVALID_STATE_TRANSITION                   | INVALID_STATE_TRANSITION   |
| 2.3.5 | Submit event with wrong variant for unit          | Rejected: VARIANT_MISMATCH                           | VARIANT_MISMATCH           |

**Result:** \_ Pass / Fail. Notes: **\*\***\_\_\_**\*\***

---

## 3. Offline and recovery

| Step | Action                                                       | Expected                                               | Checklist ref                    |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------ | -------------------------------- |
| 3.1  | On station, disconnect network; submit one or more events    | Events stored in queue (Dexie)                         | Offline queue stores             |
| 3.2  | Reconnect network; trigger replay                            | Events replayed in order; server accepts (idempotent)  | Replay works                     |
| 3.3  | While offline, attempt label generation                      | Blocked: OFFLINE_SERIAL_NOT_ALLOWED (or clear message) | Label blocked offline            |
| 3.4  | In queue monitor: retry failed, remove item, clear completed | Actions work; UI updates                               | Queue monitor retry/remove/clear |

**Result:** \_ Pass / Fail. Notes: **\*\***\_\_\_**\*\***

---

## 4. Traceability verification

| Step | Action                                             | Expected                                             | Checklist ref |
| ---- | -------------------------------------------------- | ---------------------------------------------------- | ------------- |
| 4.1  | Call `GET /trace/tray/:id` for a known tray id     | 200; upstream + downstream links present and correct | trace/tray    |
| 4.2  | Call `GET /trace/outer/:id` for a known outer id   | 200; correct group/tray mapping                      | trace/outer   |
| 4.3  | Call `GET /trace/pallet/:id` for a known pallet id | 200; all linked outers and children returned         | trace/pallet  |

**Result:** \_ Pass / Fail. Notes: **\*\***\_\_\_**\*\***

---

## 5. Sign-off

After all sections passed (or exceptions documented and accepted), obtain sign-off per [sign-off-template.md](sign-off-template.md). Tick in [uat-checklist.md](uat-checklist.md): Production owner, Quality owner, IT operations.

---

**UAT run date:** **\*\***\_\_\_**\*\***  
**Tester:** **\*\***\_\_\_**\*\***  
**Overall result:** Pass / Fail with exceptions
