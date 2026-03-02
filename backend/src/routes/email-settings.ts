import Elysia, { t } from "elysia";
import { and, eq } from "drizzle-orm";
import { db } from "../db/connection";
import { workflowApprovalConfigs } from "../db/schema";
import { checkAuth, checkRole } from "../middleware/auth";
import { authDerive } from "../middleware/auth";
import { type AccessTokenPayload } from "../lib/jwt";
import { getSmtpSettingsMasked, sendEmail, upsertSmtpSettings } from "../lib/mail";

export const emailSettingsRoutes = new Elysia({ prefix: "/admin/email-settings" }).use(authDerive);
const MATERIAL_REQUEST_FLOW_CODE = "MATERIAL_REQUEST_APPROVAL";

type ReminderPolicy = {
  enabled: boolean;
  cadence_mode: "daily" | "interval_hours";
  interval_hours: number;
  max_reminders: number | null;
};

function formatLocalTimestamp(date: Date) {
  const timeZone = process.env.TZ || "Asia/Bangkok";
  const value = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
  return { value, timeZone };
}

function readReminderPolicy(metadata: unknown): ReminderPolicy {
  const fallback: ReminderPolicy = {
    enabled: false,
    cadence_mode: "daily",
    interval_hours: 24,
    max_reminders: null,
  };
  if (!metadata || typeof metadata !== "object") return fallback;
  const raw = (metadata as Record<string, unknown>).reminder_policy;
  if (!raw || typeof raw !== "object") return fallback;
  const data = raw as Record<string, unknown>;
  const mode = String(data.cadence_mode ?? "daily").trim().toLowerCase();
  const intervalRaw = Number(data.interval_hours ?? 24);
  const maxRaw = Number(data.max_reminders);
  return {
    enabled: Boolean(data.enabled),
    cadence_mode: mode === "interval_hours" ? "interval_hours" : "daily",
    interval_hours: Number.isFinite(intervalRaw) && intervalRaw > 0 ? Math.floor(intervalRaw) : 24,
    max_reminders: Number.isFinite(maxRaw) && maxRaw > 0 ? Math.floor(maxRaw) : null,
  };
}

emailSettingsRoutes.get("/", async ({ user, set }: { user: AccessTokenPayload | null; set: any }) => {
  const unauthorized = checkAuth({ user, set });
  if (unauthorized) return unauthorized;
  const blocked = checkRole(["ADMIN"])({ user, set });
  if (blocked) return blocked;

  const settings = await getSmtpSettingsMasked();
  return { success: true, data: settings };
});

emailSettingsRoutes.put(
  "/",
  async ({
    user,
    set,
    body,
  }: {
    user: AccessTokenPayload | null;
    set: any;
    body: {
      smtp_host: string;
      smtp_port: number;
      smtp_user?: string;
      smtp_password?: string;
      smtp_from_email: string;
      smtp_from_name?: string;
      smtp_secure?: boolean;
      enabled?: boolean;
    };
  }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const blocked = checkRole(["ADMIN"])({ user, set });
    if (blocked) return blocked;

    let saved;
    try {
      saved = await upsertSmtpSettings({
        smtp_host: body.smtp_host,
        smtp_port: body.smtp_port,
        smtp_user: body.smtp_user ?? null,
        smtp_password: body.smtp_password ?? null,
        smtp_from_email: body.smtp_from_email,
        smtp_from_name: body.smtp_from_name ?? null,
        smtp_secure: Boolean(body.smtp_secure),
        enabled: body.enabled ?? true,
      });
    } catch (error) {
      if ((error as Error).message.includes("EMAIL_SETTINGS_TABLE_MISSING")) {
        set.status = 503;
        return {
          success: false,
          error_code: "EMAIL_SETTINGS_TABLE_MISSING",
          message: "Email settings table is missing. Please run backend db:migrate first.",
        };
      }
      throw error;
    }

    return {
      success: true,
      data: {
        id: saved.id,
        smtp_host: saved.smtpHost,
        smtp_port: saved.smtpPort,
        smtp_user: saved.smtpUser,
        smtp_password: saved.smtpPassword ? "••••••••" : "",
        smtp_from_email: saved.smtpFromEmail,
        smtp_from_name: saved.smtpFromName,
        smtp_secure: saved.smtpSecure,
        enabled: saved.enabled,
        updated_at: saved.updatedAt,
      },
    };
  },
  {
    body: t.Object({
      smtp_host: t.String({ minLength: 1 }),
      smtp_port: t.Number({ minimum: 1 }),
      smtp_user: t.Optional(t.String()),
      smtp_password: t.Optional(t.String()),
      smtp_from_email: t.String({ minLength: 3 }),
      smtp_from_name: t.Optional(t.String()),
      smtp_secure: t.Optional(t.Boolean()),
      enabled: t.Optional(t.Boolean()),
    }),
  }
);

