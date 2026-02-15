CREATE TABLE IF NOT EXISTS "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_departments_code" ON "departments" USING btree ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_departments_name" ON "departments" USING btree ("name");
CREATE INDEX IF NOT EXISTS "idx_departments_active" ON "departments" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "idx_departments_sort_order" ON "departments" USING btree ("sort_order");

INSERT INTO "departments" ("code", "name", "sort_order")
VALUES
  ('ADMINISTRATION_OFFICER', 'administration officer', 10),
  ('ENGINEERING', 'engineering', 20),
  ('FACILITY', 'facility', 30),
  ('FINANCE', 'finance', 40),
  ('HRA', 'hra', 50),
  ('MANAGEMENT', 'management', 60),
  ('MATERIAL', 'material', 70),
  ('MIS', 'mis', 80),
  ('MSL', 'msl', 90),
  ('NEW_PROGRAM', 'new program', 100),
  ('PRODUCTION', 'production', 110),
  ('QUALITY_ASSURANCE', 'quality assurance', 120),
  ('QUALITY_ASSURANCE_IQA_SQE', 'quality assurance-iqa/sqe', 130)
ON CONFLICT ("code") DO NOTHING;
