import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { processes, stations } from "./organization";

export const deviceTypeEnum = pgEnum("device_type", ["pi", "pc", "tablet", "kiosk"]);
export const deviceStatusEnum = pgEnum("device_status", ["active", "disabled", "maintenance"]);

export const machines = pgTable("machines", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  machineType: varchar("machine_type", { length: 100 }).notNull(),
  lineCode: varchar("line_code", { length: 50 }),
  capabilities: jsonb("capabilities").$type<Record<string, unknown>>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceCode: varchar("device_code", { length: 100 }),
    name: varchar("name", { length: 200 }),
    fingerprint: varchar("fingerprint", { length: 500 }).notNull().unique(),
    hostname: varchar("hostname", { length: 200 }),
    mac: varchar("mac", { length: 50 }),
    ipAddress: varchar("ip_address", { length: 100 }),
    deviceType: deviceTypeEnum("device_type").default("pi").notNull(),
    deviceStatus: deviceStatusEnum("device_status").default("active").notNull(),
    activationPin: varchar("activation_pin", { length: 64 }),
    secretKey: varchar("secret_key", { length: 255 }),
    secretRotatedAt: timestamp("secret_rotated_at", { withTimezone: true }),
    deviceTokenHash: varchar("device_token_hash", { length: 255 }),
    machineId: uuid("machine_id").references(() => machines.id, {
      onDelete: "set null",
    }),
    stationId: uuid("station_id").references(() => stations.id, { onDelete: "set null" }),
    processId: uuid("process_id").references(() => processes.id, { onDelete: "set null" }),
    isActive: boolean("is_active").default(true).notNull(),
    lastSeen: timestamp("last_seen", { withTimezone: true }),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    appVersion: varchar("app_version", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_devices_machine_id").on(table.machineId),
    index("idx_devices_station_id").on(table.stationId),
    index("idx_devices_process_id").on(table.processId),
    index("idx_devices_device_code").on(table.deviceCode),
  ]
);

export const deviceOperatorSessions = pgTable(
  "device_operator_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_device_operator_sessions_device_id").on(table.deviceId),
    index("idx_device_operator_sessions_user_id").on(table.userId),
  ]
);