emailSettingsRoutes.post(
  "/test",
  async ({
    user,
    set,
    body,
  }: {
    user: AccessTokenPayload | null;
    set: any;
    body: { to: string };
  }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const blocked = checkRole(["ADMIN"])({ user, set });
    if (blocked) return blocked;

    const status = await sendEmail({
      recipients: [{ email: body.to, display_name: body.to }],
      subject: "[Traceability] SMTP Test Email",
      html: (() => {
        const now = new Date();
        const local = formatLocalTimestamp(now);
        return `<p>SMTP test successful at ${local.value} (${local.timeZone})</p><p style="color:#666">UTC: ${now.toISOString()}</p>`;
      })(),
    });

    if (status === "FAILED") {
      set.status = 500;
      return { success: false, error_code: "EMAIL_SEND_FAILED", message: "Failed to send test email" };
    }

    return { success: true, data: { status } };
  },
  {
    body: t.Object({
      to: t.String({ minLength: 3 }),
    }),
  }
);

emailSettingsRoutes.get(
  "/reminder-policy",
  async ({ user, set }: { user: AccessTokenPayload | null; set: any }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const blocked = checkRole(["ADMIN"])({ user, set });
    if (blocked) return blocked;

    const rows = await db
      .select({
        id: workflowApprovalConfigs.id,
        metadata: workflowApprovalConfigs.metadata,
      })
      .from(workflowApprovalConfigs)
      .where(and(eq(workflowApprovalConfigs.flowCode, MATERIAL_REQUEST_FLOW_CODE), eq(workflowApprovalConfigs.isActive, true)));

    if (!rows.length) {
      set.status = 404;
      return { success: false, error_code: "NOT_FOUND", message: "Material workflow config not found" };
    }

    return {
      success: true,
      data: {
        flow_code: MATERIAL_REQUEST_FLOW_CODE,
        policy: readReminderPolicy(rows[0]?.metadata),
      },
    };
  }
);

emailSettingsRoutes.put(
  "/reminder-policy",
  async ({
    user,
    set,
    body,
  }: {
    user: AccessTokenPayload | null;
    set: any;
    body: ReminderPolicy;
  }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const blocked = checkRole(["ADMIN"])({ user, set });
    if (blocked) return blocked;

    const normalized: ReminderPolicy = {
      enabled: Boolean(body.enabled),
      cadence_mode: body.cadence_mode === "interval_hours" ? "interval_hours" : "daily",
      interval_hours: Math.max(1, Number(body.interval_hours ?? 24)),
      max_reminders:
        body.max_reminders == null ? null : Number(body.max_reminders) > 0 ? Math.floor(Number(body.max_reminders)) : null,
    };

    const rows = await db
      .select({
        id: workflowApprovalConfigs.id,
        metadata: workflowApprovalConfigs.metadata,
      })
      .from(workflowApprovalConfigs)
      .where(and(eq(workflowApprovalConfigs.flowCode, MATERIAL_REQUEST_FLOW_CODE), eq(workflowApprovalConfigs.isActive, true)));

    if (!rows.length) {
      set.status = 404;
      return { success: false, error_code: "NOT_FOUND", message: "Material workflow config not found" };
    }

    for (const row of rows) {
      const metadata = row.metadata && typeof row.metadata === "object" ? { ...(row.metadata as Record<string, unknown>) } : {};
      metadata.reminder_policy = normalized;
      await db
        .update(workflowApprovalConfigs)
        .set({
          metadata,
          updatedAt: new Date(),
        })
        .where(eq(workflowApprovalConfigs.id, row.id));
    }

    return {
      success: true,
      data: {
        flow_code: MATERIAL_REQUEST_FLOW_CODE,
        policy: normalized,
      },
    };
  },
  {
    body: t.Object({
      enabled: t.Boolean(),
      cadence_mode: t.Union([t.Literal("daily"), t.Literal("interval_hours")]),
      interval_hours: t.Number({ minimum: 1 }),
      max_reminders: t.Nullable(t.Number({ minimum: 1 })),
    }),
  }
);
