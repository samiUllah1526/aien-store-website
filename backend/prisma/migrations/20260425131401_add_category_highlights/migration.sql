-- AlterTable: add highlights array column to categories
-- Pure additive change. Non-blocking on PostgreSQL 11+ (default stored as catalog
-- constant, no table rewrite). Existing rows read back '{}' (empty array).
ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
