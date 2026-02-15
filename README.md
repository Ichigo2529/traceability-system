# Traceability System (Monorepo)

Production-grade manufacturing traceability platform supporting:
- Multi-model / multi-revision configuration
- Shared bonding + downstream assembly divergence
- Device trust + operator session enforcement
- Offline-capable shopfloor event queue
- 92-byte label payload with shift-day serial reset (08:00 boundary, Asia/Bangkok)

## Tech Stack

- Backend: Bun + Elysia + TypeScript + PostgreSQL + Drizzle
- Frontend: React + Vite + TailwindCSS
- Offline queue: Dexie
- Target infra: Ubuntu 24 + Nginx + systemd/PM2

## Repository Structure

- `backend/`
- `web/apps/admin/`
- `web/apps/kiosk-pi5/`
- `web/apps/station-assembly/`
- `web/apps/station-label/`
- `web/apps/station-packing/`
- `web/apps/station-fg/`
- `web/packages/sdk/`
- `web/packages/offline-queue/`
- `web/packages/ui/`
- `docs/design-bible/`

## Design Bible (Source of Truth)

Read first:
- `docs/design-bible/00_README.md`

If any implementation conflicts with design-bible docs, design-bible wins.

## API Baseline

- `docs/contracts/API_BASELINE_v1.md` keeps the currently implemented endpoint surface.
- Update it whenever contract changes are introduced.

## Working Standard (Skills + Delivery)

- `docs/codex/SKILL_USAGE_BASELINE.md` defines the standard execution flow:
  requirement alignment -> implementation -> test -> security -> documentation.
- Use it as the default operating baseline for all feature and fix work.

## Prerequisites (Windows 11)

- Bun
- PostgreSQL (local install)
- Git

Recommended:
- Configure business timezone as `Asia/Bangkok` where relevant

## Environment

### `backend/.env`

Required minimum:
- `DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/traceability`
- `JWT_SECRET=...`
- `REFRESH_TOKEN_SECRET=...`
- `DEVICE_TOKEN_SECRET=...`
- `ADMIN_USERNAME=admin`
- `ADMIN_PASSWORD=change_me`
- `TZ=Asia/Bangkok`

### `web/.env`

- `VITE_API_BASE_URL=http://localhost:3000`
- `VITE_APP_TIMEZONE=Asia/Bangkok`
- `VITE_EDEN_STRICT_SCOPES=` (optional, comma-separated scopes; e.g. `material,admin`)
  - empty = Eden-first with SDK fallback
  - set scope = strict Eden for that scope (fallback disabled, errors surface immediately)
- `VITE_EDEN_STRICT_PRESET=` (optional; `critical` enables strict mode for: `material.issue`, `material.approve`, `material.reject`, `admin.workflow`)
- `VITE_EDEN_FALLBACK_DEBUG=false` (set `true` in dev to show realtime fallback monitor)

## Install

From repo root:

```bash
bun install
```

## Database

```bash
bun --cwd backend run db:migrate
bun --cwd backend run db:seed
```

## Run

### Backend

```bash
bun run dev:backend
```

### Admin UI

```bash
bun run dev:admin
```

### Kiosk UI

```bash
bun run dev:kiosk
```

## Quality Checks

From repo root:

```bash
bun run check
```

This runs:
- backend typecheck
- all web package checks
- all app builds

Go-live gate (includes DB connectivity + format check):

```bash
bun run check:go-live
```

## Notes

- Label generation and serial allocation are online-only operations.
- Shopfloor event submission requires valid device trust and active operator session.
- Use `IMPLEMENTATION_CHECKLIST.md` for delivery status.
- Use `ROADMAP_STABILITY.md` for controlled rollout plan.
