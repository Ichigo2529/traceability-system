import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { units } from "./production";
import { supplierPacks } from "./inventory";
import { componentTypes } from "./config";
import { machines } from "./devices";

// ─── Enums ──────────────────────────────────────────────

export const setRunStatusEnum = pgEnum("set_run_status", [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "HOLD",
]);

export const sourceTypeEnum = pgEnum("consumption_source_type", [
  "SUPPLIER_PACK",
  "BAG100",
  "UNIT",
]);

// ─── Set Run ────────────────────────────────────────────
// A production run/batch (e.g. one bonding cycle).

export const setRuns = pgTable(
  "set_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    setCode: varchar("set_code", { length: 100 }).notNull(),
    modelRevisionId: uuid("model_revision_id"),
    variantId: uuid("variant_id"),
    assyUnitId: uuid("assy_unit_id").references(() => units.id),
    status: setRunStatusEnum("status").default("ACTIVE").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_set_runs_set_code").on(table.setCode),
    index("idx_set_runs_status").on(table.status),
    index("idx_set_runs_assy_unit_id").on(table.assyUnitId),
  ]
);

// ─── Container ──────────────────────────────────────────
// Logical container locked to a set_run (plate, jig, etc.)

export const containers = pgTable(
  "containers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    setRunId: uuid("set_run_id")
      .notNull()
      .references(() => setRuns.id),
    containerType: varchar("container_type", { length: 100 }).notNull(),
    unitId: uuid("unit_id").references(() => units.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_containers_set_run_id").on(table.setRunId),
    index("idx_containers_unit_id").on(table.unitId),
  ]
);

// ─── Bag100 ─────────────────────────────────────────────
// Bulk material bag/pack reference for derived inventory.

export const bag100 = pgTable(
  "bag100",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    supplierPackId: uuid("supplier_pack_id").references(
      () => supplierPacks.id
    ),
    partNumber: varchar("part_number", { length: 120 }).notNull(),
    qtyInitial: integer("qty_initial").notNull(),
    lotRef: varchar("lot_ref", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_bag100_supplier_pack_id").on(table.supplierPackId),
    index("idx_bag100_part_number").on(table.partNumber),
  ]
);

// ─── Consumption Ledger ─────────────────────────────────
// Immutable append-only ledger. Every material usage is recorded here.

export const consumption = pgTable(
  "consumption",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    setRunId: uuid("set_run_id")
      .notNull()
      .references(() => setRuns.id),
    componentTypeId: uuid("component_type_id").references(
      () => componentTypes.id
    ),
    qty: integer("qty").notNull(),
    sourceType: sourceTypeEnum("source_type").notNull(),
    sourceUid: uuid("source_uid").notNull(),
    stepCode: varchar("step_code", { length: 100 }).notNull(),
    machineId: uuid("machine_id").references(() => machines.id),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    consumedAt: timestamp("consumed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_consumption_set_run_id").on(table.setRunId),
    index("idx_consumption_source_uid").on(table.sourceUid),
    index("idx_consumption_source_type_uid").on(
      table.sourceType,
      table.sourceUid
    ),
    index("idx_consumption_step_code").on(table.stepCode),
    uniqueIndex("uq_consumption_idempotency_key")
      .on(table.idempotencyKey)
      .where(sql`idempotency_key IS NOT NULL`),
  ]
);
