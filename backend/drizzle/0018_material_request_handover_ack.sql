ALTER TABLE "material_requests"
  ADD COLUMN IF NOT EXISTS "dispatched_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "dispatched_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "production_ack_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "production_ack_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "forklift_ack_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "forklift_ack_at" timestamptz;
