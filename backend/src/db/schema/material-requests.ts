import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  date,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { models } from "./config";
import { inventoryDo, suppliers } from "./inventory";
import { sections, costCenters } from "./organization";

export const materialRequestStatusEnum = pgEnum("material_request_status", [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "ISSUED",
  "CANCELLED",
]);

export const materialRequests = pgTable(
  "material_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestNo: varchar("request_no", { length: 80 }).notNull(),
    dmiNo: varchar("dmi_no", { length: 80 }),
    requestDate: date("request_date").notNull(),
    modelId: uuid("model_id").references(() => models.id, { onDelete: "set null" }),
    section: varchar("section", { length: 120 }),
    costCenter: varchar("cost_center", { length: 120 }),
    requestSectionId: uuid("request_section_id").references(() => sections.id, { onDelete: "set null" }),
    requestCostCenterId: uuid("request_cost_center_id").references(() => costCenters.id, { onDelete: "set null" }),
    /** Snapshot of the requesting user's department name at time of request (added in 0016) */
    requestDepartmentName: text("request_department_name"),
    processName: varchar("process_name", { length: 120 }),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, { onDelete: "set null" }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    dispatchedByUserId: uuid("dispatched_by_user_id").references(() => users.id, { onDelete: "set null" }),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    issuedByUserId: uuid("issued_by_user_id").references(() => users.id, { onDelete: "set null" }),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    receivedByUserId: uuid("received_by_user_id").references(() => users.id, { onDelete: "set null" }),
    productionAcknowledgedByUserId: uuid("production_ack_by_user_id").references(() => users.id, { onDelete: "set null" }),
    productionAcknowledgedAt: timestamp("production_ack_at", { withTimezone: true }),
    forkliftAcknowledgedByUserId: uuid("forklift_ack_by_user_id").references(() => users.id, { onDelete: "set null" }),
    forkliftAcknowledgedAt: timestamp("forklift_ack_at", { withTimezone: true }),
    status: materialRequestStatusEnum("status").notNull().default("REQUESTED"),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_material_requests_request_no").on(table.requestNo),
    index("idx_material_requests_status").on(table.status),
    index("idx_material_requests_request_date").on(table.requestDate),
    index("idx_material_requests_requested_by").on(table.requestedByUserId),
    index("idx_material_requests_model_id").on(table.modelId),
  ]
);

export const materialRequestItems = pgTable(
  "material_request_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    materialRequestId: uuid("material_request_id")
      .notNull()
      .references(() => materialRequests.id, { onDelete: "cascade" }),
    itemNo: integer("item_no").notNull(),
    partNumber: varchar("part_number", { length: 120 }).notNull(),
    description: varchar("description", { length: 300 }),
    requestedQty: integer("requested_qty"),
    issuedQty: integer("issued_qty"),
    uom: varchar("uom", { length: 30 }),
    doNumber: varchar("do_number", { length: 120 }),
    lotNumber: varchar("lot_number", { length: 120 }),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_material_request_items_line").on(table.materialRequestId, table.itemNo),
    index("idx_material_request_items_request_id").on(table.materialRequestId),
    index("idx_material_request_items_part_number").on(table.partNumber),
  ]
);

export const materialRequestItemIssues = pgTable(
  "material_request_item_issues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    materialRequestId: uuid("material_request_id")
      .notNull()
      .references(() => materialRequests.id, { onDelete: "cascade" }),
    materialRequestItemId: uuid("material_request_item_id")
      .notNull()
      .references(() => materialRequestItems.id, { onDelete: "cascade" }),
    partNumber: varchar("part_number", { length: 120 }).notNull(),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    doId: uuid("do_id").references(() => inventoryDo.id, { onDelete: "set null" }),
    doNumber: varchar("do_number", { length: 120 }).notNull(),
    supplierPackSize: integer("supplier_pack_size").notNull(),
    issuedPacks: integer("issued_packs").notNull(),
    issuedQty: integer("issued_qty").notNull(),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_mri_issues_request_id").on(table.materialRequestId),
    index("idx_mri_issues_item_id").on(table.materialRequestItemId),
    index("idx_mri_issues_part_number").on(table.partNumber),
    index("idx_mri_issues_do_number").on(table.doNumber),
  ]
);
