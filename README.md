# Traceability System (Monorepo)

Production-grade manufacturing traceability platform. Bun + Elysia + React + shadcn/ui (Tailwind + Radix).

## Documentation (start here)

- **[docs/README.md](docs/README.md)** — Documentation entry point
- **[docs/INDEX.md](docs/INDEX.md)** — Full documentation index
- **Current system (aligned with code and DB):** [docs/architecture/](docs/architecture/) — Tech stack, database, API and routes
- **Roadmap and checklist:** [docs/project/roadmap.md](docs/project/roadmap.md), [docs/project/checklist.md](docs/project/checklist.md)
- **Domain and technical specs:** [docs/specs/README.md](docs/specs/README.md)

## Tech stack

- **Frontend:** React + Vite, shadcn/ui + Tailwind + Lucide, TanStack React Query, Eden Treaty (SDK), Dexie (offline)
- **Backend:** Bun + Elysia + TypeScript + PostgreSQL + Drizzle
- **Target infra:** Ubuntu 24 + Nginx + systemd/PM2

## Repository structure

- `backend/` — API, business logic, DB schema and migrations
- `web/apps/admin/` — Admin and station UIs (single app, routes `/admin` and `/station`)
- `web/apps/kiosk-pi5/` — Kiosk entry (if used)
- `web/packages/sdk/` — Shared API client and types
- `docs/` — All documentation (see [docs/INDEX.md](docs/INDEX.md))

## Developer setup

1. **Install:** `bun install`
2. **Database:** `bun run db:migrate` then `bun run db:seed`
3. **Run dev:**
   - Backend: `bun run dev:backend`
   - Admin: `bun run dev:admin`
   - Kiosk: `bun run dev:kiosk`

## Quality

- All checks: `bun run check`
- Go-live gate: `bun run check:go-live`
