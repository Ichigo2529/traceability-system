import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  date,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { modelRevisions, variants } from "./config";
import { units } from "./production";

// ─── Label Templates ────────────────────────────────────

export const labelTemplates = pgTable(
  "label_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    templateBody: text("template_body").notNull(), // 92-char positional definition
    revisionId: uuid("revision_id").references(() => modelRevisions.id),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_label_templates_revision_id").on(table.revisionId),
  ]
);

// ─── Label Bindings ─────────────────────────────────────

export const labelBindings = pgTable(
  "label_bindings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    modelRevisionId: uuid("model_revision_id")
      .notNull()
      .references(() => modelRevisions.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => variants.id, {
      onDelete: "set null",
    }),
    unitType: varchar("unit_type", { length: 100 }).notNull(),
    processPoint: varchar("process_point", { length: 100 }).notNull(),
    labelTemplateId: uuid("label_template_id")
      .notNull()
      .references(() => labelTemplates.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Bible §04: unique(model_revision_id, variant_id, unit_type, process_point)
    uniqueIndex("uq_label_bindings_key").on(
      table.modelRevisionId,
      table.variantId,
      table.unitType,
      table.processPoint
    ),
  ]
);

// ─── Labels ─────────────────────────────────────────────

export const labels = pgTable(
  "labels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id),
    labelTemplateId: uuid("label_template_id")
      .notNull()
      .references(() => labelTemplates.id),
    serialNumber: integer("serial_number").notNull(),
    labelData: varchar("label_data", { length: 100 }).notNull(), // 92-char payload
    shiftDay: date("shift_day").notNull(),
    lineCode: varchar("line_code", { length: 50 }).notNull(),
    partNumber: varchar("part_number", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_labels_unit_id").on(table.unitId),
    index("idx_labels_shift_day").on(table.shiftDay),
  ]
);

// ─── Serial Counters ────────────────────────────────────
// PK: (part_number, shift_day, line_code)
// Bible §10: serial scope is (part_number + shift_day + line_code), range 0001–9999

export const serialCounters = pgTable(
  "serial_counters",
  {
    partNumber: varchar("part_number", { length: 100 }).notNull(),
    shiftDay: date("shift_day").notNull(),
    lineCode: varchar("line_code", { length: 50 }).notNull(),
    lastSerial: integer("last_serial").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.partNumber, table.shiftDay, table.lineCode] }),
  ]
);
