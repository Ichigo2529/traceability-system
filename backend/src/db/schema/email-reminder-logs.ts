import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { materialRequests } from "./material-requests";
import { users } from "./auth";

export const emailReminderLogs = pgTable(
  "email_reminder_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    flowCode: varchar("flow_code", { length: 120 }).notNull(),
    materialRequestId: uuid("material_request_id")
      .notNull()
      .references(() => materialRequests.id, { onDelete: "cascade" }),
    recipientUserId: uuid("recipient_user_id").references(() => users.id, { onDelete: "set null" }),
    recipientEmail: varchar("recipient_email", { length: 255 }),
    templateId: varchar("template_id", { length: 120 }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    errorMessage: text("error_message"),
    policySnapshot: jsonb("policy_snapshot").$type<Record<string, unknown>>(),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_email_reminder_logs_flow_code").on(table.flowCode),
    index("idx_email_reminder_logs_request_id").on(table.materialRequestId),
    index("idx_email_reminder_logs_sent_at").on(table.sentAt),
  ]
);
