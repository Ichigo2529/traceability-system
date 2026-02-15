import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { machines, devices } from "./devices";
import { modelRevisions, variants } from "./config";

// ─── Units ──────────────────────────────────────────────

export const units = pgTable(
  "units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    unitType: varchar("unit_type", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("CREATED"),
    modelRevisionId: uuid("model_revision_id").references(
      () => modelRevisions.id
    ),
    variantId: uuid("variant_id").references(() => variants.id),
    machineId: uuid("machine_id").references(() => machines.id),
    lineCode: varchar("line_code", { length: 50 }),
    batchRef: varchar("batch_ref", { length: 200 }),
    qtyTotal: integer("qty_total"),
    qtyRemaining: integer("qty_remaining"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_units_unit_type").on(table.unitType),
    index("idx_units_unit_type_created_at").on(table.unitType, table.createdAt),
    index("idx_units_model_revision_id").on(table.modelRevisionId),
    index("idx_units_status").on(table.status),
  ]
);

// ─── Unit Links (genealogy) ─────────────────────────────

export const unitLinks = pgTable(
  "unit_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentUnitId: uuid("parent_unit_id")
      .notNull()
      .references(() => units.id),
    childUnitId: uuid("child_unit_id")
      .notNull()
      .references(() => units.id),
    linkType: varchar("link_type", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_unit_links_parent_unit_id").on(table.parentUnitId),
    index("idx_unit_links_child_unit_id").on(table.childUnitId),
  ]
);

// ─── Events (idempotent by event_id) ────────────────────

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey(), // client-generated UUID — idempotent key
    unitId: uuid("unit_id").references(() => units.id),
    machineId: uuid("machine_id").references(() => machines.id),
    deviceId: uuid("device_id").references(() => devices.id),
    operatorUserId: uuid("operator_user_id").references(() => users.id),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAtDevice: timestamp("created_at_device", {
      withTimezone: true,
    }).notNull(),
    receivedAtServer: timestamp("received_at_server", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    shiftDay: date("shift_day").notNull(),
    lineCode: varchar("line_code", { length: 50 }),
  },
  (table) => [
    index("idx_events_unit_id_received").on(
      table.unitId,
      table.receivedAtServer
    ),
    index("idx_events_event_type").on(table.eventType),
    index("idx_events_shift_day").on(table.shiftDay),
    index("idx_events_machine_id").on(table.machineId),
  ]
);
