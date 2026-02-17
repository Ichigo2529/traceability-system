import { app } from "./app";

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
