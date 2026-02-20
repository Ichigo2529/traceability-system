-- 0014: Inventory receiving – schema extensions
-- Extend inventory_do with description, gr_number, reject_qty
ALTER TABLE "inventory_do" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "inventory_do" ADD COLUMN IF NOT EXISTS "gr_number" varchar(120);
ALTER TABLE "inventory_do" ADD COLUMN IF NOT EXISTS "reject_qty" integer NOT NULL DEFAULT 0;

-- Index on gr_number
CREATE INDEX IF NOT EXISTS "idx_inventory_do_gr_number" ON "inventory_do" ("gr_number");

-- Composite unique index (handles nullable columns via COALESCE)
CREATE UNIQUE INDEX IF NOT EXISTS "uq_inventory_do_natural_key"
  ON "inventory_do" (
    "do_number",
    COALESCE("part_number", ''),
    COALESCE("lot_number", ''),
    COALESCE("gr_number", '')
  );

-- Extend supplier_part_profiles with component_name, vendor_detail, qr_sample
ALTER TABLE "supplier_part_profiles" ADD COLUMN IF NOT EXISTS "component_name" text;
ALTER TABLE "supplier_part_profiles" ADD COLUMN IF NOT EXISTS "vendor_detail" jsonb;
ALTER TABLE "supplier_part_profiles" ADD COLUMN IF NOT EXISTS "qr_sample" text;
