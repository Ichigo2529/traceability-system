-- Migration: 0013_genealogy
-- Creates the genealogy tracking tables for consumption ledger.
-- Idempotent: uses IF NOT EXISTS / DO $$ blocks.

-- ─── Enums ──────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "set_run_status" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'HOLD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add HOLD value if enum exists but doesn't have it
DO $$ BEGIN
  ALTER TYPE "set_run_status" ADD VALUE IF NOT EXISTS 'HOLD';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "consumption_source_type" AS ENUM ('SUPPLIER_PACK', 'BAG100', 'UNIT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── set_runs ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "set_runs" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "set_code"            varchar(100) NOT NULL,
  "model_revision_id"   uuid,
  "variant_id"          uuid,
  "assy_unit_id"        uuid REFERENCES "units"("id"),
  "status"              "set_run_status" NOT NULL DEFAULT 'ACTIVE',
  "started_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "ended_at"            timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_set_runs_set_code"
  ON "set_runs" ("set_code");

CREATE INDEX IF NOT EXISTS "idx_set_runs_status"
  ON "set_runs" ("status");

CREATE INDEX IF NOT EXISTS "idx_set_runs_assy_unit_id"
  ON "set_runs" ("assy_unit_id");

-- ─── containers ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "containers" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "set_run_id"      uuid NOT NULL REFERENCES "set_runs"("id"),
  "container_type"  varchar(100) NOT NULL,
  "unit_id"         uuid REFERENCES "units"("id"),
  "created_at"      timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_containers_set_run_id"
  ON "containers" ("set_run_id");

CREATE INDEX IF NOT EXISTS "idx_containers_unit_id"
  ON "containers" ("unit_id");

-- ─── bag100 ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "bag100" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplier_pack_id"  uuid REFERENCES "supplier_packs"("id"),
  "part_number"       varchar(120) NOT NULL,
  "qty_initial"       integer NOT NULL,
  "lot_ref"           varchar(200),
  "created_at"        timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_bag100_supplier_pack_id"
  ON "bag100" ("supplier_pack_id");

CREATE INDEX IF NOT EXISTS "idx_bag100_part_number"
  ON "bag100" ("part_number");

-- ─── consumption ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "consumption" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "set_run_id"        uuid NOT NULL REFERENCES "set_runs"("id"),
  "component_type_id" uuid REFERENCES "component_types"("id"),
  "qty"               integer NOT NULL,
  "source_type"       "consumption_source_type" NOT NULL,
  "source_uid"        uuid NOT NULL,
  "step_code"         varchar(100) NOT NULL,
  "machine_id"        uuid REFERENCES "machines"("id"),
  "idempotency_key"   varchar(255),
  "consumed_at"       timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_consumption_set_run_id"
  ON "consumption" ("set_run_id");

CREATE INDEX IF NOT EXISTS "idx_consumption_source_uid"
  ON "consumption" ("source_uid");

CREATE INDEX IF NOT EXISTS "idx_consumption_source_type_uid"
  ON "consumption" ("source_type", "source_uid");

CREATE INDEX IF NOT EXISTS "idx_consumption_step_code"
  ON "consumption" ("step_code");

-- Partial unique index for idempotency (only non-null keys)
CREATE UNIQUE INDEX IF NOT EXISTS "uq_consumption_idempotency_key"
  ON "consumption" ("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
