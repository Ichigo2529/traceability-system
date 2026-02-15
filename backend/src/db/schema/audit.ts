import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { units } from "./production";

// ─── Config Audit Logs ──────────────────────────────────
// Bible §13: who changed, before/after JSON, timestamp

export const configAuditLogs = pgTable(
  "config_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    action: varchar("action", { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, ACTIVATE, etc.
    beforeData: jsonb("before_data").$type<Record<string, unknown>>(),
    afterData: jsonb("after_data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_config_audit_logs_entity").on(
      table.entityType,
      table.entityId
    ),
    index("idx_config_audit_logs_user_id").on(table.userId),
    index("idx_config_audit_logs_created_at").on(table.createdAt),
  ]
);

// ─── Holds / Exceptions ────────────────────────────────
// Bible §05: FLUX_FAIL and FVMI_FAIL go to HOLD
// Bible §04: holds/exceptions (recommended)

export const holdStatusEnum = pgEnum("hold_status", [
  "OPEN",
  "RESOLVED",
  "SCRAPPED",
]);

export const holds = pgTable(
  "holds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id),
    holdType: varchar("hold_type", { length: 100 }).notNull(), // FLUX_FAIL, FVMI_FAIL, MANUAL, etc.
    reason: text("reason"),
    status: holdStatusEnum("status").default("OPEN").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_holds_unit_id").on(table.unitId),
    index("idx_holds_status").on(table.status),
  ]
);
