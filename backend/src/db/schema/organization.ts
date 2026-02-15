import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
  jsonb,
  text,
} from "drizzle-orm/pg-core";
import { roles } from "./auth";

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(100),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_departments_code").on(table.code),
    uniqueIndex("uq_departments_name").on(table.name),
    index("idx_departments_active").on(table.isActive),
    index("idx_departments_sort_order").on(table.sortOrder),
  ]
);

export const processes = pgTable(
  "processes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    processCode: varchar("process_code", { length: 80 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    sequenceOrder: integer("sequence_order").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_processes_process_code").on(table.processCode),
  ]
);

export const stations = pgTable(
  "stations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stationCode: varchar("station_code", { length: 80 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    line: varchar("line", { length: 80 }),
    area: varchar("area", { length: 120 }),
    processId: uuid("process_id").references(() => processes.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_stations_station_code").on(table.stationCode),
    index("idx_stations_process_id").on(table.processId),
  ]
);

export const workflowApprovalConfigs = pgTable(
  "workflow_approval_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    flowCode: varchar("flow_code", { length: 100 }).notNull(),
    flowName: varchar("flow_name", { length: 200 }).notNull(),
    fromStatus: varchar("from_status", { length: 50 }).notNull(),
    toStatus: varchar("to_status", { length: 50 }).notNull(),
    level: integer("level").notNull(),
    approverRoleId: uuid("approver_role_id").references(() => roles.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_workflow_approval_flow_level").on(table.flowCode, table.level),
    index("idx_workflow_approval_role").on(table.approverRoleId),
  ]
);

export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 120 }).primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
