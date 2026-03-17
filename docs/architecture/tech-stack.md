# Architecture and tech stack (current)

This document summarizes architecture and technical decisions aligned with the current codebase.

---

## 1. Tech stack

| Layer                     | Technology                                                     |
| ------------------------- | -------------------------------------------------------------- |
| Runtime / package manager | **Bun**                                                        |
| Backend                   | **Elysia** + TypeScript                                        |
| Database                  | **PostgreSQL** + **Drizzle ORM**                               |
| Frontend                  | **React 19** + **Vite 6**                                      |
| UI                        | **shadcn/ui** (Radix + Tailwind + Lucide)                      |
| API client                | **Eden Treaty** (`@elysiajs/eden`) + SDK in `web/packages/sdk` |
| Server state (FE)         | **TanStack React Query**                                       |
| Offline queue (station)   | **Dexie** (IndexedDB)                                          |

- The project **does not use Docker** for development on Windows 11 (PostgreSQL is installed locally).
- Timezone / shift-day: **Asia/Bangkok (UTC+7)**, boundary 08:00.

---

## 2. Repository structure

```
backend/           # Elysia API, DB schema, migrations, business logic
web/
  apps/
    admin/         # Admin + Station UIs (React, shadcn/ui)
    kiosk-pi5/     # Kiosk entry (if used)
  packages/
    sdk/           # Typed API client, types
    ui/            # Shared UI components (if used)
docs/              # All documentation
```

- Admin and Station UIs live in a **single app** (`admin`) with routes under `/admin` and `/station`.

---

## 3. Development rules

- **Type safety:** Use Eden Treaty + SDK; types must be exported from `web/packages/sdk`.
- **Frontend:** Theme via CSS variables and optional `dark` class; server state = React Query, UI state = useState/Context. Use shadcn/ui components and `@traceability/ui` where applicable.
- **Database:** Schema changes only via Drizzle migrations; serial allocation uses `SELECT … FOR UPDATE` on `serial_counters`.
- **Offline:** Events stored in Dexie, replayed in order by `created_at_device`; idempotency via `event_id` (UUID).
- **Shift-day:** If time &lt; 08:00 (Asia/Bangkok), treat as previous day’s shift_day; server is the source of truth.

---

## 4. Validation and API documentation

- **Backend request validation:** Elysia + **TypeBox** (`t.*`) on all route bodies/params; see `backend/src/routes/*`.
- **Frontend forms:** **Zod** + react-hook-form in admin app; types stay in sync with API where possible.
- **API documentation:** Typed client via Eden Treaty + `web/packages/sdk`; no Swagger/OpenAPI endpoint at present. Adding `@elysiajs/swagger` (or similar) is optional for future if a browser-based API doc is needed.

---

## 5. See also

- Pre-commit: run `bun run lint-staged` (format staged files); hooks via Husky (`.husky/pre-commit`).
- Current database: [database.md](database.md)
- API and routes: [api-and-routes.md](api-and-routes.md)
- UI standards: [../ui/guidelines.md](../ui/guidelines.md)
- Domain rules and event catalog: [../specs/](../specs/)
