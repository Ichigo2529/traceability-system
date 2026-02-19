# Technical Decisions & Assumptions

> Minimal assumptions — everything aligns with **docs/design-bible/** (v1.0).  
> If the Design Bible is updated, revisit items marked ⚠️.

---

## 1. Runtime & Package Manager

| Decision                                              | Rationale                                    |
| ----------------------------------------------------- | -------------------------------------------- |
| **Bun** for runtime + package manager + script runner | Bible §02 mandates Bun                       |
| Bun workspaces for monorepo                           | Native, no Turborepo/Nx needed at this scale |

---

## 2. Database

| Decision                                             | Rationale                                                               |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| **PostgreSQL** (local install on Windows, no Docker) | Bible §00, §02                                                          |
| **Drizzle ORM** for schema + migrations              | Bible §02                                                               |
| `SELECT … FOR UPDATE` for serial allocation          | Ensures atomic gap-free serials (Bible §10)                             |
| ⚠️ Single DB instance (no read replicas)             | Sufficient for <20 events/sec (Bible §15). Revisit if throughput grows. |

---

## 3. Auth & Security

| Decision                              | Rationale                       |
| ------------------------------------- | ------------------------------- |
| JWT (access) + refresh token rotation | Bible §08                       |
| bcrypt for password hashing           | Bible §02                       |
| Device-token (separate from user JWT) | Bible §08 – kiosk trust model   |
| ⚠️ LDAP integration deferred          | Bible §01 says "optional later" |

---

## 4. Frontend

| Decision                                                               | Rationale                                  |
| ---------------------------------------------------------------------- | ------------------------------------------ |
| **React + Vite**                                                       | Bible §02                                  |
| **UI5 Web Components for React** (SAP Horizon)                         | Replaces Tailwind for Fiori/Enterprise UI  |
| **TanStack React Query**                                               | Robust server state management             |
| **@elysiajs/eden** (Eden Treaty)                                       | End-to-end type safety (Bible §07)         |
| **Dexie** for offline event queue                                      | Bible §02, §09                             |
| Separate apps per concern: `admin`, `kiosk-pi5`, station-specific apps | Bible §02 (run commands), README structure |
| Shared packages: `sdk` (typed API client), `offline-queue`, `ui`       | README repo structure                      |

---

## 5. Offline Strategy

| Decision                                                         | Rationale                                     |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Queue events in Dexie, replay in order                           | Bible §09                                     |
| Label generation / serial allocation = **online-only**           | Bible §09, §10 — centralized locking required |
| Client-generated UUID `event_id` for idempotency                 | Bible §06                                     |
| ⚠️ Conflict on `INVALID_STATE_TRANSITION` → "call supervisor" UX | Bible §09 — exact UI TBD                      |

---

## 6. Timezone & Shift-Day

| Decision                                                      | Rationale      |
| ------------------------------------------------------------- | -------------- |
| All shift-day logic uses **Asia/Bangkok (UTC+7)**             | Bible §01, §03 |
| shift_day boundary: **08:00** (if before 08:00 → yesterday)   | Bible §03 §A   |
| Server computes `shift_day`; client sends `created_at_device` | Bible §09, §10 |

---

## 7. Label Engine

| Decision                                                                          | Rationale |
| --------------------------------------------------------------------------------- | --------- |
| 92-char fixed-length payload                                                      | Bible §10 |
| Serial scope: `(part_number + shift_day + line_code)`                             | Bible §10 |
| Serial range 0001–9999; block & alert if exhausted                                | Bible §10 |
| Template binding key: `(model_revision_id, variant_id, unit_type, process_point)` | Bible §10 |

---

## 8. Monorepo Structure

| Decision                                       | Rationale                                                       |
| ---------------------------------------------- | --------------------------------------------------------------- |
| Structure mirrors README exactly (see below)   | Bible README §02 run commands; root README repository structure |
| `web/apps/admin` — Admin configuration UI      | Bible §13                                                       |
| `web/apps/kiosk-pi5` — General shopfloor kiosk | Bible §12                                                       |
| `web/apps/station-assembly` — Assembly line UI | README                                                          |
| `web/apps/station-label` — Label print station | README                                                          |
| `web/apps/station-packing` — Packing station   | README                                                          |
| `web/apps/station-fg` — FG / pallet station    | README                                                          |

---

## 9. Deployment (Production)

| Decision                           | Rationale                |
| ---------------------------------- | ------------------------ |
| Ubuntu 24 on Hyper-V               | Bible §02                |
| Nginx reverse proxy                | Bible §02                |
| PM2 or systemd for backend process | Bible §02                |
| ⚠️ No CI/CD pipeline yet           | Not specified; add later |

---

## 10. Testing

| Decision                              | Rationale                                           |
| ------------------------------------- | --------------------------------------------------- |
| UAT seed scenario: Marlin `760629200` | Bible §16                                           |
| ⚠️ Unit test framework not specified  | Assumption: Bun's built-in test runner (`bun test`) |
| Integration tests hit local Postgres  | Align with no-Docker dev setup                      |
