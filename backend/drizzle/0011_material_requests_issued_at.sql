ALTER TABLE material_requests
ADD COLUMN IF NOT EXISTS issued_at timestamptz;
