-- Add currency column with ETB default, keeping existing rows intact
ALTER TABLE "unit_listings" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'ETB';

-- Backfill null currency values to ETB for consistency
UPDATE "unit_listings" SET "currency" = 'ETB' WHERE "currency" IS NULL;
