import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
  boolean,
  date,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { units } from "./production";

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    code: varchar("code", { length: 80 }).notNull(),
    vendorId: varchar("vendor_id", { length: 10 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("uq_suppliers_code").on(table.code), index("idx_suppliers_active").on(table.isActive)]
);

export const inventoryDo = pgTable(
  "inventory_do",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    doNumber: varchar("do_number", { length: 100 }).notNull(),
    supplier: varchar("supplier", { length: 200 }),
    partNumber: varchar("part_number", { length: 120 }),
    lotNumber: varchar("lot_number", { length: 100 }),
    description: text("description"),
    grNumber: varchar("gr_number", { length: 120 }),
    materialCode: varchar("material_code", { length: 100 }).notNull(),
    totalQty: integer("total_qty"),
    qtyReceived: integer("qty_received").notNull(),
    qtyIssued: integer("qty_issued").notNull().default(0),
    rejectQty: integer("reject_qty").notNull().default(0),
    receivedDate: date("received_date"),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_inventory_do_supplier_id").on(table.supplierId),
    index("idx_inventory_do_do_number").on(table.doNumber),
    index("idx_inventory_do_material_code").on(table.materialCode),
    index("idx_inventory_do_part_number").on(table.partNumber),
    index("idx_inventory_do_gr_number").on(table.grNumber),
  ]
);

export const supplierPacks = pgTable(
  "supplier_packs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    partNumber: varchar("part_number", { length: 120 }).notNull(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    doId: uuid("do_id").references(() => inventoryDo.id),
    supplierLot: varchar("supplier_lot", { length: 120 }),
    packBarcodeRaw: text("pack_barcode_raw").notNull(),
    packQtyTotal: integer("pack_qty_total").notNull(),
    packQtyRemaining: integer("pack_qty_remaining").notNull(),
    productionDate: date("production_date"),
    parsedSupplierCode: varchar("parsed_supplier_code", { length: 80 }),
    parsedPartNumber: varchar("parsed_part_number", { length: 120 }),
    parsedLotNumber: varchar("parsed_lot_number", { length: 120 }),
    parsedPackQty: integer("parsed_pack_qty"),
    parsedData: jsonb("parsed_data").$type<Record<string, unknown>>(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_supplier_packs_pack_barcode_raw").on(table.packBarcodeRaw),
    index("idx_supplier_packs_part_number").on(table.partNumber),
    index("idx_supplier_packs_supplier_id").on(table.supplierId),
    index("idx_supplier_packs_do_id").on(table.doId),
    index("idx_supplier_packs_unit_id").on(table.unitId),
  ]
);

export const component2dScans = pgTable(
  "component_2d_scans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inventoryDoId: uuid("inventory_do_id").references(() => inventoryDo.id),
    supplierPackId: uuid("supplier_pack_id").references(() => supplierPacks.id),
    unitId: uuid("unit_id").references(() => units.id),
    scanData: text("scan_data").notNull(),
    parsedData: jsonb("parsed_data").$type<Record<string, unknown>>(),
    packCount: integer("pack_count").notNull().default(1),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_component_2d_scans_unit_id").on(table.unitId),
    index("idx_component_2d_scans_inventory_do_id").on(table.inventoryDoId),
    index("idx_component_2d_scans_supplier_pack_id").on(table.supplierPackId),
  ]
);

export const supplierPartProfiles = pgTable(
  "supplier_part_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    partNumber: varchar("part_number", { length: 120 }).notNull(),
    supplierPartNumber: varchar("supplier_part_number", { length: 120 }).notNull().default(""),
    componentName: text("component_name"),
    parserKey: varchar("parser_key", { length: 80 }).notNull().default("GENERIC"),
    defaultPackQty: integer("default_pack_qty"),
    vendorDetail: jsonb("vendor_detail").$type<Record<string, unknown>>(),
    qrSample: text("qr_sample"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_supplier_part_profiles_unique").on(table.supplierId, table.partNumber, table.supplierPartNumber),
    index("idx_supplier_part_profiles_supplier_id").on(table.supplierId),
    index("idx_supplier_part_profiles_part_number").on(table.partNumber),
    index("idx_supplier_part_profiles_active").on(table.isActive),
  ]
);
