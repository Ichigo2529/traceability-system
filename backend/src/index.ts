import { app } from "./app";
import { holdStaleSetRuns } from "./lib/set-run-service";
import { runMaterialRequestReminderCycle } from "./lib/reminder-service";

const port = process.env.PORT ?? 3000;

app.listen(port);

console.log(`Traceability backend running at http://localhost:${port}`);
console.log(`   Health:  GET  /health`);
console.log(`   Auth:    POST /auth/login | /auth/refresh | /auth/logout`);
console.log(`   Admin:   GET  /admin/users | /admin/roles | /admin/devices`);
console.log(`   Config:  /admin/processes | /admin/stations | /admin/workflow-approvals`);
console.log(`   Device:  POST /device/register | /device/heartbeat`);
console.log(`   Device:  POST /device/activate | /admin/devices/:id/regenerate-secret`);
console.log(`   Kiosk:   POST /device/operator/login | /logout | GET /me`);
console.log(`   Events:  POST /events`);
console.log(`   Material: /material-requests (Production/Store workflow)`);
console.log(`   Realtime: GET /realtime/material-requests (SSE)`);
console.log(`   Trace:   GET /trace/unit/:id | /trace/material/:lot | /trace/set/:code`);
console.log(`   Admin:   POST /admin/set/force-close | /admin/set/reopen-last | /admin/material/reassign`);

// ─── Background Scheduler ───────────────────────────────
// Auto-hold stale set_runs every 10 minutes
const STALE_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const REMINDER_CHECK_INTERVAL_MS = Number(process.env.REMINDER_CHECK_INTERVAL_MS ?? 15 * 60 * 1000);

setInterval(async () => {
  try {
    const count = await holdStaleSetRuns(8);
    if (count > 0) {
      console.log(`[SCHEDULER] holdStaleSetRuns: ${count} set_run(s) moved to HOLD`);
    }
  } catch (err) {
    console.error("[SCHEDULER] holdStaleSetRuns failed:", err);
  }
}, STALE_CHECK_INTERVAL_MS);

console.log(`[SCHEDULER] Stale set_run check running every ${STALE_CHECK_INTERVAL_MS / 60000} minutes`);

setInterval(async () => {
  await runMaterialRequestReminderCycle();
}, REMINDER_CHECK_INTERVAL_MS);

console.log(`[SCHEDULER] Material reminder check running every ${Math.floor(REMINDER_CHECK_INTERVAL_MS / 60000)} minutes`);
