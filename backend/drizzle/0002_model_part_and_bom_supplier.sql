ALTER TABLE "models"
ADD COLUMN IF NOT EXISTS "part_number" varchar(120);

ALTER TABLE "bom"
ADD COLUMN IF NOT EXISTS "component_part_number" varchar(120),
ADD COLUMN IF NOT EXISTS "supplier_name" varchar(200),
ADD COLUMN IF NOT EXISTS "supplier_part_number" varchar(120),
ADD COLUMN IF NOT EXISTS "supplier_pack_size" integer,
ADD COLUMN IF NOT EXISTS "pack_2d_format" text;

