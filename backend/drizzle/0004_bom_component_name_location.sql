ALTER TABLE "bom"
ADD COLUMN IF NOT EXISTS "component_name" varchar(200),
ADD COLUMN IF NOT EXISTS "rm_location" varchar(50);
