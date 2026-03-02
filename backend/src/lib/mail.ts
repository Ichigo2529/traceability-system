import nodemailer from "nodemailer";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/connection";
import { emailSettings } from "../db/schema";

export type AlertRecipient = {
  user_id?: string;
  display_name?: string | null;
  email?: string | null;
};

export type AlertSendStatus = "SENT" | "FAILED" | "NOT_CONFIGURED" | "NO_RECIPIENTS";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string | null;
  pass: string | null;
  fromEmail: string;
  fromName: string | null;
  secure: boolean;
  enabled: boolean;
};

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const [row] = await db.select().from(emailSettings).orderBy(desc(emailSettings.updatedAt)).limit(1);
  if (row) {
    return {
      host: row.smtpHost,
      port: row.smtpPort,
      user: row.smtpUser ?? null,
      pass: row.smtpPassword ?? null,
      fromEmail: row.smtpFromEmail,
      fromName: row.smtpFromName ?? null,
      secure: row.smtpSecure,
      enabled: row.enabled,
    };
  }

  // Optional fallback from env for first-time setup
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM_EMAIL) return null;
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    fromEmail: process.env.SMTP_FROM_EMAIL,
    fromName: process.env.SMTP_FROM_NAME || null,
    secure: String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true",
    enabled: true,
  };
}

function normalizeRecipients(recipients: AlertRecipient[]): string[] {
  const uniq = new Set<string>();
  for (const r of recipients) {
    const email = String(r.email ?? "").trim().toLowerCase();
    if (!email) continue;
    uniq.add(email);
  }
  return Array.from(uniq);
}

export async function sendEmail(input: {
  recipients: AlertRecipient[];
  subject: string;
  html: string;
}): Promise<AlertSendStatus> {
  const to = normalizeRecipients(input.recipients);
  if (!to.length) return "NO_RECIPIENTS";

  const config = await getSmtpConfig();
  if (!config || !config.enabled) return "NOT_CONFIGURED";

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass ?? "" } : undefined,
    });
    await transporter.sendMail({
      from: config.fromName ? `"${config.fromName}" <${config.fromEmail}>` : config.fromEmail,
      to: to.join(", "),
      subject: input.subject,
      html: input.html,
    });
    return "SENT";
  } catch (error) {
    console.error("[mail] send failed:", error);
    return "FAILED";
  }
}

export async function getSmtpSettingsMasked() {
  const [row] = await db.select().from(emailSettings).orderBy(desc(emailSettings.updatedAt)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    smtp_host: row.smtpHost,
    smtp_port: row.smtpPort,
    smtp_user: row.smtpUser,
    smtp_password: row.smtpPassword ? "••••••••" : "",
    smtp_from_email: row.smtpFromEmail,
    smtp_from_name: row.smtpFromName,
    smtp_secure: row.smtpSecure,
    enabled: row.enabled,
    updated_at: row.updatedAt,
  };
}

export async function upsertSmtpSettings(input: {
  id?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user?: string | null;
  smtp_password?: string | null;
  smtp_from_email: string;
  smtp_from_name?: string | null;
  smtp_secure?: boolean;
  enabled?: boolean;
}) {
  const [latest] = await db.select().from(emailSettings).orderBy(desc(emailSettings.updatedAt)).limit(1);

  const payload = {
    smtpHost: input.smtp_host.trim(),
    smtpPort: input.smtp_port,
    smtpUser: input.smtp_user?.trim() || null,
    smtpPassword:
      typeof input.smtp_password === "string" && input.smtp_password.trim().length > 0
        ? input.smtp_password
        : latest?.smtpPassword ?? null,
    smtpFromEmail: input.smtp_from_email.trim(),
    smtpFromName: input.smtp_from_name?.trim() || null,
    smtpSecure: Boolean(input.smtp_secure),
    enabled: input.enabled ?? true,
    updatedAt: new Date(),
  };

  if (latest) {
    const [updated] = await db.update(emailSettings).set(payload).where(eq(emailSettings.id, latest.id)).returning();
    return updated;
  }

  const [created] = await db
    .insert(emailSettings)
    .values({
      ...payload,
      createdAt: new Date(),
    })
    .returning();
  return created;
}
