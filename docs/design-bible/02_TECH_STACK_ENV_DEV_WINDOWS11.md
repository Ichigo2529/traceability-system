# 02 Tech Stack & Windows 11 Dev Environment (No Docker)

## Backend

- Bun runtime
- Elysia (API)
- TypeScript
- Drizzle ORM
- PostgreSQL (local installation)
- JWT + refresh tokens
- bcrypt password hashing

## Frontend

- React + Vite
- UI5 Web Components for React (SAP Horizon Theme)
- TanStack React Query for data fetching
- @elysiajs/eden (Eden Treaty) for end-to-end typed API communication
- Dexie for offline queueing (Kiosk/Station apps)
- React Hook Form + Zod for validation

## Dev setup (Windows 11)

Install:

- Bun
- Node (optional for tooling)
- PostgreSQL (local)
- Git
- Cursor

Environment variables:

- backend/.env
  - DATABASE_URL=postgres://...
  - JWT_SECRET=...
  - REFRESH_TOKEN_SECRET=...
  - ADMIN_USERNAME=...
  - ADMIN_PASSWORD=...
  - DEVICE_TOKEN_SECRET=...
  - TZ=Asia/Bangkok

Run:

- Root: `bun install`
- Backend: `cd backend && bun run dev`
- Web apps: `cd web/apps/admin && bun run dev`
- Shopfloor app: `cd web/apps/kiosk-pi5 && bun run dev`

No Docker compose. No container dependency.

## Production runtime (Ubuntu 24 on Hyper-V)

- Node/Bun installed
- Nginx reverse proxy
- systemd or PM2 to run backend
- PostgreSQL on VM or separate server
