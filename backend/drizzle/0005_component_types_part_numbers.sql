CREATE TABLE IF NOT EXISTS "component_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" varchar(100) NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_component_types_code" ON "component_types" ("code");
CREATE INDEX IF NOT EXISTS "idx_component_types_active" ON "component_types" ("is_active");

CREATE TABLE IF NOT EXISTS "part_numbers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "part_number" varchar(120) NOT NULL,
  "component_type_id" uuid REFERENCES "component_types"("id") ON DELETE SET NULL,
  "description" text,
  "default_pack_size" integer,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_part_numbers_part_number" ON "part_numbers" ("part_number");
CREATE INDEX IF NOT EXISTS "idx_part_numbers_component_type_id" ON "part_numbers" ("component_type_id");
CREATE INDEX IF NOT EXISTS "idx_part_numbers_active" ON "part_numbers" ("is_active");
