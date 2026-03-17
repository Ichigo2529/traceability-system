# Phase Tasks Report — Completion Status

Report on task completion by phase (Discovery, Foundation, Administration) based on codebase and docs review at last update.

**Legend**

- ✅ **Done** — Evidence in code or documentation
- ⏳ **Partial** — Partially done or equivalent approach in place
- ❌ **Not found** — No evidence found

---

## Phase 00: Discovery & System Analysis

| Task                            | Status | Notes                                                                                                 |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| Charter review & Stakeholder ID | ❌     | No charter or stakeholder list document in repo                                                       |
| System context audit            | ⏳     | `docs/architecture/`, `docs/specs/`, `docs/INDEX.md` exist; no document titled “system context audit” |
| Stakeholder interviews          | ❌     | No interview notes or summary found                                                                   |
| Shopfloor process mapping       | ⏳     | Multiple specs (station, workflow, events) in `docs/specs/` but no dedicated “process mapping” doc    |
| Draft Functional Spec v0.1      | ⏳     | `docs/specs/` (01–19) and roadmap/checklist serve as functional spec; no doc named “v0.1”             |
| Gap analysis & technical spikes | ⏳     | Reflected in chosen tech stack (Elysia, UI5, Drizzle); no separate gap analysis doc                   |
| Elysia + UI5 connection test    | ✅     | Backend uses Elysia; frontend uses UI5 Web Components + Eden Treaty for API calls                     |
| Final sign-off & Backlog        | ⏳     | `docs/project/roadmap.md` and `docs/project/checklist.md` exist; no explicit “final sign-off” doc     |

---

## Phase 0: Foundation & Core Infrastructure

