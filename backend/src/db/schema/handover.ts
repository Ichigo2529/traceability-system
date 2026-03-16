import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  date,
  text,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { devices } from "./devices";
import { materialRequests, materialRequestItemIssues } from "./material-requests";
import { supplierPacks } from "./inventory";

// ─── Handover Batch ─────────────────────────────────────
// Created automatically when Store confirms material issue.
// Tracks the physical handover from Store → Forklift.

export const handoverBatchStatusEnum = pgEnum("handover_batch_status", [
  "PENDING",
  "IN_TRANSIT",
  "RECEIVED",
  "RECEIVED_PARTIAL",
  "CANCELLED",
]);

export const handoverBatches = pgTable(
  "handover_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchNo: varchar("batch_no", { length: 80 }).notNull(),
    materialRequestId: uuid("material_request_id")
      .notNull()
      .references(() => materialRequests.id),
    issuedByUserId: uuid("issued_by_user_id")
      .notNull()
      .references(() => users.id),
    assignedForkliftUserId: uuid("assigned_forklift_user_id").references(() => users.id),
    status: handoverBatchStatusEnum("status").notNull().default("PENDING"),
    pickupAt: timestamp("pickup_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    expectedItemCount: integer("expected_item_count").notNull().default(0),
    scannedItemCount: integer("scanned_item_count").notNull().default(0),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_handover_batch_no").on(table.batchNo),
    index("idx_handover_batch_mr").on(table.materialRequestId),
    index("idx_handover_batch_status").on(table.status),
    index("idx_handover_batch_forklift").on(table.assignedForkliftUserId),
  ]
);

// ─── Handover Batch Items ───────────────────────────────
// Maps each issue line to this batch so forklift scanning
// can validate per-item progress.

export const handoverBatchItems = pgTable(
  "handover_batch_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    handoverBatchId: uuid("handover_batch_id")
      .notNull()
      .references(() => handoverBatches.id, { onDelete: "cascade" }),
    materialRequestItemIssueId: uuid("material_request_item_issue_id")
      .notNull()
      .references(() => materialRequestItemIssues.id),
    partNumber: varchar("part_number", { length: 120 }).notNull(),
    doNumber: varchar("do_number", { length: 120 }).notNull(),
    expectedPacks: integer("expected_packs").notNull(),
    expectedQty: integer("expected_qty").notNull(),
    scannedPacks: integer("scanned_packs").notNull().default(0),
    scannedQty: integer("scanned_qty").notNull().default(0),
    status: varchar("status", { length: 30 }).notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_hbi_issue").on(table.handoverBatchId, table.materialRequestItemIssueId),
    index("idx_hbi_batch").on(table.handoverBatchId),
    index("idx_hbi_part").on(table.partNumber),
  ]
);

// ─── Scan Session ───────────────────────────────────────
// One per forklift operator intake session against a batch.
// Only one OPEN session per batch at a time (partial unique index).

export const scanSessionStatusEnum = pgEnum("scan_session_status", ["OPEN", "COMPLETED", "ABANDONED"]);

export const scanSessions = pgTable(
  "scan_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    handoverBatchId: uuid("handover_batch_id")
      .notNull()
      .references(() => handoverBatches.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    deviceId: uuid("device_id").references(() => devices.id),
    stationId: uuid("station_id"),
    status: scanSessionStatusEnum("status").notNull().default("OPEN"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    totalScans: integer("total_scans").notNull().default(0),
    matchedScans: integer("matched_scans").notNull().default(0),
    errorScans: integer("error_scans").notNull().default(0),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Only one OPEN session per batch at a time
    // Note: drizzle-orm doesn't support WHERE on uniqueIndex natively.
    // The partial index is created via custom SQL in the migration.
    index("idx_scan_session_user").on(table.userId),
    index("idx_scan_session_batch").on(table.handoverBatchId),
    index("idx_scan_session_status").on(table.status),
  ]
);

// ─── Scan Event (IMMUTABLE) ─────────────────────────────
// Every barcode scan — success or failure — is recorded here.
// No UPDATE or DELETE is ever performed on this table.

export const scanEventResultEnum = pgEnum("scan_event_result", [
  "MATCHED",
  "DUPLICATE",
  "NOT_FOUND",
  "EXPIRED",
  "PARSE_ERROR",
  "MISMATCH",
]);

export const scanEvents = pgTable(
  "scan_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: varchar("idempotency_key", { length: 80 }).notNull(),
    scanSessionId: uuid("scan_session_id")
      .notNull()
      .references(() => scanSessions.id),
    handoverBatchId: uuid("handover_batch_id")
      .notNull()
      .references(() => handoverBatches.id),
    barcodeRaw: text("barcode_raw").notNull(),
    parsedSupplierCode: varchar("parsed_supplier_code", { length: 80 }),
    parsedPartNumber: varchar("parsed_part_number", { length: 120 }),
    parsedLotNumber: varchar("parsed_lot_number", { length: 120 }),
    parsedQty: integer("parsed_qty"),
    parsedUom: varchar("parsed_uom", { length: 30 }),
    parsedExpiryDate: date("parsed_expiry_date"),
    parsedProductionDate: date("parsed_production_date"),
    parsedData: jsonb("parsed_data").$type<Record<string, unknown>>(),
    packCount: integer("pack_count").notNull().default(1),
    result: scanEventResultEnum("result").notNull(),
    resultDetail: text("result_detail"),
    matchedBatchItemId: uuid("matched_batch_item_id").references(() => handoverBatchItems.id),
    matchedSupplierPackId: uuid("matched_supplier_pack_id").references(() => supplierPacks.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    deviceId: uuid("device_id").references(() => devices.id),
    scannedAtDevice: timestamp("scanned_at_device", { withTimezone: true }).notNull(),
    receivedAtServer: timestamp("received_at_server", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_scan_event_idempotency").on(table.idempotencyKey),
    // Prevent double-MATCH of same raw barcode within same batch
    // Note: partial index (WHERE result='MATCHED') created via custom SQL in migration
    index("idx_scan_event_session").on(table.scanSessionId),
    index("idx_scan_event_batch").on(table.handoverBatchId),
    index("idx_scan_event_user").on(table.userId),
    index("idx_scan_event_result").on(table.result),
  ]
);
