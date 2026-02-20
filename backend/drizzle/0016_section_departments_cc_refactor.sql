-- Migration 0016: domain model correction
-- cost_centers get section_id + is_default (replacing section_cost_centers mapping)
-- departments get section_id
-- material_requests get request_department_name
-- user_departments table for per-user department assignment

--> statement-breakpoint
ALTER TABLE "cost_centers"
  ADD COLUMN IF NOT EXISTS "section_id" uuid REFERENCES "sections"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cost_centers_section_id" ON "cost_centers" ("section_id");

--> statement-breakpoint
-- Backfill section_id and is_default from the old mapping table (pick the default mapping per CC; if CC appears in multiple sections, pick the one flagged is_default; otherwise first)
UPDATE "cost_centers" cc
SET
  section_id = sub.section_id,
  is_default = sub.is_default
FROM (
  SELECT DISTINCT ON (cost_center_id)
    cost_center_id,
    section_id,
    is_default
  FROM "section_cost_centers"
  ORDER BY cost_center_id, is_default DESC
) sub
WHERE cc.id = sub.cost_center_id AND cc.section_id IS NULL;

--> statement-breakpoint
-- One default cost center per section (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS "uq_cost_centers_section_default"
  ON "cost_centers" ("section_id")
  WHERE "is_default" = true;

--> statement-breakpoint
ALTER TABLE "departments"
  ADD COLUMN IF NOT EXISTS "section_id" uuid REFERENCES "sections"("id") ON DELETE SET NULL;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_departments_section_id" ON "departments" ("section_id");

--> statement-breakpoint
ALTER TABLE "material_requests"
  ADD COLUMN IF NOT EXISTS "request_department_name" text;

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_departments" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "department_id" uuid NOT NULL REFERENCES "departments"("id") ON DELETE CASCADE
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_departments_department_id" ON "user_departments" ("department_id");
