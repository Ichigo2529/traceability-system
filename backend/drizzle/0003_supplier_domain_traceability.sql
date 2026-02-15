CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(200) NOT NULL,
  "code" varchar(80) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_suppliers_code" ON "suppliers" ("code");
CREATE INDEX IF NOT EXISTS "idx_suppliers_active" ON "suppliers" ("is_active");

ALTER TABLE "inventory_do"
ADD COLUMN IF NOT EXISTS "supplier_id" uuid,
ADD COLUMN IF NOT EXISTS "part_number" varchar(120),
ADD COLUMN IF NOT EXISTS "total_qty" integer,
ADD COLUMN IF NOT EXISTS "received_date" date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inventory_do_supplier_id_suppliers_id_fk'
  ) THEN
    ALTER TABLE "inventory_do"
      ADD CONSTRAINT "inventory_do_supplier_id_suppliers_id_fk"
      FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_inventory_do_supplier_id" ON "inventory_do" ("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_do_part_number" ON "inventory_do" ("part_number");

CREATE TABLE IF NOT EXISTS "supplier_packs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "unit_id" uuid NOT NULL,
  "part_number" varchar(120) NOT NULL,
  "supplier_id" uuid NOT NULL,
  "do_id" uuid,
  "supplier_lot" varchar(120),
  "pack_barcode_raw" text NOT NULL,
  "pack_qty_total" integer NOT NULL,
  "pack_qty_remaining" integer NOT NULL,
  "production_date" date,
  "parsed_supplier_code" varchar(80),
  "parsed_part_number" varchar(120),
  "parsed_lot_number" varchar(120),
  "parsed_pack_qty" integer,
  "parsed_data" jsonb,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'supplier_packs_unit_id_units_id_fk'
  ) THEN
    ALTER TABLE "supplier_packs"
      ADD CONSTRAINT "supplier_packs_unit_id_units_id_fk"
      FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'supplier_packs_supplier_id_suppliers_id_fk'
  ) THEN
    ALTER TABLE "supplier_packs"
      ADD CONSTRAINT "supplier_packs_supplier_id_suppliers_id_fk"
      FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'supplier_packs_do_id_inventory_do_id_fk'
  ) THEN
    ALTER TABLE "supplier_packs"
      ADD CONSTRAINT "supplier_packs_do_id_inventory_do_id_fk"
      FOREIGN KEY ("do_id") REFERENCES "public"."inventory_do"("id");
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_supplier_packs_pack_barcode_raw" ON "supplier_packs" ("pack_barcode_raw");
CREATE INDEX IF NOT EXISTS "idx_supplier_packs_part_number" ON "supplier_packs" ("part_number");
CREATE INDEX IF NOT EXISTS "idx_supplier_packs_supplier_id" ON "supplier_packs" ("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_packs_do_id" ON "supplier_packs" ("do_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_packs_unit_id" ON "supplier_packs" ("unit_id");

ALTER TABLE "component_2d_scans"
ADD COLUMN IF NOT EXISTS "supplier_pack_id" uuid,
ADD COLUMN IF NOT EXISTS "parsed_data" jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'component_2d_scans_supplier_pack_id_supplier_packs_id_fk'
  ) THEN
    ALTER TABLE "component_2d_scans"
      ADD CONSTRAINT "component_2d_scans_supplier_pack_id_supplier_packs_id_fk"
      FOREIGN KEY ("supplier_pack_id") REFERENCES "public"."supplier_packs"("id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_component_2d_scans_supplier_pack_id" ON "component_2d_scans" ("supplier_pack_id");

