# Spec 14 – Deployment

- **Target:** Ubuntu 24, Nginx, systemd/PM2 (or equivalent). No Docker for dev (Windows 11).
- **Backend:** Build and run Node/Bun process; env from .env; DB migrations before start.
- **Frontend:** Static build (Vite); serve via Nginx. Admin and station from same app build.
- **Runbook:** [../operations/runbook-go-live.md](../operations/runbook-go-live.md).
- **Timezone / shift-day:** Asia/Bangkok (UTC+7), boundary 08:00. Before 08:00 = previous calendar day; server `computeShiftDay()` is source of truth. Unit test: `backend/src/lib/shift-day.test.ts`. Device heartbeat returns `shift_day`; Station UI shows it in StationHeader.
