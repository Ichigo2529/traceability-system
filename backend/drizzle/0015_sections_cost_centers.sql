-- Migration 0015: Sections & Cost Centers
-- Adds cost_centers, sections, section_cost_centers, user_sections tables
-- Adds request_section_id, request_cost_center_id to material_requests

-- 1) cost_centers
CREATE TABLE IF NOT EXISTS "cost_centers" (
  "id"          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "group_code"  varchar(10)  NOT NULL,
  "cost_code"   varchar(32)  NOT NULL,
  "short_text"  varchar(255) NOT NULL,
  "is_active"   boolean      NOT NULL DEFAULT true,
  "created_by"  uuid,
  "created_at"  timestamptz  NOT NULL DEFAULT now(),
  "updated_at"  timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_cost_centers_cost_code"
  ON "cost_centers" ("cost_code");
CREATE INDEX IF NOT EXISTS "idx_cost_centers_group_code"
  ON "cost_centers" ("group_code");
CREATE INDEX IF NOT EXISTS "idx_cost_centers_active"
  ON "cost_centers" ("is_active");

-- 2) sections
CREATE TABLE IF NOT EXISTS "sections" (
  "id"            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "section_code"  varchar(50)  NOT NULL,
  "section_name"  varchar(255) NOT NULL,
  "is_active"     boolean      NOT NULL DEFAULT true,
  "created_at"    timestamptz  NOT NULL DEFAULT now(),
  "updated_at"    timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_sections_section_code"
  ON "sections" ("section_code");
CREATE INDEX IF NOT EXISTS "idx_sections_active"
  ON "sections" ("is_active");

-- 3) section_cost_centers (mapping with default flag)
CREATE TABLE IF NOT EXISTS "section_cost_centers" (
  "id"              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "section_id"      uuid NOT NULL REFERENCES "sections"("id") ON DELETE CASCADE,
  "cost_center_id"  uuid NOT NULL REFERENCES "cost_centers"("id") ON DELETE CASCADE,
  "is_default"      boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_section_cost_centers_pair"
  ON "section_cost_centers" ("section_id", "cost_center_id");
CREATE INDEX IF NOT EXISTS "idx_section_cost_centers_section_id"
  ON "section_cost_centers" ("section_id");
CREATE INDEX IF NOT EXISTS "idx_section_cost_centers_cost_center_id"
  ON "section_cost_centers" ("cost_center_id");

-- Partial unique index: enforce at most one default per section
CREATE UNIQUE INDEX IF NOT EXISTS "uq_section_cost_centers_default"
  ON "section_cost_centers" ("section_id") WHERE "is_default" = true;

-- 4) user_sections (one section per user)
CREATE TABLE IF NOT EXISTS "user_sections" (
  "user_id"    uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "section_id" uuid NOT NULL REFERENCES "sections"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_user_sections_section_id"
  ON "user_sections" ("section_id");

-- 5) Extend material_requests
ALTER TABLE "material_requests"
  ADD COLUMN IF NOT EXISTS "request_section_id" uuid REFERENCES "sections"("id") ON DELETE SET NULL;

ALTER TABLE "material_requests"
  ADD COLUMN IF NOT EXISTS "request_cost_center_id" uuid REFERENCES "cost_centers"("id") ON DELETE SET NULL;
