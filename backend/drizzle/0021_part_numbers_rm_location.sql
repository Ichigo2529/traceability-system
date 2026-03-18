-- Add rm_location to part_numbers (required by schema; was missing from 0005)
ALTER TABLE "part_numbers"
ADD COLUMN IF NOT EXISTS "rm_location" varchar(50);
