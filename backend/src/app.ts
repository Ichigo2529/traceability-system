import { Elysia } from "elysia";
import { sql } from "drizzle-orm";
import { cors } from "@elysiajs/cors";
import { db } from "./db/connection";
import { fail } from "./lib/http";
import { authRoutes } from "./routes/auth";
import { adminRoutes } from "./routes/admin";
import { deviceRoutes } from "./routes/device";
import { eventRoutes, labelRoutes } from "./routes/events";
import { traceRoutes } from "./routes/trace";
import { materialRequestRoutes } from "./routes/material-requests";
import { realtimeRoutes } from "./routes/realtime";
import { inventoryRoutes } from "./routes/inventory";
import { emailSettingsRoutes } from "./routes/email-settings";
import { initAlertTemplates } from "./lib/alert-templates";

initAlertTemplates();

export const app = new Elysia()
  .use(cors())
  .onError(({ code, error, set }) => {
    if (error.message === "UNAUTHORIZED") {
      set.status = 401;
      return fail("UNAUTHORIZED", "Authentication required");
    }

    if (code === "VALIDATION") {
      set.status = 400;
      const details = (error as any)?.all ?? (error as any)?.message ?? undefined;
      return fail("VALIDATION_ERROR", "Invalid request payload", details);
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return fail("NOT_FOUND", "Requested record was not found");
    }

    const currentStatus = typeof set.status === "number" ? set.status : Number(set.status ?? 0);
    if (!Number.isFinite(currentStatus) || currentStatus < 400) {
      set.status = 500;
    }
    console.error(`[${code}]`, error);
    return fail(code, error.message || "Internal server error");
  })
  .get("/health", async () => {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: "ok", timestamp: new Date().toISOString() };
    } catch {
      return { status: "error", message: "Database connection failed" };
    }
  })
  .use(authRoutes)
  .use(adminRoutes)
  .use(deviceRoutes)
  .use(eventRoutes)
  .use(labelRoutes)
  .use(traceRoutes)
  .use(materialRequestRoutes)
  .use(emailSettingsRoutes)
  .use(inventoryRoutes)
  .use(realtimeRoutes);

export type App = typeof app;
