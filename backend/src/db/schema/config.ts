import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const revisionStatusEnum = pgEnum("revision_status", [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
]);

export const models = pgTable("models", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  partNumber: varchar("part_number", { length: 120 }),
  packSize: integer("pack_size").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const modelRevisions = pgTable(
  "model_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    revisionCode: varchar("revision_code", { length: 50 }).notNull(),
    status: revisionStatusEnum("status").default("DRAFT").notNull(),
    basePartNumber: varchar("base_part_number", { length: 100 }),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_model_revisions_model_id").on(table.modelId),
    uniqueIndex("uq_model_revisions_active_per_model")
      .on(table.modelId)
      .where(sql`${table.status} = 'ACTIVE'`),
  ]
);

export const variants = pgTable(
  "variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => modelRevisions.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 100 }).notNull(),
    description: text("description"),
    mappedCodes: jsonb("mapped_codes").$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_variants_revision_id").on(table.revisionId)]
);

export const componentTypes = pgTable(
  "component_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 100 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("uq_component_types_code").on(table.code),
    index("idx_component_types_active").on(table.isActive),
  ]
);

export const partNumbers = pgTable(
  "part_numbers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partNumber: varchar("part_number", { length: 120 }).notNull(),
    componentTypeId: uuid("component_type_id").references(() => componentTypes.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    defaultPackSize: integer("default_pack_size"),
    rmLocation: varchar("rm_location", { length: 50 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("uq_part_numbers_part_number").on(table.partNumber),
    index("idx_part_numbers_component_type_id").on(table.componentTypeId),
    index("idx_part_numbers_active").on(table.isActive),
  ]
);

export const bom = pgTable(
  "bom",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => modelRevisions.id, { onDelete: "cascade" }),
    componentName: varchar("component_name", { length: 200 }),
    componentType: varchar("component_type", { length: 100 }).notNull(),
    componentPartNumber: varchar("component_part_number", { length: 120 }),
    supplierName: varchar("supplier_name", { length: 200 }),
    supplierPartNumber: varchar("supplier_part_number", { length: 120 }),
    supplierPackSize: integer("supplier_pack_size"),
    pack2dFormat: text("pack_2d_format"),
    qtyPerBatch: integer("qty_per_batch").notNull(),
    unitType: varchar("unit_type", { length: 100 }).notNull(),
    variantId: uuid("variant_id").references(() => variants.id, {
      onDelete: "set null",
    }),
    isOptional: boolean("is_optional").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_bom_revision_id").on(table.revisionId)]
);

export const routing = pgTable(
  "routing",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => modelRevisions.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_routing_revision_id").on(table.revisionId)]
);

export const routingSteps = pgTable(
  "routing_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    routingId: uuid("routing_id")
      .notNull()
      .references(() => routing.id, { onDelete: "cascade" }),
    stepCode: varchar("step_code", { length: 100 }).notNull(),
    sequence: integer("sequence").notNull(),
    componentType: varchar("component_type", { length: 100 }),
    consumesQty: integer("consumes_qty"),
    variantOnly: uuid("variant_only").references(() => variants.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_routing_steps_routing_id").on(table.routingId)]
);

export const masterRoutingSteps = pgTable(
  "master_routing_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stepCode: varchar("step_code", { length: 100 }).notNull().unique(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_master_routing_steps_active").on(table.isActive),
  ]
);