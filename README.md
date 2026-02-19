# Traceability System (Monorepo)

Production-grade manufacturing traceability platform. Cross-platform monorepo using Bun, Elysia, and UI5 Web Components.

## 🚀 Presentation & Roadmap (Start Here)

- **[Executive Summary](file:///d:/Project/Traceability-system-ui5/EXECUTIVE_SUMMARY.md)**: Vision, Tech Stack, and High-level Roadmap for Management.
- **[Master Program Schedule (2026)](file:///d:/Project/Traceability-system-ui5/docs/MASTER_PROGRAM_SCHEDULE_2026.md)**: Detailed 12-month delivery timeline (Solo Dev).
- **[Technical Delivery Specification](file:///d:/Project/Traceability-system-ui5/docs/TECHNICAL_DELIVERY_SPEC_v1.md)**: Implementation patterns and code standards for Developers.
- **[Master Task Structure](file:///d:/Project/Traceability-system-ui5/docs/MASTER_TASK_STRUCTURE.md)**: Comprehensive project scope and technical backlog.
- **[Single Go-Live Roadmap](file:///d:/Project/Traceability-system-ui5/ROADMAP_STABILITY.md)**: Operational timeline and program targets.

## 🛠️ Tech Stack

- **Frontend**:
  - React + Vite
  - UI5 Web Components for React (SAP Horizon Theme)
  - TanStack React Query + Eden Treaty (SDK)
  - Offline queue: Dexie
- **Backend**: Bun + Elysia + TypeScript + PostgreSQL + Drizzle
- **Target infra**: Ubuntu 24 + Nginx + systemd/PM2

## 📁 Repository Structure

- `backend/`: Core API, business rules, and DB migrations.
- `web/apps/admin/`: Central governance console (UI5).
- `web/apps/kiosk-pi5/`: Shopfloor kiosk application.
- `web/packages/sdk/`: Shared API client and types.
- `docs/design-bible/`: Authoritative technical specification (v1.0).

## 📖 Design Bible (Source of Truth)

Read the authoritative specs here: [docs/design-bible/00_README.md](file:///d:/Project/Traceability-system-ui5/docs/design-bible/00_README.md)

## ⚙️ Developer Setup

1. **Install Dependencies**: `bun install`
2. **Database**: `bun run db:migrate` then `bun run db:seed`
3. **Run Dev**:
   - Backend: `bun run dev:backend`
   - Admin: `bun run dev:admin`
   - Kiosk: `bun run dev:kiosk`

## 🩺 Quality Assurance

Run all checks: `bun run check`
Go-live gate: `bun run check:go-live`

---

_For delivery status, see [IMPLEMENTATION_CHECKLIST.md](file:///d:/Project/Traceability-system-ui5/IMPLEMENTATION_CHECKLIST.md)_
