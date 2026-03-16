import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/connection";
import { emailReminderLogs, materialRequests, roles, userRoles, users, workflowApprovalConfigs } from "../db/schema";
import { sendAlertEmail } from "./alert";

type ReminderPolicy = {
  enabled: boolean;
  cadence_mode: "daily" | "interval_hours";
  interval_hours: number;
  max_reminders: number | null;
};

type WorkflowApproverUser = {
  user_id: string;
  email?: string | null;
};

const FLOW_CODE = "MATERIAL_REQUEST_APPROVAL";
const TEMPLATE_ID = "material_request_pending_reminder";

function parseWorkflowApproverUsers(metadata: unknown): WorkflowApproverUser[] {
  if (!metadata || typeof metadata !== "object") return [];
  const value = (metadata as Record<string, unknown>).approver_users;
  if (!Array.isArray(value)) return [];
  const rows = value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const input = row as Record<string, unknown>;
      const user_id = String(input.user_id ?? "").trim();
      if (!user_id) return null;
      const email = String(input.email ?? "").trim();
      return { user_id, email: email || null } as WorkflowApproverUser;
    })
    .filter((row): row is WorkflowApproverUser => Boolean(row));

  const uniq = new Map<string, WorkflowApproverUser>();
  for (const row of rows) {
    uniq.set(row.user_id, row);
  }
  return Array.from(uniq.values());
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
  const value = raw as Record<string, unknown>;
  const mode = String(value.cadence_mode ?? "daily").trim().toLowerCase();
  const normalizedMode = mode === "interval_hours" ? "interval_hours" : "daily";
  const interval = Math.max(1, Number(value.interval_hours ?? fallback.interval_hours));
  const maxRaw = Number(value.max_reminders);
  return {
    enabled: Boolean(value.enabled),
    cadence_mode: normalizedMode,
    interval_hours: Number.isFinite(interval) ? interval : fallback.interval_hours,
    max_reminders: Number.isFinite(maxRaw) && maxRaw > 0 ? Math.floor(maxRaw) : null,
  };
}

async function getReminderPolicyAndRecipients() {
  const rows = await db
    .select({
      id: workflowApprovalConfigs.id,
      level: workflowApprovalConfigs.level,
      metadata: workflowApprovalConfigs.metadata,
      approver_role_name: roles.name,
    })
    .from(workflowApprovalConfigs)
    .leftJoin(roles, eq(roles.id, workflowApprovalConfigs.approverRoleId))
    .where(and(eq(workflowApprovalConfigs.flowCode, FLOW_CODE), eq(workflowApprovalConfigs.isActive, true)))
    .orderBy(asc(workflowApprovalConfigs.level));

  const holder = rows.find((row) => row.level === 2) ?? rows[0];
  const policy = readReminderPolicy(holder?.metadata);
  if (!policy.enabled) return { policy, recipients: [] as Array<{ user_id: string; email: string | null }> };

  const approverUsers = parseWorkflowApproverUsers(holder?.metadata);
  if (approverUsers.length > 0) {
    const userRows = await db
      .select({ user_id: users.id, email: users.email })
      .from(users)
      .where(and(inArray(users.id, approverUsers.map((row) => row.user_id)), eq(users.isActive, true)));
    const byId = new Map(userRows.map((row) => [row.user_id, row.email ?? null]));
    return {
      policy,
      recipients: approverUsers.map((row) => ({
        user_id: row.user_id,
        email: row.email ?? byId.get(row.user_id) ?? null,
      })),
    };
  }

  if (holder?.approver_role_name) {
    const roleRows = await db
      .select({ user_id: users.id, email: users.email })
      .from(userRoles)
      .innerJoin(users, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(roles.name, holder.approver_role_name), eq(users.isActive, true)));
    const uniq = new Map<string, { user_id: string; email: string | null }>();
    for (const row of roleRows) {
      uniq.set(row.user_id, { user_id: row.user_id, email: row.email ?? null });
    }
    return { policy, recipients: Array.from(uniq.values()) };
  }

  return { policy, recipients: [] as Array<{ user_id: string; email: string | null }> };
}

function toMs(hours: number) {
  return Math.max(1, hours) * 60 * 60 * 1000;
}

let running = false;

export async function runMaterialRequestReminderCycle() {
  if (running) return;
  running = true;
  try {
    const { policy, recipients } = await getReminderPolicyAndRecipients();
    if (!policy.enabled) return;

    const intervalMs = policy.cadence_mode === "daily" ? toMs(24) : toMs(policy.interval_hours);
    const now = Date.now();

    const pending = await db
      .select({
        id: materialRequests.id,
        request_no: materialRequests.requestNo,
        dmi_no: materialRequests.dmiNo,
        created_at: materialRequests.createdAt,
      })
      .from(materialRequests)
      .where(eq(materialRequests.status, "REQUESTED"))
      .orderBy(asc(materialRequests.createdAt));

    for (const request of pending) {
      const [last] = await db
        .select({
          sent_at: emailReminderLogs.sentAt,
          status: emailReminderLogs.status,
        })
        .from(emailReminderLogs)
        .where(and(eq(emailReminderLogs.flowCode, FLOW_CODE), eq(emailReminderLogs.materialRequestId, request.id)))
        .orderBy(desc(emailReminderLogs.sentAt))
        .limit(1);

      const sentCountRows = await db
        .select({ count: emailReminderLogs.id })
        .from(emailReminderLogs)
        .where(and(eq(emailReminderLogs.flowCode, FLOW_CODE), eq(emailReminderLogs.materialRequestId, request.id)));
      const sentCount = sentCountRows.length;

      if (policy.max_reminders && sentCount >= policy.max_reminders) continue;

      const since = last?.sent_at ? new Date(last.sent_at).getTime() : new Date(request.created_at).getTime();
      if (Number.isFinite(since) && now - since < intervalMs) continue;

      const status = await sendAlertEmail({
        templateId: TEMPLATE_ID,
        recipients: recipients.map((row) => ({
          user_id: row.user_id,
          email: row.email,
          display_name: row.email,
        })),
        context: {
          requestNo: request.request_no,
          dmiNo: request.dmi_no,
          actorName: "Reminder Scheduler",
          intervalHours: policy.cadence_mode === "daily" ? 24 : policy.interval_hours,
        },
      });

      await db.insert(emailReminderLogs).values({
        flowCode: FLOW_CODE,
        materialRequestId: request.id,
        recipientEmail: recipients.map((row) => row.email).filter(Boolean).join(", ") || null,
        templateId: TEMPLATE_ID,
        status,
        errorMessage: status === "FAILED" ? "Failed to send reminder email" : null,
        policySnapshot: {
          enabled: policy.enabled,
          cadence_mode: policy.cadence_mode,
          interval_hours: policy.interval_hours,
          max_reminders: policy.max_reminders,
          recipient_count: recipients.length,
        },
        sentAt: new Date(),
      });
    }
  } catch (error) {
    console.error("[SCHEDULER] material request reminder failed:", error);
  } finally {
    running = false;
  }
}