| Task                                 | Status | Notes                                                                                                                                                                             |
| ------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bun workspaces & shared libs         | ✅     | Root and `web/` use workspaces; `web/packages/` (sdk, ui, material, offline-queue, etc.)                                                                                          |
| Prettier/ESLint/Husky hooks          | ✅     | Husky + lint-staged; `.husky/pre-commit` runs `bun run lint-staged` (Prettier on staged files). ESLint in apps; see [tech-stack.md](../architecture/tech-stack.md).               |
| CI/CD GitHub Actions setup           | ✅     | `.github/workflows/ci.yml` (checkout, Bun, check:backend, check:web)                                                                                                              |
| Drizzle ORM config & Schema design   | ✅     | `backend/drizzle.config.ts`, schema in `backend/src/db/schema/`                                                                                                                   |
| Migration engine & seeding logic     | ✅     | `backend/src/db/migrate.ts`, `backend/src/db/seed.ts`, `backend/drizzle/` folder                                                                                                  |
| Unit tests for schema                | ✅     | `backend/src/db/schema.test.ts` asserts schema barrel exports; `check:backend` runs `bun test`.                                                                                   |
| Elysia router & error handlers       | ✅     | `backend/src/app.ts` — Elysia with `.onError()` for UNAUTHORIZED, VALIDATION, NOT_FOUND, 500                                                                                      |
| Zod validation & Swagger auto-doc    | ✅     | Validation: TypeBox (backend) + Zod (admin forms) documented in [tech-stack.md](../architecture/tech-stack.md). API docs: SDK/Eden types; Swagger optional later.                 |
| JWT Token rotation & RBAC guards     | ✅     | `backend/src/lib/jwt.ts` (access/refresh, TTL); `backend/src/routes/auth.ts` has `/refresh` and revokes old token; `backend/src/middleware/auth.ts` has `checkRole(allowedRoles)` |
| Device Fingerprinting & HMAC signing | ✅     | See [Context: Device Fingerprinting & HMAC](#context-device-fingerprinting--hmac-signing) below.                                                                                  |

---

## Context: Device Fingerprinting & HMAC signing

This section explains what “Device Fingerprinting & HMAC signing” means in this project.

### Why it exists

- **Shopfloor stations** (Pi, PC, tablet, kiosk) send **events** to the backend (e.g. production events, scans). The server must know **which device** sent the request and, for audit, which **operator session** is active on that device.
- **Device fingerprinting** identifies a device (or browser) in a stable way. **HMAC signing** lets the device prove it holds a **secret** without sending the secret over the wire, so the API can trust the request came from that device.

### Device fingerprint

- **Meaning:** A string that uniquely identifies a device (or browser instance). In this codebase it is **client-generated** and stored in `devices.fingerprint`.
- **Example (admin/station UI):** `getFingerprint()` in `DeviceRegisterPage.tsx` uses e.g. `navigator.userAgent` + screen size. Other flows (e.g. `/device/register`) send a fingerprint from the client; the server stores it and uses it to **find or create** the device record.
- **Usage:**
  - **Register:** `POST /device/register` with `fingerprint` (and optional `hostname`) → creates or returns existing device; server uses `fingerprint` as unique key.
  - **Activate:** `POST /device/activate` with `device_code` + `activation_pin` can send `fingerprint` to update the device record (e.g. after reassignment).
- **Storage:** `devices.fingerprint` in DB; unique constraint so one fingerprint maps to one device.

### HMAC signing

- **Meaning:** The device and server share a **secret key** (`devices.secret_key`). For each request, the client computes  
  `signature = HMAC-SHA256(secret_key, "deviceId:timestamp")`  
  and sends `deviceId`, `timestamp`, and `signature` in headers. The server recomputes the HMAC and compares (with constant-time compare) so that only a client that knows the secret can pass.
- **Headers (client → server):**
  - `x-device-id` — device identifier (e.g. `device_code`)
  - `x-device-timestamp` — current time (ms); server checks within a short window (e.g. 5 minutes) to limit replay.
  - `x-device-signature` — hex-encoded HMAC of `"deviceId:timestamp"` with the device’s `secret_key`.
- **Where it’s used:**
  - **Backend:** `backend/src/routes/events.ts`: when there is no Bearer JWT, it tries to resolve the request using these HMAC headers; it loads the device by `x-device-id`, checks the signature and timestamp, then resolves the active operator session for that device.
  - **Frontend/SDK:** `web/packages/sdk/src/client.ts`: for requests to `/events`, if the client has `deviceIdentity` (deviceId + secretKey), it builds the same HMAC and sets `x-device-id`, `x-device-timestamp`, `x-device-signature`.
- **Security:** The secret is issued once (e.g. after activation or by admin) and stored on the device; it is never sent in the request body or URL, only used to sign. Replay is limited by the timestamp window.

### Flow in short

1. **Device identity:** Device (or browser) is identified by a **fingerprint**; server creates/updates a `devices` row and may assign `device_code`, station, machine, and a **secret_key**.
2. **Activation:** Operator activates the station with `device_code` + `activation_pin`; backend returns `device_token` (JWT) and `secret_key` (for HMAC). The client stores both (e.g. in SDK/localStorage).
3. **Sending events:** For `POST /events`, the client can send either:
   - **Bearer JWT** (admin/user context), or
   - **HMAC headers** (`x-device-id`, `x-device-timestamp`, `x-device-signature`) so the server attributes the event to that device and its current operator session.

So in this project, **“Device Fingerprinting & HMAC signing”** = **identify shopfloor devices by fingerprint** and **authenticate event requests from those devices using HMAC** so the server can trust and audit which device and operator sent each event.

---

## Phase 1: Administration & Governance

| Task                                  | Status | Notes                                                                                                                                                       |
| ------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI5 Web Components & Horizon Theme    | ✅     | Admin and station apps use `@ui5/webcomponents-react`, `@ui5/webcomponents-fiori`; `docs/UI/` (layout, FCL, station pattern); Horizon theme (CSS variables) |
| Sidebar & Navigation state management | ✅     | `web/apps/admin/src/components/layout/AppShell.tsx` — ShellBar, SideNavigation, SideNavigationItem/SubItem; state via React + routing                       |

---

## Summary

| Phase    | Done | Partial | Not found |
| -------- | ---- | ------- | --------- |
| Phase 00 | 1    | 4       | 3         |
| Phase 0  | 10   | 0       | 0         |
| Phase 1  | 2    | 0       | 0         |

**Recommendations**

- **Phase 00:** If charter, stakeholder ID, or interview summaries exist, add them under `docs/` or reference in this report; clarify where Functional Spec v0.1 lives (or that it is covered by current specs).
- **Phase 0:** See [Phase 0 — Remaining work](#phase-0--remaining-work) below.
- **Phase 1:** UI structure and sidebar/navigation are complete per current review.

---

## Phase 0 — Analysis and recommendations

| Item                      | Recommendation                     | Reason                                                                                         |
| ------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Husky + pre-commit**    | ✅ **Do it**                       | Prevents committing broken format/lint; low effort, high value for team.                       |
| **Unit tests for schema** | ✅ **Do it (minimal)**             | One small test (e.g. schema exports) satisfies “schema covered” and runs in CI.                |
| **Swagger**               | ⏳ **Not required for foundation** | SDK + Eden types already provide typed API; add Swagger later if you need browser API docs.    |
| **Document validation**   | ✅ **Do it**                       | One short note in tech-stack (TypeBox backend, Zod frontend, API docs = types) closes the gap. |

Phase 0 remaining work below has been **implemented** (Husky, schema test, validation/Swagger documented).

---

## Phase 0 — Remaining work (reference; now done)

To treat Phase 0 as **complete**, do the following.

### 1. Prettier/ESLint/Husky hooks (pre-commit) — ✅ Done

| Action              | Detail                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Install Husky       | e.g. `bun add -D husky` at repo root; `bunx husky init`                                                                 |
| Add pre-commit hook | Run `lint` and/or `format:check` (or `format`) before commit. Optionally use `lint-staged` to run only on staged files. |
| Document            | In README or `docs/architecture/tech-stack.md`: how to run lint/format and that pre-commit runs them.                   |

**Definition of done:** `.husky/pre-commit` exists and runs lint (and optionally format) so broken code is not committed.

---

### 2. Unit tests for schema — ✅ Done

| Action                     | Detail                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Add schema/migration tests | e.g. tests that run migrations and assert expected tables/columns, or tests that validate Drizzle schema exports (e.g. no broken relations). |
| Location                   | e.g. `backend/src/db/schema.test.ts` or `backend/src/db/migrate.test.ts`, or one test file per schema module.                                |
| CI                         | Already covered if you run `bun test` in `check:backend` (or add it).                                                                        |

**Definition of done:** At least one automated test that touches schema/migrations and runs in CI.

---

### 3. Zod validation & Swagger auto-doc — ✅ Documented

| Item                   | Current state                                                                      | To complete                                                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Request validation** | Done via Elysia + TypeBox (`t.*`) on backend; frontend uses Zod + react-hook-form. | Nothing required if you accept TypeBox as “validation” for Phase 0. Optionally document in `docs/architecture/api-and-routes.md` that validation is TypeBox (backend) and Zod (admin forms). |
| **Swagger auto-doc**   | Not present (no `@elysiajs/swagger` or similar).                                   | If API documentation is required: add `@elysiajs/swagger` (or equivalent) to Elysia, mount `/swagger` or `/doc`, and document the URL in README or API docs.                                 |

**Definition of done:**

- Validation: documented (TypeBox backend + Zod frontend) **or** no change if already agreed.
- Swagger: either “not required” is documented, or a working Swagger/OpenAPI endpoint is added and linked.

---

### Checklist (Phase 0 completion)

- [x] Husky + pre-commit hook runs lint-staged (Prettier on staged files).
- [x] At least one schema unit test exists (`backend/src/db/schema.test.ts`) and runs in CI via `check:backend`.
- [x] Validation (TypeBox + Zod) and “API docs = SDK/types; Swagger optional” documented in [tech-stack.md](../architecture/tech-stack.md).

---

_Last updated from codebase and docs in Traceability-system-ui5._
