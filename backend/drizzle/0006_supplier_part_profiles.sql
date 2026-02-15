CREATE TABLE IF NOT EXISTS "supplier_part_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplier_id" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
  "part_number" varchar(120) NOT NULL,
  "supplier_part_number" varchar(120) NOT NULL DEFAULT '',
  "parser_key" varchar(80) NOT NULL DEFAULT 'GENERIC',
  "default_pack_qty" integer,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_supplier_part_profiles_unique"
ON "supplier_part_profiles" ("supplier_id", "part_number", "supplier_part_number");
CREATE INDEX IF NOT EXISTS "idx_supplier_part_profiles_supplier_id"
ON "supplier_part_profiles" ("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_supplier_part_profiles_part_number"
ON "supplier_part_profiles" ("part_number");
CREATE INDEX IF NOT EXISTS "idx_supplier_part_profiles_active"
ON "supplier_part_profiles" ("is_active");
