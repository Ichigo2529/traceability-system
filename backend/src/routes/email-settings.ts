import Elysia, { t } from "elysia";
import { checkAuth, checkRole } from "../middleware/auth";
import { authDerive } from "../middleware/auth";
import { type AccessTokenPayload } from "../lib/jwt";
import { getSmtpSettingsMasked, sendEmail, upsertSmtpSettings } from "../lib/mail";

export const emailSettingsRoutes = new Elysia({ prefix: "/admin/email-settings" }).use(authDerive);

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

    const saved = await upsertSmtpSettings({
      smtp_host: body.smtp_host,
      smtp_port: body.smtp_port,
      smtp_user: body.smtp_user ?? null,
      smtp_password: body.smtp_password ?? null,
      smtp_from_email: body.smtp_from_email,
      smtp_from_name: body.smtp_from_name ?? null,
      smtp_secure: Boolean(body.smtp_secure),
      enabled: body.enabled ?? true,
    });

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
      html: `<p>SMTP test successful at ${new Date().toISOString()}</p>`,
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
